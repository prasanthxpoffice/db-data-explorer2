using System.Collections.Generic;

namespace server_mvc_dotnet.Areas.DbGraph.Models
{
    public class GraphRequestBase
    {
        public GraphRequestBase()
        {
            ViewIds = new List<int>();
        }

        public string Lang { get; set; }
        public List<int> ViewIds { get; set; }
    }

    public class NodeTypesRequest : GraphRequestBase
    {
    }

    public class LegendsRequest : GraphRequestBase
    {
        public LegendsRequest()
        {
            OnlyActive = true;
        }

        public bool? OnlyActive { get; set; }
    }

    public class ItemsRequest : GraphRequestBase
    {
        public string ColId { get; set; }
        public int MaxCount { get; set; }
    }

    public class ExpandRequest : GraphRequestBase
    {
        public string SourceColId { get; set; }
        public string SourceId { get; set; }
        public int MaxNodes { get; set; }
        public List<LegendFilterDto> Filters { get; set; }
    }

    public class LegendFilterDto
    {
        public string DestinationColId { get; set; }
        public string FromDate { get; set; }
        public string ToDate { get; set; }
    }

    public class MasterNodeUpdateRequest
    {
        public string Column_ID { get; set; }
        public string ColumnEn { get; set; }
        public string ColumnAr { get; set; }
        public int GroupNodeID { get; set; }
        public bool? IsActive { get; set; }
        public string ColumnColor { get; set; }
        public string Lang { get; set; }
        public string UserId { get; set; }
    }

    public class SaveRelationRequest
    {
        public string Source_Column_ID { get; set; }
        public string Search_Column_ID { get; set; }
        public string Display_Column_ID { get; set; }
        public string Direction { get; set; }
        public string Relation_Column_ID { get; set; }
        public string RelationEn { get; set; }
        public string RelationAr { get; set; }
    }

    public class DeleteRelationRequest
    {
        public int RelationID { get; set; }
    }
}
