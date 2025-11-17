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

app.MapPost("/node-legends", async Task<IResult> (
    [FromBody] LegendsRequest? request,
    [FromServices] DbOptions options) =>
{
    if (!TryPrepareRequest(request, out var lang, out var tvp, out var error))
    {
        return error!;
    }

    var onlyActive = request?.OnlyActive ?? true;

    return await ExecuteStoredProcedure(
        options.ConnectionString,
        connection =>
        {
            var command = CreateStoredProcedure(connection, "[graphdb].[api_GetNodeLegends]");
            command.Parameters.Add(new SqlParameter("@Lang", SqlDbType.NVarChar, 2) { Value = lang });
            command.Parameters.Add(tvp);
            command.Parameters.Add(new SqlParameter("@OnlyActive", SqlDbType.Bit) { Value = onlyActive });
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

app.MapGet("/master-nodes", async Task<IResult> (
    [FromQuery] string? lang,
    [FromQuery] string? userId,
    [FromServices] DbOptions options) =>
{
    return await ExecuteStoredProcedure(
        options.ConnectionString,
        connection => CreateStoredProcedure(connection, "[graphdb].[GetNodes]"));
});

app.MapPost("/master-nodes/update", async Task<IResult> (
    [FromBody] MasterNodeUpdateRequest? request,
    [FromServices] DbOptions options) =>
{
    if (request is null || string.IsNullOrWhiteSpace(request.Column_ID))
    {
        return Results.BadRequest(new { message = "Column_ID is required." });
    }

    return await ExecuteStoredProcedure(
        options.ConnectionString,
        connection =>
        {
            var command = CreateStoredProcedure(connection, "[graphdb].[UpdateNode]");
            command.Parameters.Add(new SqlParameter("@Column_ID", SqlDbType.NVarChar, 128) { Value = request.Column_ID });
            command.Parameters.Add(new SqlParameter("@ColumnEn", SqlDbType.NVarChar, 200) { Value = (object?)request.ColumnEn ?? System.DBNull.Value });
            command.Parameters.Add(new SqlParameter("@ColumnAr", SqlDbType.NVarChar, 200) { Value = (object?)request.ColumnAr ?? System.DBNull.Value });
            command.Parameters.Add(new SqlParameter("@IsActive", SqlDbType.Bit) { Value = request.IsActive.HasValue ? request.IsActive.Value : System.DBNull.Value });
            command.Parameters.Add(new SqlParameter("@ColumnColor", SqlDbType.NVarChar, 20) { Value = (object?)request.ColumnColor ?? System.DBNull.Value });
            return command;
        });
});

app.MapGet("/master-relations", async Task<IResult> (
    [FromQuery] string? lang,
    [FromServices] DbOptions options) =>
{
    var normalizedLang = NormalizeLang(lang);
    return await ExecuteStoredProcedure(
        options.ConnectionString,
        connection =>
        {
            var command = CreateStoredProcedure(connection, "[graphdb].[GetRelations]");
            command.Parameters.Add(new SqlParameter("@Lang", SqlDbType.NVarChar, 2) { Value = normalizedLang });
            return command;
        });
});

app.MapPost("/master-relations/save", async Task<IResult> (
    [FromBody] SaveRelationRequest? request,
    [FromServices] DbOptions options) =>
{
    if (request is null)
    {
        return Results.BadRequest(new { message = "Request body is required." });
    }

    if (string.IsNullOrWhiteSpace(request.Source_Column_ID) ||
        string.IsNullOrWhiteSpace(request.Search_Column_ID) ||
        string.IsNullOrWhiteSpace(request.Display_Column_ID))
    {
        return Results.BadRequest(new { message = "Source_Column_ID, Search_Column_ID and Display_Column_ID are required." });
    }

    var hasRelationColumn = !string.IsNullOrWhiteSpace(request.Relation_Column_ID);
    var hasRelationText = !string.IsNullOrWhiteSpace(request.RelationEn) && !string.IsNullOrWhiteSpace(request.RelationAr);

    if (!hasRelationColumn && !hasRelationText)
    {
        return Results.BadRequest(new { message = "Either Relation_Column_ID or (RelationEn and RelationAr) must be provided." });
    }

    if (hasRelationColumn && (request.RelationEn is not null || request.RelationAr is not null))
    {
        return Results.BadRequest(new { message = "RelationEn and RelationAr must be null when Relation_Column_ID is provided." });
    }

    return await ExecuteStoredProcedure(
        options.ConnectionString,
        connection =>
        {
            var command = CreateStoredProcedure(connection, "[graphdb].[SaveRelation]");
            command.Parameters.Add(new SqlParameter("@Source_Column_ID", SqlDbType.NVarChar, 128) { Value = request.Source_Column_ID });
            command.Parameters.Add(new SqlParameter("@Search_Column_ID", SqlDbType.NVarChar, 128) { Value = request.Search_Column_ID });
            command.Parameters.Add(new SqlParameter("@Display_Column_ID", SqlDbType.NVarChar, 128) { Value = request.Display_Column_ID });
            command.Parameters.Add(new SqlParameter("@Direction", SqlDbType.NChar, 10) { Value = (object?)request.Direction ?? System.DBNull.Value });
            command.Parameters.Add(new SqlParameter("@Relation_Column_ID", SqlDbType.NVarChar, 128) { Value = (object?)request.Relation_Column_ID ?? System.DBNull.Value });
            command.Parameters.Add(new SqlParameter("@RelationEn", SqlDbType.NVarChar, 128) { Value = (object?)request.RelationEn ?? System.DBNull.Value });
            command.Parameters.Add(new SqlParameter("@RelationAr", SqlDbType.NVarChar, 128) { Value = (object?)request.RelationAr ?? System.DBNull.Value });
            return command;
        });
});

app.MapPost("/master-relations/delete", async Task<IResult> (
    [FromBody] DeleteRelationRequest? request,
    [FromServices] DbOptions options) =>
{
    if (request is null || request.RelationID <= 0)
    {
        return Results.BadRequest(new { message = "RelationID is required." });
    }

    return await ExecuteStoredProcedure(
        options.ConnectionString,
        connection =>
        {
            var command = CreateStoredProcedure(connection, "[graphdb].[DeleteRelation]");
            command.Parameters.Add(new SqlParameter("@RelationID", SqlDbType.Int) { Value = request.RelationID });
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

record LegendsRequest(string Lang, IReadOnlyList<int> ViewIds, bool? OnlyActive = true) : GraphRequestBase(Lang, ViewIds);

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

record MasterNodeUpdateRequest(
    string Column_ID,
    string? ColumnEn,
    string? ColumnAr,
    bool? IsActive,
    string? ColumnColor,
    string? Lang,
    string? UserId);

record SaveRelationRequest(
    string Source_Column_ID,
    string Search_Column_ID,
    string Display_Column_ID,
    string? Direction,
    string? Relation_Column_ID,
    string? RelationEn,
    string? RelationAr);

record DeleteRelationRequest(int RelationID);
