window.APP_CONFIG = {
  baseUrl: "http://localhost:5050",
  api: {
    views: { path: "/views", method: "GET" },
    nodeTypes: { path: "/node-types", method: "POST" },
    legends: { path: "/node-legends", method: "POST" },
    items: { path: "/items", method: "POST" },
    expand: { path: "/expand", method: "POST" },
  },
  defaults: {
    maxItems: 20,
    maxNodes: 200,
    autoExpandDepth: 1,
  },
  defaultLang: "en",
  showLanguageSelector: true,
  showTimelineButton: false,
  userId: "demo-user",
};
