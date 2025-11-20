using System.Web.Mvc;

namespace server_mvc_dotnet.Areas.DbGraph
{
    public class DbGraphAreaRegistration : AreaRegistration
    {
        public override string AreaName
        {
            get { return "DbGraph"; }
        }

        public override void RegisterArea(AreaRegistrationContext context)
        {
            context.MapRoute(
                "DbGraph_default",
                "DbGraph/{controller}/{action}/{id}",
                new { action = "Index", id = UrlParameter.Optional }
            );
        }
    }
}
