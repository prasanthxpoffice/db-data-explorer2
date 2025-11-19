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

  function buildPieSlices(primaryColor, roles, filterFn) {
    if (!roles || roles.length === 0) {
      return {
        slices: [{ color: primaryColor, size: 100 }],
        activeCount: 1,
        total: 0,
      };
    }
    const limited = roles.slice(0, MAX_PIE_SLICES);
    const flags = limited.map((role) => {
      if (typeof filterFn !== "function") {
        return true;
      }
      try {
        return !!filterFn(role);
      } catch (err) {
        console.warn("Role filter error", err);
        return true;
      }
    });
    const activeCount = flags.filter(Boolean).length;
    const share = activeCount ? 100 / activeCount : 0;
    const slices = limited.map((role, index) => ({
      color: normalizeColor(role.color, primaryColor),
      size: flags[index] ? share : 0,
    }));
    return { slices, activeCount, total: roles.length };
  }

  function applyRoleVisuals(nodeData, defaultColor, options = {}) {
    const roles = nodeData.meta?.roles || [];
    const primary = roles[0];
    const primaryColor = normalizeColor(primary?.color, defaultColor);
    nodeData.primaryColor = primaryColor || defaultColor;
    nodeData.color = nodeData.primaryColor;
    nodeData.type = primary?.key || nodeData.type || "";
    nodeData.roleKeys = roles.map((role) => role.key);
    const baseLabel =
      nodeData.baseLabel || nodeData.label || nodeData.text || nodeData.labelBase || "";
    nodeData.baseLabel = baseLabel;
    const { slices, activeCount, total } = buildPieSlices(
      nodeData.primaryColor,
      roles,
      options.filterFn
    );
    for (let i = 1; i <= MAX_PIE_SLICES; i += 1) {
      const slice = slices[i - 1];
      nodeData[`pie${i}Color`] = slice ? slice.color : nodeData.primaryColor;
      nodeData[`pie${i}Size`] = slice ? slice.size : 0;
    }
    nodeData.roleCount = roles.length;
    nodeData.activeRoleCount = roles.length ? activeCount : 1;
    nodeData.displayLabel =
      roles.length > 1 ? `${baseLabel}\n(+${roles.length - 1})` : baseLabel;
    return nodeData.activeRoleCount;
  }

  function mergeRole(nodeData, role, defaultColor, options = {}) {
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
    applyRoleVisuals(nodeData, defaultColor, options);
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
