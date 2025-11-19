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

  const MAX_PIE_SLICES = 8;

  function buildPieSlices(primaryColor, roles) {
    const normalizedRoles = roles && roles.length ? roles : [{ color: primaryColor }];
    const limited = normalizedRoles.slice(0, MAX_PIE_SLICES);
    const share = limited.length ? 100 / limited.length : 100;
    const slices = [];
    limited.forEach((role) => {
      slices.push({ color: normalizeColor(role.color, primaryColor), size: share });
    });
    return slices;
  }

  function applyRoleVisuals(nodeData, defaultColor) {
    const roles = nodeData.meta?.roles || [];
    const primary = roles[0];
    const primaryColor = normalizeColor(primary?.color, defaultColor);
    nodeData.primaryColor = primaryColor || defaultColor;
    nodeData.color = nodeData.primaryColor;
    nodeData.type = primary?.key || nodeData.type || "";
    nodeData.roleKeys = roles.map((role) => role.key);
    const slices = buildPieSlices(nodeData.primaryColor, roles);
    for (let i = 1; i <= MAX_PIE_SLICES; i += 1) {
      const slice = slices[i - 1];
      nodeData[`pie${i}Color`] = slice ? slice.color : nodeData.primaryColor;
      nodeData[`pie${i}Size`] = slice ? slice.size : 0;
    }
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
