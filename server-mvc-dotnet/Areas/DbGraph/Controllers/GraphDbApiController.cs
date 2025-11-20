using server_mvc_dotnet.Areas.DbGraph.Models;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using System.Web.Mvc;

namespace server_mvc_dotnet.Areas.DbGraph.Controllers
{
    [RouteArea("DbGraph", AreaPrefix = "")]
    [RoutePrefix("graphapi")]
    public class GraphDbApiController : Controller
    {
        private readonly string _connectionString;

        public GraphDbApiController()
        {
            var defaultConnection = ConfigurationManager.ConnectionStrings["DefaultConnection"];
            var connectionFromConfig = defaultConnection != null ? defaultConnection.ConnectionString : null;

            _connectionString =
                (connectionFromConfig ?? ConfigurationManager.AppSettings["SqlConnectionString"])
                ?? Environment.GetEnvironmentVariable("SQL_CONNECTION_STRING")
                ?? "Server=(localdb)\\MSSQLLocalDB;Database=IAS;Trusted_Connection=True;TrustServerCertificate=True;";
        }

        [HttpGet]
        [Route("views")]
        public Task<ActionResult> Views(string lang = null)
        {
            var normalizedLang = NormalizeLang(lang);
            return ExecuteStoredProcedure(
                "[graphdb].[api_ViewsGet]",
                command => command.Parameters.Add(new SqlParameter("@Lang", SqlDbType.NVarChar, 2) { Value = normalizedLang }));
        }

        [HttpPost]
        [Route("node-types")]
        public Task<ActionResult> NodeTypes(NodeTypesRequest request)
        {
            string lang;
            SqlParameter tvp;
            ActionResult error;
            if (!TryPrepareRequest(request, out lang, out tvp, out error))
            {
                return Task.FromResult<ActionResult>(error);
            }

            return ExecuteStoredProcedure(
                "[graphdb].[api_NodeTypesGet]",
                command =>
                {
                    command.Parameters.Add(new SqlParameter("@Lang", SqlDbType.NVarChar, 2) { Value = lang });
                    command.Parameters.Add(tvp);
                });
        }

        [HttpPost]
        [Route("node-legends")]
        public Task<ActionResult> NodeLegends(LegendsRequest request)
        {
            string lang;
            SqlParameter tvp;
            ActionResult error;
            if (!TryPrepareRequest(request, out lang, out tvp, out error))
            {
                return Task.FromResult<ActionResult>(error);
            }

            var onlyActive = true;
            if (request != null && request.OnlyActive.HasValue)
            {
                onlyActive = request.OnlyActive.Value;
            }

            return ExecuteStoredProcedure(
                "[graphdb].[api_NodeLegendsGet]",
                command =>
                {
                    command.Parameters.Add(new SqlParameter("@Lang", SqlDbType.NVarChar, 2) { Value = lang });
                    command.Parameters.Add(tvp);
                    command.Parameters.Add(new SqlParameter("@OnlyActive", SqlDbType.Bit) { Value = onlyActive });
                });
        }

        [HttpPost]
        [Route("items")]
        public Task<ActionResult> Items(ItemsRequest request)
        {
            if (request == null)
            {
                return Task.FromResult<ActionResult>(JsonError(HttpStatusCode.BadRequest, new { message = "Request body is required." }));
            }

            string lang;
            SqlParameter tvp;
            ActionResult error;
            if (!TryPrepareRequest(request, out lang, out tvp, out error))
            {
                return Task.FromResult<ActionResult>(error);
            }

            if (string.IsNullOrWhiteSpace(request.ColId))
            {
                return Task.FromResult<ActionResult>(JsonError(HttpStatusCode.BadRequest, new { message = "colId is required." }));
            }

            var maxCount = NormalizeMaxNodes(request.MaxCount);

            return ExecuteStoredProcedure(
                "[graphdb].[api_ViewColumnItemsGet]",
                command =>
                {
                    command.Parameters.Add(new SqlParameter("@Lang", SqlDbType.NVarChar, 2) { Value = lang });
                    command.Parameters.Add(tvp);
                    command.Parameters.Add(new SqlParameter("@ColId", SqlDbType.NVarChar, 128) { Value = request.ColId });
                    command.Parameters.Add(new SqlParameter("@MaxCount", SqlDbType.Int) { Value = maxCount });
                });
        }

        [HttpPost]
        [Route("expand")]
        public Task<ActionResult> Expand(ExpandRequest request)
        {
            if (request == null)
            {
                return Task.FromResult<ActionResult>(JsonError(HttpStatusCode.BadRequest, new { message = "Request body is required." }));
            }

            string lang;
            SqlParameter tvp;
            ActionResult error;
            if (!TryPrepareRequest(request, out lang, out tvp, out error))
            {
                return Task.FromResult<ActionResult>(error);
            }

            if (string.IsNullOrWhiteSpace(request.SourceColId))
            {
                return Task.FromResult<ActionResult>(JsonError(HttpStatusCode.BadRequest, new { message = "sourceColId is required." }));
            }

            if (string.IsNullOrWhiteSpace(request.SourceId))
            {
                return Task.FromResult<ActionResult>(JsonError(HttpStatusCode.BadRequest, new { message = "sourceId is required." }));
            }

            var maxNodes = NormalizeMaxNodes(request.MaxNodes);
            var filtersParameter = CreateLegendFiltersParameter("@Filters", request.Filters);

            return ExecuteStoredProcedure(
                "[graphdb].[api_NodeExpand]",
                command =>
                {
                    command.Parameters.Add(new SqlParameter("@Lang", SqlDbType.NVarChar, 2) { Value = lang });
                    command.Parameters.Add(tvp);
                    command.Parameters.Add(new SqlParameter("@SourceColId", SqlDbType.NVarChar, 128) { Value = request.SourceColId });
                    command.Parameters.Add(new SqlParameter("@SourceId", SqlDbType.NVarChar, 4000) { Value = request.SourceId });
                    command.Parameters.Add(new SqlParameter("@MaxNodes", SqlDbType.Int) { Value = maxNodes });
                    command.Parameters.Add(filtersParameter);
                });
        }

        [HttpGet]
        [Route("master-nodes")]
        public async Task<ActionResult> MasterNodes(string lang = null, string userId = null, bool? includeInactive = null)
        {
            var showInactive = includeInactive ?? false;

            try
            {
                using (var connection = new SqlConnection(_connectionString))
                {
                    await connection.OpenAsync().ConfigureAwait(false);
                    using (var command = connection.CreateCommand())
                    {
                        command.CommandText = "[graphdb].[api_NodesGet]";
                        command.CommandType = CommandType.StoredProcedure;

                        using (var reader = await command.ExecuteReaderAsync().ConfigureAwait(false))
                        {
                            var rows = new List<Dictionary<string, object>>();
                            while (await reader.ReadAsync().ConfigureAwait(false))
                            {
                                var row = new Dictionary<string, object>(reader.FieldCount, StringComparer.OrdinalIgnoreCase);
                                for (var i = 0; i < reader.FieldCount; i++)
                                {
                                    row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                                }

                                rows.Add(row);
                            }

                            if (!showInactive)
                            {
                                rows = rows
                                    .Where(row =>
                                    {
                                        object raw;
                                        if (!row.TryGetValue("IsActive", out raw))
                                        {
                                            return true;
                                        }

                                        return ConvertToBool(raw);
                                    })
                                    .ToList();
                            }

                            return JsonSuccess(rows);
                        }
                    }
                }
            }
            catch (SqlException ex)
            {
                return JsonError(HttpStatusCode.InternalServerError, new { title = "Database call failed", detail = ex.Message });
            }
        }

        [HttpGet]
        [Route("group-nodes")]
        public Task<ActionResult> GroupNodes(string lang = null)
        {
            var normalizedLang = NormalizeLang(lang);
            return ExecuteStoredProcedure(
                "[graphdb].[api_GroupNodeGet]",
                command => command.Parameters.Add(new SqlParameter("@Lang", SqlDbType.NVarChar, 2) { Value = normalizedLang }));
        }

        [HttpPost]
        [Route("master-nodes/update")]
        public Task<ActionResult> UpdateMasterNode(MasterNodeUpdateRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Column_ID))
            {
                return Task.FromResult<ActionResult>(JsonError(HttpStatusCode.BadRequest, new { message = "Column_ID is required." }));
            }

            if (request.GroupNodeID <= 0)
            {
                return Task.FromResult<ActionResult>(JsonError(HttpStatusCode.BadRequest, new { message = "GroupNodeID is required." }));
            }

            return ExecuteStoredProcedure(
                "[graphdb].[api_NodeUpdate]",
                command =>
                {
                    command.Parameters.Add(new SqlParameter("@Column_ID", SqlDbType.NVarChar, 128) { Value = request.Column_ID });
                    command.Parameters.Add(new SqlParameter("@ColumnEn", SqlDbType.NVarChar, 200) { Value = (object)request.ColumnEn ?? DBNull.Value });
                    command.Parameters.Add(new SqlParameter("@ColumnAr", SqlDbType.NVarChar, 200) { Value = (object)request.ColumnAr ?? DBNull.Value });
                    command.Parameters.Add(new SqlParameter("@GroupNodeID", SqlDbType.Int) { Value = request.GroupNodeID });
                    command.Parameters.Add(new SqlParameter("@IsActive", SqlDbType.Bit) { Value = request.IsActive.HasValue ? (object)request.IsActive.Value : DBNull.Value });
                    command.Parameters.Add(new SqlParameter("@ColumnColor", SqlDbType.NVarChar, 20) { Value = (object)request.ColumnColor ?? DBNull.Value });
                });
        }

        [HttpGet]
        [Route("master-relations")]
        public Task<ActionResult> MasterRelations(string lang = null)
        {
            var normalizedLang = NormalizeLang(lang);
            return ExecuteStoredProcedure(
                "[graphdb].[api_RelationsGet]",
                command => command.Parameters.Add(new SqlParameter("@Lang", SqlDbType.NVarChar, 2) { Value = normalizedLang }));
        }

        [HttpPost]
        [Route("master-relations/save")]
        public Task<ActionResult> SaveRelation(SaveRelationRequest request)
        {
            if (request == null)
            {
                return Task.FromResult<ActionResult>(JsonError(HttpStatusCode.BadRequest, new { message = "Request body is required." }));
            }

            if (string.IsNullOrWhiteSpace(request.Source_Column_ID) ||
                string.IsNullOrWhiteSpace(request.Search_Column_ID) ||
                string.IsNullOrWhiteSpace(request.Display_Column_ID))
            {
                return Task.FromResult<ActionResult>(JsonError(HttpStatusCode.BadRequest, new { message = "Source_Column_ID, Search_Column_ID and Display_Column_ID are required." }));
            }

            var hasRelationColumn = !string.IsNullOrWhiteSpace(request.Relation_Column_ID);
            var hasRelationText = !string.IsNullOrWhiteSpace(request.RelationEn) && !string.IsNullOrWhiteSpace(request.RelationAr);

            if (!hasRelationColumn && !hasRelationText)
            {
                return Task.FromResult<ActionResult>(JsonError(HttpStatusCode.BadRequest, new { message = "Either Relation_Column_ID or (RelationEn and RelationAr) must be provided." }));
            }

            if (hasRelationColumn && (request.RelationEn != null || request.RelationAr != null))
            {
                return Task.FromResult<ActionResult>(JsonError(HttpStatusCode.BadRequest, new { message = "RelationEn and RelationAr must be null when Relation_Column_ID is provided." }));
            }

            return ExecuteStoredProcedure(
                "[graphdb].[api_RelationSave]",
                command =>
                {
                    command.Parameters.Add(new SqlParameter("@Source_Column_ID", SqlDbType.NVarChar, 128) { Value = request.Source_Column_ID });
                    command.Parameters.Add(new SqlParameter("@Search_Column_ID", SqlDbType.NVarChar, 128) { Value = request.Search_Column_ID });
                    command.Parameters.Add(new SqlParameter("@Display_Column_ID", SqlDbType.NVarChar, 128) { Value = request.Display_Column_ID });
                    command.Parameters.Add(new SqlParameter("@Direction", SqlDbType.NChar, 10) { Value = (object)request.Direction ?? DBNull.Value });
                    command.Parameters.Add(new SqlParameter("@Relation_Column_ID", SqlDbType.NVarChar, 128) { Value = (object)request.Relation_Column_ID ?? DBNull.Value });
                    command.Parameters.Add(new SqlParameter("@RelationEn", SqlDbType.NVarChar, 128) { Value = (object)request.RelationEn ?? DBNull.Value });
                    command.Parameters.Add(new SqlParameter("@RelationAr", SqlDbType.NVarChar, 128) { Value = (object)request.RelationAr ?? DBNull.Value });
                });
        }

        [HttpPost]
        [Route("master-relations/delete")]
        public Task<ActionResult> DeleteRelation(DeleteRelationRequest request)
        {
            if (request == null || request.RelationID <= 0)
            {
                return Task.FromResult<ActionResult>(JsonError(HttpStatusCode.BadRequest, new { message = "RelationID is required." }));
            }

            return ExecuteStoredProcedure(
                "[graphdb].[api_RelationDelete]",
                command => command.Parameters.Add(new SqlParameter("@RelationID", SqlDbType.Int) { Value = request.RelationID }));
        }

        [HttpGet]
        [Route("health")]
        public ActionResult Health()
        {
            return JsonSuccess(new { status = "ok", utc = DateTimeOffset.UtcNow });
        }

        private async Task<ActionResult> ExecuteStoredProcedure(string procedureName, Action<SqlCommand> configure)
        {
            try
            {
                using (var connection = new SqlConnection(_connectionString))
                {
                    await connection.OpenAsync().ConfigureAwait(false);
                    using (var command = connection.CreateCommand())
                    {
                        command.CommandText = procedureName;
                        command.CommandType = CommandType.StoredProcedure;
                        if (configure != null)
                        {
                            configure(command);
                        }

                        using (var reader = await command.ExecuteReaderAsync().ConfigureAwait(false))
                        {
                            var resultSets = new List<IReadOnlyList<Dictionary<string, object>>>();
                            do
                            {
                                var rows = new List<Dictionary<string, object>>();
                                while (await reader.ReadAsync().ConfigureAwait(false))
                                {
                                    var row = new Dictionary<string, object>(reader.FieldCount, StringComparer.OrdinalIgnoreCase);
                                    for (var i = 0; i < reader.FieldCount; i++)
                                    {
                                        row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                                    }

                                    rows.Add(row);
                                }

                                resultSets.Add(rows);
                            }
                            while (await reader.NextResultAsync().ConfigureAwait(false));

                            var payload = resultSets.Count == 1 ? (object)resultSets[0] : resultSets;
                            return JsonSuccess(payload);
                        }
                    }
                }
            }
            catch (SqlException ex)
            {
                return JsonError(HttpStatusCode.InternalServerError, new { title = "Database call failed", detail = ex.Message });
            }
        }

        private bool TryPrepareRequest(GraphRequestBase request, out string lang, out SqlParameter viewIdsParameter, out ActionResult error)
        {
            if (request == null)
            {
                error = JsonError(HttpStatusCode.BadRequest, new { message = "Request body is required." });
                lang = "en";
                viewIdsParameter = null;
                return false;
            }

            if (request.ViewIds == null || request.ViewIds.Count == 0)
            {
                error = JsonError(HttpStatusCode.BadRequest, new { message = "At least one viewId must be provided." });
                lang = "en";
                viewIdsParameter = null;
                return false;
            }

            lang = NormalizeLang(request.Lang);
            viewIdsParameter = CreateIntListParameter("@ViewIds", request.ViewIds);
            error = null;
            return true;
        }

        private SqlParameter CreateIntListParameter(string name, IReadOnlyCollection<int> values)
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

        private SqlParameter CreateLegendFiltersParameter(string name, IReadOnlyCollection<LegendFilterDto> filters)
        {
            var table = new DataTable();
            table.Columns.Add("DestinationColId", typeof(string));
            table.Columns.Add("FromDate", typeof(DateTime));
            table.Columns.Add("ToDate", typeof(DateTime));

            if (filters != null)
            {
                foreach (var filter in filters)
                {
                    if (filter == null || string.IsNullOrWhiteSpace(filter.DestinationColId))
                    {
                        continue;
                    }

                    var row = table.NewRow();
                    row["DestinationColId"] = filter.DestinationColId;
                    row["FromDate"] = TryParseDate(filter.FromDate) ?? (object)DBNull.Value;
                    row["ToDate"] = TryParseDate(filter.ToDate) ?? (object)DBNull.Value;
                    table.Rows.Add(row);
                }
            }

            return new SqlParameter(name, SqlDbType.Structured)
            {
                TypeName = "graphdb.ExpandDateFilter",
                Value = table
            };
        }

        private int NormalizeMaxNodes(int raw)
        {
            const int max = 10000;
            var normalized = raw <= 0 ? 1 : raw;
            return Math.Min(Math.Max(normalized, 1), max);
        }

        private DateTime? TryParseDate(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            DateTime parsed;
            if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out parsed))
            {
                return parsed.Date;
            }

            return null;
        }

        private string NormalizeLang(string lang)
        {
            if (string.IsNullOrWhiteSpace(lang))
            {
                return "en";
            }

            var trimmed = lang.Trim().ToLowerInvariant();
            return trimmed == "ar" || trimmed == "en" ? trimmed : "en";
        }

        private bool ConvertToBool(object value)
        {
            if (value == null || value is DBNull)
            {
                return false;
            }

            if (value is bool)
            {
                return (bool)value;
            }

            if (value is byte)
            {
                return (byte)value != 0;
            }

            if (value is short)
            {
                return (short)value != 0;
            }

            if (value is int)
            {
                return (int)value != 0;
            }

            if (value is long)
            {
                return (long)value != 0;
            }

            if (value is float)
            {
                return Math.Abs((float)value) > float.Epsilon;
            }

            if (value is double)
            {
                return Math.Abs((double)value) > double.Epsilon;
            }

            if (value is decimal)
            {
                return (decimal)value != 0;
            }

            var text = value as string;
            if (!string.IsNullOrEmpty(text))
            {
                bool boolValue;
                if (bool.TryParse(text, out boolValue))
                {
                    return boolValue;
                }

                int intValue;
                if (int.TryParse(text, out intValue))
                {
                    return intValue != 0;
                }
            }

            return false;
        }

        private JsonResult JsonSuccess(object payload)
        {
            return Json(new { data = payload }, JsonRequestBehavior.AllowGet);
        }

        private JsonResult JsonError(HttpStatusCode status, object payload)
        {
            Response.StatusCode = (int)status;
            Response.TrySkipIisCustomErrors = true;
            return Json(payload, JsonRequestBehavior.AllowGet);
        }
    }
}
