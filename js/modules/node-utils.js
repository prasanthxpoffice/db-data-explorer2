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
      return `radial-gradient(circle, ${primaryColor} 0%, ${primaryColor} 100%)`;
    }
    const baseRadius = 55;
    const gapSize = 2;
    const ringCount = roles.length - 1;
    const available = Math.max(10, 45 - gapSize * (ringCount - 1));
    const thickness = Math.max(5, available / ringCount);

    const stops = [
      `${primaryColor} 0%`,
      `${primaryColor} ${baseRadius}%`,
    ];
    let cursor = baseRadius;

    roles.slice(1).forEach((role, index) => {
      const ringColor = normalizeColor(role.color, primaryColor);
      const spacerStart = Math.min(99, cursor + gapSize);
      stops.push(`${primaryColor} ${cursor}%`, `${primaryColor} ${spacerStart}%`);
      const ringStart = spacerStart;
      const ringEnd = Math.min(99.9, ringStart + thickness);
      stops.push(`${ringColor} ${ringStart}%`, `${ringColor} ${ringEnd}%`);
      cursor = ringEnd;
      if (index === ringCount - 1) {
        stops.push(`${primaryColor} ${cursor}%`, `${primaryColor} 100%`);
      }
    });

    return `radial-gradient(circle, ${stops.join(", ")})`;
  }

  function applyRoleVisuals(nodeData, defaultColor) {
    const roles = nodeData.meta?.roles || [];
    const primary = roles[0];
    const primaryColor = normalizeColor(primary?.color, defaultColor);
    nodeData.primaryColor = primaryColor || defaultColor;
    nodeData.color = nodeData.primaryColor;
    nodeData.type = primary?.key || nodeData.type || "";
    nodeData.roleKeys = roles.map((role) => role.key);
    nodeData.backgroundImage = buildGradient(nodeData.primaryColor, roles);
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
