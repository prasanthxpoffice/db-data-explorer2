(function (window) {
  const GraphApp = (window.GraphApp = window.GraphApp || {});

  GraphApp.createInfoPanel = function ({
    infoPanelEls,
    hydrate,
    defaultInfoHtml,
    translate,
    directionSymbol,
    pickMetaValue,
    escapeHtml,
    normalizeDateValue,
    getEntityLabel,
    defaultNodeColor,
  }) {
    const ensureContent = () => {
      if (!infoPanelEls.hydrated && !hydrate()) {
        return null;
      }
      return infoPanelEls.content;
    };

    const buildTable = (rows, modifier) => {
      const className = ["info-table", modifier].filter(Boolean).join(" ");
      return `<table class="${className}">${rows
        .map((row) => `<tr><th>${row.label}</th><td>${row.value}</td></tr>`)
        .join("")}</table>`;
    };

    const buildTableContainer = (rows, modifier) =>
      `<div class="info-table-container">${buildTable(rows, modifier)}</div>`;

    const colorChip = (color) =>
      `<span class="color-chip" style="background:${escapeHtml(
        color
      )}"></span>`;

    const renderConnectionCard = (conn) => {
      const neighbor = conn.neighbor || {};
      const rows = [
        { label: translate("direction"), value: directionSymbol(conn.orientation) },
        { label: translate("color"), value: colorChip(neighbor.color || defaultNodeColor) },
        {
          label: translate("description"),
          value: escapeHtml(neighbor.label || translate("unnamed")),
        },
        {
          label: translate("entity"),
          value: escapeHtml(
            neighbor.entityLabel ||
              neighbor.entity ||
              getEntityLabel(neighbor.type) ||
              "-"
          ),
        },
        { label: translate("code"), value: escapeHtml(neighbor.type || "-") },
        { label: translate("refNo"), value: escapeHtml(neighbor.id || "-") },
        {
          label: translate("relation"),
          value: escapeHtml(conn.edgeLabel || translate("noLabel")),
        },
      ];
      return `<div class="connection-card">${buildTable(
        rows,
        "info-table-compact"
      )}</div>`;
    };

    const renderConnections = (connections) =>
      connections.length
        ? `<div class="connections-grid">${connections
            .map(renderConnectionCard)
            .join("")}</div>`
        : `<p>${translate("noConnections")}</p>`;

    const renderNodeInfo = (data) => {
      const content = ensureContent();
      if (!data || !content) return;
      const connections = Array.isArray(data.connections)
        ? data.connections
        : [];
      const meta = data.meta || {};
      const colorValue =
        data.color || meta.color || data.dataColor || defaultNodeColor;
      const entity =
        pickMetaValue(meta, "nodeTypeLabel", "entityLabel", "entity", "Entity") ||
        data.entityLabel ||
        getEntityLabel(data.type) ||
        "-";
      const description =
        pickMetaValue(meta, "text", "description", "nodeText") ||
        data.label ||
        translate("nodeFallback");
      const dateValue = normalizeDateValue(
        pickMetaValue(meta, "nodeDate", "date")
      );
      const code =
        pickMetaValue(meta, "displayCol", "code", "columnId") ||
        data.type ||
        "-";
      const refNo =
        pickMetaValue(meta, "id", "refNumber", "refNo", "nodeId") ||
        data.id ||
        "-";

      const detailRows = [
        { label: translate("color"), value: colorChip(colorValue) },
        { label: translate("entity"), value: escapeHtml(entity) },
        {
          label: translate("description"),
          value: escapeHtml(description || translate("nodeFallback")),
        },
      ];
      if (dateValue) {
        detailRows.push({
          label: translate("date"),
          value: escapeHtml(dateValue),
        });
      }
      detailRows.push(
        { label: translate("code"), value: escapeHtml(code) },
        { label: translate("refNo"), value: escapeHtml(refNo) }
      );

      const detailTable = buildTableContainer(detailRows);
      content.innerHTML = `
        <div class="info-block info-block-table">
          ${detailTable}
        </div>
        <div class="info-block">
          <h4>${translate("connectedNodes")} (${connections.length})</h4>
          ${renderConnections(connections)}
        </div>
      `;
    };

    const renderEdgeNodeCard = (title, node) => {
      if (!node) return "";
      const entity =
        node.entityLabel || getEntityLabel(node.type) || node.type || "-";
      const rows = [
        { label: translate("color"), value: colorChip(node.color || defaultNodeColor) },
        {
          label: translate("description"),
          value: escapeHtml(node.label || translate("nodeFallback")),
        },
        { label: translate("entity"), value: escapeHtml(entity) },
        { label: translate("code"), value: escapeHtml(node.type || "-") },
        { label: translate("refNo"), value: escapeHtml(node.id || "-") },
      ];
      return `<div class="connection-card">
        <div class="connection-card-title">${escapeHtml(title)}</div>
        ${buildTable(rows, "info-table-compact")}
      </div>`;
    };

    const renderEdgeInfo = (data) => {
      const content = ensureContent();
      if (!data || !content) return;
      const directionValue = data.direction || translate("directionNone");
      const directionText = `${directionSymbol(data.direction)} ${escapeHtml(
        directionValue
      )}`;
      const tableRows = [
        { label: translate("direction"), value: directionText },
        {
          label: translate("edgeLabel"),
          value: escapeHtml(data.label || translate("noLabel")),
        },
      ];
      const detailTable = buildTableContainer(tableRows);
      content.innerHTML = `
        <div class="info-block info-block-table">
          ${detailTable}
        </div>
        <div class="info-block">
          <div class="connections-grid">
            ${renderEdgeNodeCard(translate("sourceNode"), data.source)}
            ${renderEdgeNodeCard(translate("targetNode"), data.target)}
          </div>
        </div>
      `;
    };

    const reset = () => {
      const content = ensureContent();
      if (!content) return;
      content.innerHTML = defaultInfoHtml();
    };

    return { renderNodeInfo, renderEdgeInfo, reset };
  };
})(window);
