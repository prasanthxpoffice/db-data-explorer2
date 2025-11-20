using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

var frontendRoot = builder.Configuration["frontendRoot"]
                  ?? builder.Configuration["FrontendRoot"]
                  ?? Environment.GetEnvironmentVariable("FRONTEND_ROOT")
                  ?? builder.Environment.ContentRootPath;

frontendRoot = Path.GetFullPath(frontendRoot);
if (!Directory.Exists(frontendRoot))
{
    throw new DirectoryNotFoundException($"Frontend directory '{frontendRoot}' does not exist.");
}

var fileProvider = new PhysicalFileProvider(frontendRoot);
var defaultDocument = builder.Configuration["defaultDocument"] ?? "index.html";
var defaultFilePath = Path.Combine(frontendRoot, defaultDocument);

var app = builder.Build();
var logger = app.Logger;

if (!File.Exists(defaultFilePath))
{
    logger.LogWarning(
        "Default document '{DefaultDocument}' was not found under '{FrontendRoot}'. Requests to '/' will fail.",
        defaultDocument,
        frontendRoot);
}

var defaultFiles = new DefaultFilesOptions
{
    FileProvider = fileProvider,
    RequestPath = ""
};
defaultFiles.DefaultFileNames.Clear();
defaultFiles.DefaultFileNames.Add(defaultDocument);

app.UseDefaultFiles(defaultFiles);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = fileProvider,
    RequestPath = ""
});

app.MapGet("/health", () => Results.Ok(new { status = "ok", utc = DateTimeOffset.UtcNow }));

app.MapFallback(() =>
{
    if (!File.Exists(defaultFilePath))
    {
        return Results.NotFound(new { message = $"Default document '{defaultDocument}' was not found." });
    }

    return Results.File(defaultFilePath, "text/html");
});

app.Run();
