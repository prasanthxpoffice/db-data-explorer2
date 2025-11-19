(function (window) {
  const GraphApp = (window.GraphApp = window.GraphApp || {});

  const normalizeColor = (color, fallback) => {
    const value = (color || "").trim();
    if (!value) return fallback;
    return value;
  };

  function buildNodeKey({ groupNodeId, entityId, columnId }) {
    const id = `${entityId ?? ""}`.trim();
    if (groupNodeId && id) {
      return `group:${groupNodeId}:${id}`;
    }
    const col = `${columnId ?? ""}`.trim();
    return `${col}:${id}`;
  }

  const legendKey = (value) => (value || "").trim().toLowerCase();

  function ensureRolesContainer(nodeData) {
    if (!nodeData.meta) {
      nodeData.meta = { roles: [] };
      return nodeData.meta.roles;
    }
    if (!Array.isArray(nodeData.meta.roles)) {
      nodeData.meta.roles = [];
    }
    return nodeData.meta.roles;
  }

  function buildGradient(primaryColor, roles) {
    if (!roles || roles.length <= 1) {
      return {
        colors: `${primaryColor} ${primaryColor}`,
        positions: "0% 100%",
      };
    }
    const colors = [primaryColor, primaryColor];
    const positions = ["0%", "65%"];
    const ringCount = roles.length - 1;
    const available = 30;
    const thickness = Math.max(3, available / ringCount);
    let cursor = 65;
    roles.slice(1).forEach((role, index) => {
      const ringColor = normalizeColor(role.color, primaryColor);
      const ringStart = Math.min(99, cursor + 1);
      const ringEnd = Math.min(100, ringStart + thickness);
      colors.push(ringColor, ringColor);
      positions.push(`${ringStart}%`, `${ringEnd}%`);
      cursor = ringEnd;
      if (index < ringCount - 1) {
        const spacerStart = Math.min(99, cursor + 0.5);
        const spacerEnd = Math.min(100, spacerStart + 0.5);
        colors.push(primaryColor, primaryColor);
        positions.push(`${spacerStart}%`, `${spacerEnd}%`);
        cursor = spacerEnd;
      }
    });
    if (positions[positions.length - 1] !== "100%") {
      colors.push(primaryColor);
      positions.push("100%");
    }
    return {
      colors: colors.join(" "),
      positions: positions.join(" "),
    };
  }

  function applyRoleVisuals(nodeData, defaultColor) {
    const roles = nodeData.meta?.roles || [];
    const primary = roles[0];
    const primaryColor = normalizeColor(primary?.color, defaultColor);
    nodeData.primaryColor = primaryColor || defaultColor;
    nodeData.color = nodeData.primaryColor;
    nodeData.type = primary?.key || nodeData.type || "";
    nodeData.roleKeys = roles.map((role) => role.key);
    const gradient = buildGradient(nodeData.primaryColor, roles);
    nodeData.ringGradientColors = gradient.colors;
    nodeData.ringGradientStops = gradient.positions;
  }

  function mergeRole(nodeData, role, defaultColor) {
    const roles = ensureRolesContainer(nodeData);
    const key = role.key;
    const existing = roles.find((r) => r.key === key);
    if (existing) {
      existing.label = existing.label || role.label;
      existing.color = normalizeColor(existing.color, role.color);
    } else {
      roles.push({
        colId: role.colId,
        key,
        label: role.label,
        color: role.color,
      });
    }
    applyRoleVisuals(nodeData, defaultColor);
  }

  GraphApp.NodeUtils = {
    buildNodeKey,
    legendKey,
    mergeRole,
    applyRoleVisuals,
    buildRole: (colId, label, color) => ({
      colId,
      key: legendKey(colId),
      label,
      color,
    }),
  };
})(window);
