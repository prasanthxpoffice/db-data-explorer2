using System.Collections.Generic;
using System.Data;
using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration["SqlConnectionString"]
    ?? Environment.GetEnvironmentVariable("SQL_CONNECTION_STRING")
    ?? "Server=(localdb)\\MSSQLLocalDB;Database=IAS;Trusted_Connection=True;TrustServerCertificate=True;";

builder.Services.AddSingleton(new DbOptions(connectionString));

var app = builder.Build();

#region Static frontend
var frontendRoot = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, ".."));
var indexFile = Path.Combine(frontendRoot, "index.html");
if (File.Exists(indexFile))
{
    var fileProvider = new PhysicalFileProvider(frontendRoot);
    var options = new FileServerOptions
    {
        FileProvider = fileProvider,
        EnableDefaultFiles = true
    };
    options.DefaultFilesOptions.DefaultFileNames.Clear();
    options.DefaultFilesOptions.DefaultFileNames.Add("index.html");
    app.UseFileServer(options);
    app.MapFallback(() => Results.File(indexFile, "text/html"));
}
#endregion

app.MapGet("/health", () => Results.Ok(new { status = "ok", utc = DateTimeOffset.UtcNow }));

app.MapGet("/views", async Task<IResult> (
    [FromQuery] string? lang,
    [FromServices] DbOptions options) =>
{
    var normalizedLang = NormalizeLang(lang);

    return await ExecuteStoredProcedure(
        options.ConnectionString,
        connection =>
        {
            var command = CreateStoredProcedure(connection, "[graphdb].[api_GetViews]");
            command.Parameters.Add(new SqlParameter("@Lang", SqlDbType.NVarChar, 2) { Value = normalizedLang });
            return command;
        });
});

app.MapPost("/node-types", async Task<IResult> (
    [FromBody] NodeTypesRequest? request,
    [FromServices] DbOptions options) =>
{
    if (!TryPrepareRequest(request, out var lang, out var tvp, out var error))
    {
        return error!;
    }

    return await ExecuteStoredProcedure(
        options.ConnectionString,
        connection =>
        {
            var command = CreateStoredProcedure(connection, "[graphdb].[api_GetNodeTypes]");
            command.Parameters.Add(new SqlParameter("@Lang", SqlDbType.NVarChar, 2) { Value = lang });
            command.Parameters.Add(tvp);
            return command;
        });
});

app.MapPost("/items", async Task<IResult> (
    [FromBody] ItemsRequest? request,
    [FromServices] DbOptions options) =>
{
    if (request is null)
    {
        return Results.BadRequest(new { message = "Request body is required." });
    }

    if (!TryPrepareRequest(request, out var lang, out var tvp, out var error))
    {
        return error!;
    }

    if (string.IsNullOrWhiteSpace(request.ColId))
    {
        return Results.BadRequest(new { message = "colId is required." });
    }

    var maxCount = NormalizeMaxNodes(request.MaxCount);

    return await ExecuteStoredProcedure(
        options.ConnectionString,
        connection =>
        {
            var command = CreateStoredProcedure(connection, "[graphdb].[api_GetItems]");
            command.Parameters.Add(new SqlParameter("@Lang", SqlDbType.NVarChar, 2) { Value = lang });
            command.Parameters.Add(tvp);
            command.Parameters.Add(new SqlParameter("@ColId", SqlDbType.NVarChar, 128) { Value = request.ColId });
            command.Parameters.Add(new SqlParameter("@MaxCount", SqlDbType.Int) { Value = maxCount });
            return command;
        });
});

app.MapPost("/expand", async Task<IResult> (
    [FromBody] ExpandRequest? request,
    [FromServices] DbOptions options) =>
{
    if (request is null)
    {
        return Results.BadRequest(new { message = "Request body is required." });
    }

    if (!TryPrepareRequest(request, out var lang, out var tvp, out var error))
    {
        return error!;
    }

    if (string.IsNullOrWhiteSpace(request.SourceColId))
    {
        return Results.BadRequest(new { message = "sourceColId is required." });
    }

    if (string.IsNullOrWhiteSpace(request.SourceId))
    {
        return Results.BadRequest(new { message = "sourceId is required." });
    }

    var maxNodes = NormalizeMaxNodes(request.MaxNodes);

    return await ExecuteStoredProcedure(
        options.ConnectionString,
        connection =>
        {
            var command = CreateStoredProcedure(connection, "[graphdb].[api_Expand]");
            command.Parameters.Add(new SqlParameter("@Lang", SqlDbType.NVarChar, 2) { Value = lang });
            command.Parameters.Add(tvp);
            command.Parameters.Add(new SqlParameter("@SourceColId", SqlDbType.NVarChar, 128) { Value = request.SourceColId });
            command.Parameters.Add(new SqlParameter("@SourceId", SqlDbType.NVarChar, 4000) { Value = request.SourceId });
            command.Parameters.Add(new SqlParameter("@FromDate", SqlDbType.Date) { Value = ToDate(request.FromDate) });
            command.Parameters.Add(new SqlParameter("@ToDate", SqlDbType.Date) { Value = ToDate(request.ToDate) });
            command.Parameters.Add(new SqlParameter("@MaxNodes", SqlDbType.Int) { Value = maxNodes });
            return command;
        });
});

app.Run();

static async Task<IResult> ExecuteStoredProcedure(
    string connectionString,
    Func<SqlConnection, SqlCommand> commandFactory)
{
    try
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();

        await using var command = commandFactory(connection);
        await using var reader = await command.ExecuteReaderAsync();

        var resultSets = new List<IReadOnlyList<Dictionary<string, object?>>>();
        do
        {
            var rows = new List<Dictionary<string, object?>>();
            while (await reader.ReadAsync())
            {
                var row = new Dictionary<string, object?>(reader.FieldCount, StringComparer.OrdinalIgnoreCase);
                for (var i = 0; i < reader.FieldCount; i++)
                {
                    row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                }

                rows.Add(row);
            }

            resultSets.Add(rows);
        }
        while (await reader.NextResultAsync());

        object payload = resultSets.Count == 1 ? resultSets[0] : resultSets;
        return Results.Ok(new { data = payload });
    }
    catch (SqlException ex)
    {
        return Results.Problem(
            title: "Database call failed",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
}

static SqlCommand CreateStoredProcedure(SqlConnection connection, string name)
{
    var command = connection.CreateCommand();
    command.CommandText = name;
    command.CommandType = CommandType.StoredProcedure;
    return command;
}

static bool TryPrepareRequest(
    GraphRequestBase? request,
    out string lang,
    out SqlParameter? viewIdsParameter,
    out IResult? error)
{
    if (request is null)
    {
        error = Results.BadRequest(new { message = "Request body is required." });
        lang = "en";
        viewIdsParameter = null;
        return false;
    }

    if (request.ViewIds is null || request.ViewIds.Count == 0)
    {
        error = Results.BadRequest(new { message = "At least one viewId must be provided." });
        lang = "en";
        viewIdsParameter = null;
        return false;
    }

    lang = NormalizeLang(request.Lang);
    viewIdsParameter = CreateIntListParameter("@ViewIds", request.ViewIds);
    error = null;
    return true;
}

static SqlParameter CreateIntListParameter(string name, IReadOnlyCollection<int> values)
{
    var table = new DataTable();
    table.Columns.Add("ViewID", typeof(int));

    foreach (var value in values)
    {
        table.Rows.Add(value);
    }

    return new SqlParameter(name, SqlDbType.Structured)
    {
        TypeName = "graphdb.IntList",
        Value = table
    };
}

static int NormalizeMaxNodes(int raw)
{
    const int max = 10_000;
    return Math.Clamp(raw <= 0 ? 1 : raw, 1, max);
}

static DateTime ToDate(DateOnly date) => date.ToDateTime(TimeOnly.MinValue);

static string NormalizeLang(string? lang)
{
    if (string.IsNullOrWhiteSpace(lang))
    {
        return "en";
    }

    var trimmed = lang.Trim().ToLowerInvariant();
    return trimmed is "ar" or "en" ? trimmed : "en";
}

sealed record DbOptions(string ConnectionString);

record GraphRequestBase(string Lang, IReadOnlyList<int> ViewIds);

record NodeTypesRequest(string Lang, IReadOnlyList<int> ViewIds) : GraphRequestBase(Lang, ViewIds);

record ItemsRequest(
    string Lang,
    IReadOnlyList<int> ViewIds,
    string ColId,
    int MaxCount) : GraphRequestBase(Lang, ViewIds);

record ExpandRequest(
    string Lang,
    IReadOnlyList<int> ViewIds,
    string SourceColId,
    string SourceId,
    DateOnly FromDate,
    DateOnly ToDate,
    int MaxNodes) : GraphRequestBase(Lang, ViewIds);
