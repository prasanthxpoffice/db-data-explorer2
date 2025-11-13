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
    layoutSelect: document.getElementById("layoutSelect"),
    animateToggle: document.getElementById("animateToggle"),
    stopExpandToggle: document.getElementById("stopExpandToggle"),
    hideLeavesToggle: document.getElementById("hideLeavesToggle"),
    autoExpandToggle: document.getElementById("autoExpandToggle"),
    themeSelect: document.getElementById("themeSelect"),
    exportPng: document.getElementById("exportPng"),
    loadingOverlay: document.getElementById("loading-overlay"),
  };

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
  document.body.dataset.theme = state.theme;

  const loadingTracker = window.GraphApp.createLoadingTracker(
    els.loadingOverlay
  );
  const data = window.GraphApp.createDataModule({
    APP_CONFIG,
    state,
    els,
    defaults,
    setStatus,
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
    callApi: data.callApi,
    unwrapData: data.unwrapData,
    getMaxNodes,
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
    if (els.language) {
      els.language.value = state.language;
    }
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
          <span>From: ${s.fromDate || "Any"}</span>
          <span>To: ${s.toDate || "Any"}</span>
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
    document.body.classList.toggle("graph-ready", hasGraph);
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
  });

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
      setStatus("Pick an entity first.");
      return;
    }

    if (!state.activeItem) {
      setStatus("Choose an item from the suggestions.");
      return;
    }

    const duplicate = state.selected.some(
      (entry) =>
        entry.colId === colId && entry.id === state.activeItem?.id
    );

    if (duplicate) {
      setStatus("This item is already in the list.");
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
    setStatus("Graph cleared.");
  });

  const refreshGraphLayout = () => {
    graph.runLayout();
  };

  els.layoutSelect?.addEventListener("change", refreshGraphLayout);
  els.animateToggle?.addEventListener("change", refreshGraphLayout);

  els.themeSelect?.addEventListener("change", () => {
    state.theme = els.themeSelect.value;
    document.body.dataset.theme = state.theme;
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
        setStatus("Add at least one selection.");
        return;
      }
      if (!state.viewIds.length) {
        setStatus("Select views first.");
        return;
      }

      setStatus("Building graph…");
      graph.resetAutoExpandProgress();

      const nodes = new Map();
      const edges = new Map();
      const edgePairMap = new Map();
      const nodeKey = (colId, id) => `${colId}:${id}`;
      const undirectedKey = (a, b) => (a < b ? `${a}||${b}` : `${b}||${a}`);

      state.selected.forEach((sel) => {
        const key = nodeKey(sel.colId, sel.id);
        nodes.set(key, {
          data: {
            id: key,
            type: sel.colId,
            label: sel.text,
            color: sel.color ?? DEFAULT_NODE_COLOR,
            seed: true,
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
          if (!nodes.has(targetKey)) {
            nodes.set(targetKey, {
              data: {
                id: targetKey,
                type: displayCol,
                label: text,
                color,
                seed: false,
              },
            });
          } else if (!nodes.get(targetKey).data?.color && color) {
            nodes.get(targetKey).data.color = color;
          }

          const sourceKey = nodeKey(sel.colId, sel.id);
          const pairKey = undirectedKey(sourceKey, targetKey);
          const existingEdgeId = edgePairMap.get(pairKey);
          if (existingEdgeId) {
            const existing = edges.get(existingEdgeId);
            if (existing && !existing.data.label && label) {
              existing.data.label = label;
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
            },
          });
          edgePairMap.set(pairKey, edgeIdentifier);
        });
      }

      graph.renderGraph(
        Array.from(nodes.values()),
        Array.from(edges.values())
      );
      setGraphReadyState(true);
      setStatus(`Graph ready. Nodes: ${nodes.size}, Edges: ${edges.size}`);
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
