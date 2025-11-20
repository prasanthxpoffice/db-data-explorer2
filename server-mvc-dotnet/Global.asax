<%@ Application Language="C#" %>
<%@ Import Namespace="System" %>
<%@ Import Namespace="System.Configuration" %>
<%@ Import Namespace="System.Net" %>
<%@ Import Namespace="System.Web.Mvc" %>
<%@ Import Namespace="System.Web.Routing" %>
<script runat="server">
    void Application_Start(object sender, EventArgs e)
    {
        AreaRegistration.RegisterAllAreas();
        RegisterRoutes(RouteTable.Routes);
    }

    void Application_BeginRequest(object sender, EventArgs e)
    {
        var origin = ConfigurationManager.AppSettings["FrontendOrigin"] ?? "*";
        Response.Headers["Access-Control-Allow-Origin"] = origin;
        Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
        Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
        if (Request.HttpMethod.Equals("OPTIONS", StringComparison.OrdinalIgnoreCase))
        {
            Response.StatusCode = (int)HttpStatusCode.OK;
            Response.End();
        }
    }

    private static void RegisterRoutes(RouteCollection routes)
    {
        routes.IgnoreRoute("{resource}.axd/{*pathInfo}");
        routes.MapMvcAttributeRoutes();
        routes.MapRoute(
            name: "Default",
            url: "{controller}/{action}/{id}",
            defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional });
    }
</script>
