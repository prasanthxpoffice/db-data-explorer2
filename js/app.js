function initApp() {
  if (!window.APP_CONFIG) {
    const fallback = document.getElementById("status");
    if (fallback) {
      fallback.textContent = "config.js failed to load.";
    }
    console.error(
      "APP_CONFIG missing. Ensure config.js is loaded before index.js."
    );
    return;
  }

  const defaults = {
    maxItems: APP_CONFIG.defaults?.maxItems ?? 20,
    maxNodes: APP_CONFIG.defaults?.maxNodes ?? 200,
    maxExpandNodes: APP_CONFIG.defaults?.maxExpandNodes ?? 200,
    defaultLayout: APP_CONFIG.defaults?.layout ?? "cose",
    animateLayout: APP_CONFIG.defaults?.animate ?? true,
    allowNodeExpand: APP_CONFIG.defaults?.allowNodeExpand ?? true,
    hideLeaves: APP_CONFIG.defaults?.hideLeaves ?? false,
    theme: APP_CONFIG.defaults?.theme ?? "light",
  };
  const DEFAULT_NODE_COLOR = "#87cefa";

  const dateDefaults = {
    from: "1900-01-01",
    to: "2100-12-31",
  };

  const state = {
    language: APP_CONFIG.defaultLang || "en",
    userId: APP_CONFIG.userId || "anonymous",
    views: [],
    viewIds: [],
    nodeTypes: [],
    items: [],
    selected: [],
    activeItem: null,
    theme: defaults.theme,
  };
  const translations = window.TRANSLATIONS || {};
  const translate = (key, fallback) => {
    const lang = state.language;
    return (
      translations[lang]?.[key] ??
      translations.en?.[key] ??
      fallback ??
      key
    );
  };

  const getEntityLabel = (colId) => {
    const key = (colId || "").toLowerCase();
    if (!key) return colId;
    const match = state.nodeTypes.find((nt) => {
      const id = (nt.colId || nt.ColId || "").toLowerCase();
      return id === key;
    });
    return match ? match.label || match.Label || match.colId || colId : colId;
  };

  const rootEl = document.querySelector(".graph-app") || document.body;

  const els = {
    language: document.getElementById("language"),
    viewsDropdown: document.getElementById("viewsDropdown"),
    viewsToggle: document.getElementById("viewsToggle"),
    viewsOptions: document.getElementById("viewsOptions"),
    nodeType: document.getElementById("nodeType"),
    fromDate: document.getElementById("fromDate"),
    toDate: document.getElementById("toDate"),
    itemSearch: document.getElementById("itemSearch"),
    itemSuggestions: document.getElementById("itemSuggestions"),
    addSelected: document.getElementById("addSelected"),
    clearGraph: document.getElementById("clearGraph"),
    showGraph: document.getElementById("showGraph"),
    selections: document.getElementById("selections"),
    status: document.getElementById("status"),
    graph: document.getElementById("cy"),
    maxNodes: document.getElementById("maxNodes"),
    filterPanel: document.getElementById("filterPanel"),
    toggleFilters: document.getElementById("toggleFilters"),
    filterChevron: document.getElementById("filterChevron"),
    configPanel: document.getElementById("configPanel"),
    toggleConfig: document.getElementById("toggleConfig"),
    configChevron: document.getElementById("configChevron"),
    viewsToggleLabel: document.getElementById("viewsToggleLabel"),
    layoutSelect: document.getElementById("layoutSelect"),
    animateToggle: document.getElementById("animateToggle"),
    stopExpandToggle: document.getElementById("stopExpandToggle"),
    hideLeavesToggle: document.getElementById("hideLeavesToggle"),
    autoExpandToggle: document.getElementById("autoExpandToggle"),
    themeSelect: document.getElementById("themeSelect"),
    exportPng: document.getElementById("exportPng"),
    loadingOverlay: document.getElementById("loading-overlay"),
    root: rootEl,
  };

  const floatingPanels = {
    filters: document.getElementById("filter-panel-root"),
    settings: document.getElementById("settings-panel-root"),
    info: document.getElementById("info-panel-root"),
  };
  const floatingButtons = Array.from(
    document.querySelectorAll(".panel-trigger")
  );
  let activeFloatingPanel = null;

  const infoPanelEls = {
    content: null,
    hydrated: false,
  };
  function hydrateInfoPanel() {
    infoPanelEls.content = document.getElementById("infoContent");
    infoPanelEls.hydrated = !!infoPanelEls.content;
    return infoPanelEls.hydrated;
  }
  const defaultInfoHtml = () => `<p>${translate("infoPrompt")}</p>`;
  const escapeHtml = (val = "") =>
    String(val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const DEFAULT_DATE_SENTINELS = new Set(["1900-01-01", "2100-12-31"]);

  const pickMetaValue = (meta, ...keys) => {
    if (!meta) return undefined;
    for (const key of keys) {
      if (key in meta && meta[key] !== undefined && meta[key] !== null) {
        return meta[key];
      }
      const lower =
        typeof key === "string"
          ? key.charAt(0).toLowerCase() + key.slice(1)
          : key;
      if (
        typeof lower === "string" &&
        lower in meta &&
        meta[lower] !== undefined &&
        meta[lower] !== null
      ) {
        return meta[lower];
      }
      const upper =
        typeof key === "string"
          ? key.charAt(0).toUpperCase() + key.slice(1)
          : key;
      if (
        typeof upper === "string" &&
        upper in meta &&
        meta[upper] !== undefined &&
        meta[upper] !== null
      ) {
        return meta[upper];
      }
    }
    return undefined;
  };

  const normalizeDateValue = (value) => {
    if (!value) return null;
    let str = value;
    if (value instanceof Date && !isNaN(value.getTime())) {
      str = value.toISOString().slice(0, 10);
    } else {
      str = String(value).slice(0, 10);
    }
    if (DEFAULT_DATE_SENTINELS.has(str)) return null;
    return str;
  };

  const directionSymbol = (directionRaw) => {
    const dir = (directionRaw || "").trim();
    switch (dir) {
      case "->":
      case "outgoing":
        return "&rarr;";
      case "<-":
      case "incoming":
        return "&larr;";
      case "<->":
      case "both":
        return "&harr;";
      default:
        return "&rarr;";
    }
  };

  function applyDomTranslations() {
    document
      .querySelectorAll("[data-i18n]")
      .forEach((el) => {
        const key = el.dataset.i18n;
        if (key) {
          el.textContent = translate(key, el.textContent);
        }
      });
    document
      .querySelectorAll("[data-i18n-placeholder]")
      .forEach((el) => {
        const key = el.dataset.i18nPlaceholder;
        if (key) {
          el.placeholder = translate(key, el.placeholder);
        }
      });
    document
      .querySelectorAll("[data-i18n-aria-label]")
      .forEach((el) => {
        const key = el.dataset.i18nAriaLabel;
        if (key) {
          el.setAttribute("aria-label", translate(key, el.getAttribute("aria-label")));
        }
      });
  }

  function resetInfoPanel() {
    if (!infoPanelEls.hydrated) {
      hydrateInfoPanel();
    }
    const content = infoPanelEls.content;
    if (content) {
      content.innerHTML = defaultInfoHtml();
    }
  }

  function renderNodeInfo(data) {
    if (!infoPanelEls.hydrated && !hydrateInfoPanel()) return;
    const content = infoPanelEls.content;
    if (!data || !content) return;
    const connections = Array.isArray(data.connections) ? data.connections : [];
    const connectionItems = connections.length
      ? `<div class="connections-grid">${connections
          .map((conn) => {
            const neighbor = conn.neighbor || {};
            const arrowSymbol = directionSymbol(conn.orientation);
            const neighborColor = neighbor.color || DEFAULT_NODE_COLOR;
            const neighborColorChip = `<span class="color-chip" style="background:${escapeHtml(
              neighborColor
            )}"></span>`;
            const rows = [
              { label: translate("direction"), value: arrowSymbol },
              { label: translate("color"), value: neighborColorChip },
              {
                label: translate("description"),
                value: escapeHtml(
                  neighbor.label || translate("unnamed")
                ),
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
              {
                label: translate("code"),
                value: escapeHtml(neighbor.type || "-"),
              },
              {
                label: translate("refNo"),
                value: escapeHtml(neighbor.id || "-"),
              },
              {
                label: translate("relation"),
                value: escapeHtml(conn.edgeLabel || translate("noLabel")),
              },
            ];
            const table = `<table class="info-table info-table-compact">${rows
              .map(
                (row) =>
                  `<tr><th>${row.label}</th><td>${row.value}</td></tr>`
              )
              .join("")}</table>`;
            return `<div class="connection-card">${table}</div>`;
          })
          .join("")}</div>`
      : `<p>${translate("noConnections")}</p>`;

    const meta = data.meta || {};
    const colorValue =
      data.color || meta.color || data.dataColor || DEFAULT_NODE_COLOR;
    const colorSwatch = `<span class="color-chip" style="background:${escapeHtml(
      colorValue
    )}"></span>`;
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
      pickMetaValue(meta, "displayCol", "code", "columnId") || data.type || "-";
    const refNo =
      pickMetaValue(meta, "id", "refNumber", "refNo", "nodeId") ||
      data.id ||
      "-";

    const detailRows = [
      { label: translate("color"), value: `${colorSwatch}` },
      { label: translate("entity"), value: escapeHtml(entity) },
      {
        label: translate("description"),
        value: escapeHtml(description || translate("nodeFallback")),
      },
    ];
    if (dateValue) {
      detailRows.push({ label: translate("date"), value: escapeHtml(dateValue) });
    }
    detailRows.push(
      { label: translate("code"), value: escapeHtml(code) },
      { label: translate("refNo"), value: escapeHtml(refNo) }
    );

    const detailTable = `<div class="info-table-container"><table class="info-table">${detailRows
      .map((row) => `<tr><th>${row.label}</th><td>${row.value}</td></tr>`)
      .join("")}</table></div>`;

    content.innerHTML = `
      <div class="info-block info-block-table">
        ${detailTable}
      </div>
      <div class="info-block">
        <h4>${translate("connectedNodes")} (${connections.length})</h4>
        ${connectionItems}
      </div>
    `;
  }

  function renderEdgeInfo(data) {
    if (!infoPanelEls.hydrated && !hydrateInfoPanel()) return;
    const content = infoPanelEls.content;
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
    const detailTable = `<div class="info-table-container"><table class="info-table">${tableRows
      .map((row) => `<tr><th>${row.label}</th><td>${row.value}</td></tr>`)
      .join("")}</table></div>`;
    const cardMarkup = (title, node) => {
      if (!node) return "";
      const color = node.color || DEFAULT_NODE_COLOR;
      const colorChip = `<span class="color-chip" style="background:${escapeHtml(
        color
      )}"></span>`;
      const entity =
        node.entityLabel || getEntityLabel(node.type) || node.type || "-";
      const rows = [
        { label: translate("color"), value: colorChip },
        {
          label: translate("description"),
          value: escapeHtml(node.label || translate("nodeFallback")),
        },
        { label: translate("entity"), value: escapeHtml(entity) },
        {
          label: translate("code"),
          value: escapeHtml(node.type || "-"),
        },
        {
          label: translate("refNo"),
          value: escapeHtml(node.id || "-"),
        },
      ];
      const table = `<table class="info-table info-table-compact">${rows
        .map(
          (row) =>
            `<tr><th>${row.label}</th><td>${row.value}</td></tr>`
        )
        .join("")}</table>`;
      return `<div class="connection-card">
        <div class="connection-card-title">${escapeHtml(title)}</div>
        ${table}
      </div>`;
    };
    content.innerHTML = `
      <div class="info-block info-block-table">
        ${detailTable}
      </div>
      <div class="info-block">
        <div class="connections-grid">
          ${cardMarkup(translate("sourceNode"), data.source)}
          ${cardMarkup(translate("targetNode"), data.target)}
        </div>
      </div>
    `;
  }

  hydrateInfoPanel();
  resetInfoPanel();

  const setStatus = (msg) => {
    if (els.status) {
      els.status.textContent = msg;
    }
  };

  if (els.language) {
    els.language.value = state.language;
  }
  if (els.maxNodes) {
    els.maxNodes.value = defaults.maxNodes;
  }
  if (els.layoutSelect) {
    els.layoutSelect.value = defaults.defaultLayout;
  }
  if (els.animateToggle) {
    els.animateToggle.checked = defaults.animateLayout;
  }
  if (els.stopExpandToggle) {
    els.stopExpandToggle.checked = !defaults.allowNodeExpand;
  }
  if (els.hideLeavesToggle) {
    els.hideLeavesToggle.checked = defaults.hideLeaves;
  }
  if (els.autoExpandToggle) {
    els.autoExpandToggle.checked = false;
  }
  if (els.themeSelect) {
    els.themeSelect.value = defaults.theme;
  }
  rootEl.dataset.theme = state.theme;

  const loadingTracker = window.GraphApp.createLoadingTracker(
    els.loadingOverlay
  );
  const data = window.GraphApp.createDataModule({
    APP_CONFIG,
    state,
    els,
    defaults,
    setStatus,
    translate,
    beginLoading: loadingTracker.beginLoading,
    endLoading: loadingTracker.endLoading,
  });
  const graph = window.GraphApp.createGraphModule({
    state,
    els,
    defaults,
    dateDefaults,
    DEFAULT_NODE_COLOR,
    setStatus,
    translate,
    callApi: data.callApi,
    unwrapData: data.unwrapData,
    getMaxNodes,
    onNodeSelected: renderNodeInfo,
    onEdgeSelected: renderEdgeInfo,
    onGraphCleared: resetInfoPanel,
  });

  function dirFor(lang) {
    return lang === "ar" ? "rtl" : "ltr";
  }
  function alignFor(lang) {
    return lang === "ar" ? "right" : "left";
  }

  function applyLanguageChrome() {
    document.documentElement.lang = state.language;
    document.documentElement.dir = dirFor(state.language);
    document.body.style.textAlign = alignFor(state.language);
    if (els.language) {
      els.language.value = state.language;
    }
    applyDomTranslations();
    data.updateViewIndicator();
    renderSelections();
  }

  let filtersCollapsed = false;
  const updateFilterPanel = () => {
    if (!els.filterPanel) return;
    if (filtersCollapsed) {
      els.filterPanel.classList.add("collapsed");
      if (els.filterChevron) els.filterChevron.textContent = ">";
    } else {
      els.filterPanel.classList.remove("collapsed");
      if (els.filterChevron) els.filterChevron.textContent = "v";
    }
    updateGraphPadding();
  };

  if (els.filterPanel && els.toggleFilters) {
    updateFilterPanel();
    els.toggleFilters.addEventListener("click", () => {
      filtersCollapsed = !filtersCollapsed;
      updateFilterPanel();
    });
  }
  if (els.filterChevron && !els.toggleFilters.contains(els.filterChevron)) {
    els.filterChevron.addEventListener("click", (event) => {
      event.stopPropagation();
      filtersCollapsed = !filtersCollapsed;
      updateFilterPanel();
    });
  }

  let configCollapsed = false;
  const updateConfigPanel = () => {
    if (!els.configPanel) return;
    if (configCollapsed) {
      els.configPanel.classList.add("collapsed");
      if (els.configChevron) els.configChevron.textContent = ">";
    } else {
      els.configPanel.classList.remove("collapsed");
      if (els.configChevron) els.configChevron.textContent = "v";
    }
    updateGraphPadding();
  };

  if (els.configPanel && els.toggleConfig) {
    updateConfigPanel();
    els.toggleConfig.addEventListener("click", () => {
      configCollapsed = !configCollapsed;
      updateConfigPanel();
    });
  }
  if (
    els.configChevron &&
    (!els.toggleConfig || !els.toggleConfig.contains(els.configChevron))
  ) {
    els.configChevron.addEventListener("click", (event) => {
      event.stopPropagation();
      configCollapsed = !configCollapsed;
      updateConfigPanel();
    });
  }

  function renderSelections() {
    if (!els.selections) return;
    els.selections.innerHTML = state.selected
      .map(
        (s, i) => `
      <li>
        <div class="row">
          <b>${s.colLabel ?? s.colId}</b> &mdash; ${s.text}
          <span class="pill">${s.id}</span>
        </div>
        <div class="row" style="margin-top:6px">
          <span>${translate("fromLabel")}: ${s.fromDate || translate("anyValue")}</span>
          <span>${translate("toLabel")}: ${s.toDate || translate("anyValue")}</span>
          <button data-i="${i}" class="rm danger remove-pill" aria-label="Remove">&times;</button>
        </div>
      </li>
    `
      )
      .join("");

    els.selections.querySelectorAll("button.rm").forEach((btn) => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.i, 10);
        state.selected.splice(idx, 1);
        renderSelections();
      };
    });

    if (els.showGraph) {
      els.showGraph.style.display = state.selected.length ? "block" : "none";
    }
  }

  function setGraphReadyState(hasGraph) {
    rootEl.classList.toggle("graph-ready", hasGraph);
    if (els.clearGraph) {
      els.clearGraph.style.display = hasGraph ? "block" : "none";
    }
  }

  function getMaxNodes() {
    const value = parseInt(els.maxNodes?.value ?? "", 10);
    return Number.isFinite(value) ? Math.max(10, value) : defaults.maxNodes;
  }

  function updateGraphPadding() {
    const graphSurface = document.querySelector(".wrap");
    if (!graphSurface) return;
    // Panels are absolutely positioned; graph already full screen.
  }

  els.language?.addEventListener("change", () => {
    state.language = els.language.value;
    applyLanguageChrome();
    data.clearItems(true);
    data.loadViews();
    resetInfoPanel();
  });

  const isCompactLayout = () =>
    window.matchMedia("(max-width: 1100px)").matches;

  function applyPanelState() {
    floatingButtons.forEach((btn) => {
      const isActive = activeFloatingPanel === btn.dataset.panel;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    Object.entries(floatingPanels).forEach(([key, panel]) => {
      if (!panel) return;
      panel.classList.toggle("open", activeFloatingPanel === key);
    });
  }

  function setActivePanel(name) {
    if (name === "info" && !infoPanelEls.hydrated) {
      hydrateInfoPanel();
      if (!infoPanelEls.hydrated) return;
    }
    activeFloatingPanel = name;
    applyPanelState();
  }

  function closeFloatingPanels() {
    setActivePanel(null);
  }

  function toggleFloatingPanel(name) {
    const panel = floatingPanels[name];
    if (!panel) return;

    if (isCompactLayout()) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (activeFloatingPanel === name) {
      closeFloatingPanels();
    } else {
      setActivePanel(name);
    }
  }

  applyPanelState();

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(".panel-trigger");
    if (trigger) {
      event.stopPropagation();
      toggleFloatingPanel(trigger.dataset.panel);
    }
  });

  window
    .matchMedia("(max-width: 1100px)")
    .addEventListener("change", closeFloatingPanels);

  els.viewsToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = els.viewsDropdown?.classList.contains("open");
    data.setViewsDropdownOpen(!isOpen);
  });

  els.viewsOptions?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  els.viewsOptions?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const id = data.getViewId(target.value);
    if (id === null) {
      return;
    }
    if (target.checked) {
      if (!state.viewIds.includes(id)) {
        state.viewIds.push(id);
      }
    } else {
      state.viewIds = state.viewIds.filter((v) => v !== id);
    }
    data.updateViewIndicator();
    data.clearItems(true);
    data.loadNodeTypesForViews();
    if (els.itemSearch?.value) {
      data.scheduleLoadItems();
    }
    if (els.autoExpandToggle?.checked) {
      graph.resetAutoExpandProgress();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      data.setViewsDropdownOpen(false);
      closeFloatingPanels();
    }
  });

  els.nodeType?.addEventListener("change", () => {
    data.clearItems(false);
    if (els.itemSearch?.value) {
      data.scheduleLoadItems();
    }
  });

  els.itemSearch?.addEventListener("input", () => {
    data.renderItems();
    data.scheduleLoadItems();
  });

  if (els.itemSuggestions) {
    els.itemSuggestions.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-index]");
      if (!button) {
        return;
      }
      const index = Number(button.dataset.index);
      const item = data.getVisibleItems()[index];
      if (!item) {
        return;
      }
      state.activeItem = {
        id: `${item.id ?? item.Id ?? ""}`,
        text: item.text ?? item.Text ?? "(no text)",
      };
      els.itemSearch.value = state.activeItem.text;
      data.hideSuggestions();
    });
  }

  document.addEventListener("click", (event) => {
    if (!els.itemSuggestions) return;
    if (
      !els.itemSuggestions.contains(event.target) &&
      event.target !== els.itemSearch
    ) {
      data.hideSuggestions();
    }
  });

  els.addSelected?.addEventListener("click", () => {
    const colId = els.nodeType?.value;
    const colLabel =
      els.nodeType?.options[els.nodeType.selectedIndex]?.textContent ?? colId;
    if (!colId) {
    setStatus(translate("statusPickEntity"));
      return;
    }

    if (!state.activeItem) {
    setStatus(translate("statusChooseItem"));
      return;
    }

    const duplicate = state.selected.some(
      (entry) => entry.colId === colId && entry.id === state.activeItem?.id
    );

    if (duplicate) {
    setStatus(translate("statusDuplicateItem"));
      return;
    }

    const fromDate = (els.fromDate?.value || "").trim();
    const toDate = (els.toDate?.value || "").trim();

    state.selected.push({
      colId,
      colLabel,
      id: state.activeItem.id,
      text: state.activeItem.text,
      fromDate,
      toDate,
      resolvedFromDate: fromDate || dateDefaults.from,
      resolvedToDate: toDate || dateDefaults.to,
    });

    state.activeItem = null;
    if (els.itemSearch) els.itemSearch.value = "";
    data.hideSuggestions();
    renderSelections();
  });

  els.clearGraph?.addEventListener("click", () => {
    graph.clearGraph();
    state.selected = [];
    renderSelections();
    setGraphReadyState(false);
    setStatus(translate("statusGraphCleared"));
  });

  const refreshGraphLayout = () => {
    graph.runLayout();
  };

  els.layoutSelect?.addEventListener("change", refreshGraphLayout);
  els.animateToggle?.addEventListener("change", refreshGraphLayout);

  els.themeSelect?.addEventListener("change", () => {
    state.theme = els.themeSelect.value;
    rootEl.dataset.theme = state.theme;
    graph.refreshStyle();
  });

  els.exportPng?.addEventListener("click", () => {
    if (!window.cy) return;
    const png = window.cy.png({ full: true, scale: 2 });
    const link = document.createElement("a");
    link.href = png;
    link.download = `graph-${Date.now()}.png`;
    link.click();
  });

  els.autoExpandToggle?.addEventListener("change", () => {
    if (els.autoExpandToggle.checked) {
      graph.resetAutoExpandProgress();
    }
  });

  els.hideLeavesToggle?.addEventListener("change", () => {
    graph.updateLeafVisibility();
  });

  els.showGraph?.addEventListener("click", async () => {
    try {
      if (!state.selected.length) {
        setStatus(translate("statusNeedSelection"));
        return;
      }
      if (!state.viewIds.length) {
        setStatus(translate("statusNeedViews"));
        return;
      }

      setStatus(translate("statusBuildingGraph"));
      graph.resetAutoExpandProgress();

      const nodes = new Map();
      const edges = new Map();
      const edgePairMap = new Map();
      const nodeKey = (colId, id) => `${colId}:${id}`;
      const undirectedKey = (a, b) => (a < b ? `${a}||${b}` : `${b}||${a}`);

      state.selected.forEach((sel) => {
        const key = nodeKey(sel.colId, sel.id);
        const fromDate = sel.resolvedFromDate || sel.fromDate || "Any";
        const toDate = sel.resolvedToDate || sel.toDate || "Any";
        const entityLabel = getEntityLabel(sel.colId);
        nodes.set(key, {
          data: {
            id: key,
            type: sel.colId,
            label: sel.text,
            entityLabel,
            color: sel.color ?? DEFAULT_NODE_COLOR,
            seed: true,
            meta: {
              source: "selection",
              columnId: sel.colId,
              columnLabel: sel.colLabel ?? sel.colId,
              entityLabel,
              nodeText: sel.text,
              nodeId: sel.id,
              fromDate,
              toDate,
            },
          },
        });
      });

      for (const sel of state.selected) {
        const resp = await data.callApi("expand", {
          viewIds: state.viewIds,
          sourceColId: sel.colId,
          sourceId: sel.id,
          fromDate: sel.resolvedFromDate ?? dateDefaults.from,
          toDate: sel.resolvedToDate ?? dateDefaults.to,
          maxNodes: getMaxNodes(),
        });
        const rows = data.unwrapData(resp);

        rows.forEach((row) => {
          const displayCol = row.displayCol ?? row.DisplayCol ?? "";
          const id = `${row.id ?? row.Id ?? ""}`;
          const text = row.text ?? row.Text ?? "(no text)";
          const label =
            row.edgeLabel ?? row.EdgeLabel ?? row.ed_r_ed ?? row.ED_R_ED ?? "";
          const direction = row.direction ?? row.Direction ?? "";
          const color = row.color ?? row.Color ?? DEFAULT_NODE_COLOR;
          const { sourceArrow, targetArrow } = graph.deriveArrows(direction);

          const targetKey = nodeKey(displayCol, id);
          const entityLabel = getEntityLabel(displayCol);
          if (!nodes.has(targetKey)) {
            nodes.set(targetKey, {
              data: {
                id: targetKey,
                type: displayCol,
                label: text,
                entityLabel,
                color,
                seed: false,
                meta: { ...row, entityLabel },
              },
            });
          } else {
            const nodeData = nodes.get(targetKey).data || {};
            if (!nodeData.color && color) {
              nodeData.color = color;
            }
            if (!nodeData.meta) {
              nodeData.meta = { ...row };
            }
            if (!nodeData.meta.entityLabel) {
              nodeData.meta.entityLabel = entityLabel;
            }
            if (!nodeData.entityLabel) {
              nodeData.entityLabel = entityLabel;
            }
          }

          const sourceKey = nodeKey(sel.colId, sel.id);
          const pairKey = undirectedKey(sourceKey, targetKey);
          const existingEdgeId = edgePairMap.get(pairKey);
          if (existingEdgeId) {
            const existing = edges.get(existingEdgeId);
            if (existing && !existing.data.label && label) {
              existing.data.label = label;
            }
            if (existing && !existing.data.meta) {
              existing.data.meta = {
                ...row,
                sourceColId: sel.colId,
                sourceId: sel.id,
              };
            }
            return;
          }

          const edgeIdentifier = `${sourceKey}|${targetKey}|${
            direction || "none"
          }`;
          edges.set(edgeIdentifier, {
            data: {
              id: edgeIdentifier,
              source: sourceKey,
              target: targetKey,
              label,
              direction,
              sourceArrow,
              targetArrow,
              meta: {
                ...row,
                sourceColId: sel.colId,
                sourceId: sel.id,
              },
            },
          });
          edgePairMap.set(pairKey, edgeIdentifier);
        });
      }

      graph.renderGraph(Array.from(nodes.values()), Array.from(edges.values()));
      setGraphReadyState(true);
      setStatus(
        `${translate("statusGraphReady")} ${translate("statusNodes")}: ${
          nodes.size
        }, ${translate("statusEdges")}: ${edges.size}`
      );
      graph.queueAutoExpand();
    } catch (err) {
      setStatus(err.message);
    }
  });

  applyLanguageChrome();
  renderSelections();
  data.loadViews();
  updateGraphPadding();
}

let domReady = false;
let partialsReady = false;

function tryInit() {
  if (domReady && partialsReady) {
    initApp();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  domReady = true;
  tryInit();
});

document.addEventListener("partials:ready", () => {
  partialsReady = true;
  tryInit();
});
