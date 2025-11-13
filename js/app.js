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

  els.language.value = state.language;
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

  let pendingLoads = 0;
  let loadingTimer = null;
  const LOADING_DELAY = 400;

  function updateLoadingOverlay(show) {
    if (!els.loadingOverlay) return;
    if (show) {
      els.loadingOverlay.removeAttribute("hidden");
    } else {
      els.loadingOverlay.setAttribute("hidden", "true");
    }
  }

  function beginLoading() {
    pendingLoads += 1;
    if (!loadingTimer) {
      loadingTimer = window.setTimeout(() => {
        loadingTimer = null;
        if (pendingLoads > 0) {
          updateLoadingOverlay(true);
        }
      }, LOADING_DELAY);
    }
  }

  function endLoading() {
    pendingLoads = Math.max(0, pendingLoads - 1);
    if (pendingLoads === 0) {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
        loadingTimer = null;
      }
      updateLoadingOverlay(false);
    }
  }

  function setStatus(msg) {
    els.status.textContent = msg;
  }

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
    els.language.value = state.language;
  }

  function deriveArrows(directionRaw) {
    const direction = (directionRaw || "").trim();
    switch (direction) {
      case "->":
        return { sourceArrow: "none", targetArrow: "triangle" };
      case "<-":
        return { sourceArrow: "triangle", targetArrow: "none" };
      case "<->":
        return { sourceArrow: "triangle", targetArrow: "triangle" };
      default:
        return { sourceArrow: "none", targetArrow: "none" };
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
      if (els.configChevron) els.configChevron.textContent = "<";
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
    els.configChevron?.addEventListener("click", (event) => {
      event.stopPropagation();
      configCollapsed = !configCollapsed;
      updateConfigPanel();
    });
  }

  function withContext(payload) {
    return { ...(payload || {}), lang: state.language, userId: state.userId };
  }

  function buildUrl(endpoint, params) {
    const url = new URL(endpoint.path, APP_CONFIG.baseUrl);
    if (endpoint.method === "GET" && params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        url.searchParams.set(key, value);
      });
    }
    return url.toString();
  }

  async function callApi(key, payload) {
    const endpoint = APP_CONFIG.api[key];
    if (!endpoint) {
      throw new Error(`Unknown API endpoint: ${key}`);
    }
    const context = withContext(payload);
    const url = buildUrl(endpoint, context);
    const init = { method: endpoint.method };

    if (endpoint.method !== "GET") {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(context);
    }

    beginLoading();
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      return res.json();
    } finally {
      endLoading();
    }
  }

  function unwrapData(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    return [];
  }

  function getViewId(value) {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function updateViewIndicator() {
    const label = state.viewIds.length
      ? `${state.viewIds.length} view(s)`
      : "Select views";
    els.viewsToggle.textContent = `${label} v`;
    els.viewsToggle.setAttribute("aria-label", label);
  }

  function renderViewsList() {
    const validIds = new Set();
    const items = state.views
      .map((v) => {
        const rawId = v.ViewID ?? v.viewID;
        const id = getViewId(rawId);
        if (id === null) {
          return "";
        }
        validIds.add(id);
        const checked = state.viewIds.includes(id) ? "checked" : "";
        const description =
          v.viewDescription ??
          v.ViewDescription ??
          v.viewName ??
          v.ViewName ??
          `View ${id}`;
        return `<label><input type="checkbox" value="${rawId}" ${checked} /> ${description}</label>`;
      })
      .filter(Boolean);

    state.viewIds = state.viewIds.filter((id) => validIds.has(id));
    els.viewsOptions.innerHTML = items.length
      ? items.join("")
      : '<small class="hint">No views available.</small>';
    updateViewIndicator();
  }

  const handleOutsideClick = (event) => {
    if (!els.viewsDropdown.contains(event.target)) {
      setViewsDropdownOpen(false);
    }
  };

  function setViewsDropdownOpen(open) {
    if (open) {
      els.viewsDropdown.classList.add("open");
      document.addEventListener("click", handleOutsideClick);
    } else {
      els.viewsDropdown.classList.remove("open");
      document.removeEventListener("click", handleOutsideClick);
    }
    els.viewsToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  async function loadViews() {
    try {
      setStatus("Loading viewsâ€¦");
      const resp = await callApi("views");
      state.views = unwrapData(resp);
      renderViewsList();
      setStatus("Views loaded.");
      await loadNodeTypesForViews();
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function loadNodeTypesForViews() {
    if (!state.viewIds.length) {
      state.nodeTypes = [];
      renderNodeTypes();
      clearItems(true);
      return;
    }
    try {
      setStatus("Loading node typesâ€¦");
      const resp = await callApi("nodeTypes", { viewIds: state.viewIds });
      state.nodeTypes = unwrapData(resp);
      renderNodeTypes();
      setStatus(`Node types: ${state.nodeTypes.length}`);
      if (els.itemSearch.value) {
        scheduleLoadItems();
      }
    } catch (err) {
      setStatus(err.message);
    }
  }

  function renderNodeTypes() {
    els.nodeType.innerHTML = state.nodeTypes
      .map((nt) => {
        const id = nt.colId ?? nt.ColId ?? "";
        const label = nt.label ?? nt.Label ?? id;
        return `<option value="${id}">${label}</option>`;
      })
      .join("");
  }

  let visibleItems = [];

  function hideSuggestions() {
    if (!els.itemSuggestions) return;
    els.itemSuggestions.classList.remove("show");
    els.itemSuggestions.innerHTML = "";
  }

  function renderItems() {
    if (!els.itemSuggestions) return;
    const query = (els.itemSearch.value || "").trim().toLowerCase();
    const list = query
      ? state.items.filter((item) =>
          (item.text ?? item.Text ?? "").toLowerCase().includes(query)
        )
      : state.items;
    visibleItems = list;
    if (!list.length || !query) {
      hideSuggestions();
      return;
    }

    els.itemSuggestions.innerHTML = list
      .map((item, index) => {
        const id = `${item.id ?? item.Id ?? ""}`;
        const text = item.text ?? item.Text ?? "(no text)";
        const active =
          state.activeItem && state.activeItem.id === id ? "active" : "";
        return `<button type="button" data-index="${index}" class="${active}">${text}</button>`;
      })
      .join("");
    els.itemSuggestions.classList.add("show");
  }

  function clearItems(resetSearch = false) {
    state.items = [];
    state.activeItem = null;
    if (resetSearch && els.itemSearch) {
      els.itemSearch.value = "";
    }
    hideSuggestions();
  }

  let loadItemsTimer = null;

  function scheduleLoadItems() {
    const query = (els.itemSearch.value || "").trim();
    if (!state.viewIds.length || !els.nodeType.value || !query) {
      hideSuggestions();
      return;
    }
    if (loadItemsTimer) {
      clearTimeout(loadItemsTimer);
    }
    loadItemsTimer = window.setTimeout(loadItemsFromServer, 300);
  }

  async function loadItemsFromServer() {
    loadItemsTimer = null;
    const colId = els.nodeType.value;
    if (!colId || !state.viewIds.length) {
      return;
    }
    try {
      setStatus("Loading itemsâ€¦");
      const resp = await callApi("items", {
        viewIds: state.viewIds,
        colId,
        maxCount: defaults.maxItems,
      });
      state.items = unwrapData(resp);
      renderItems();
      setStatus(`Items loaded: ${state.items.length}`);
    } catch (err) {
      setStatus(err.message);
    }
  }

  function renderSelections() {
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

  function getMaxNodes() {
    const value = parseInt(els.maxNodes.value, 10);
    return Number.isFinite(value) ? Math.max(10, value) : defaults.maxNodes;
  }

  let cy = null;
  const expandedNodes = new Set();
  let autoExpandRunning = false;
  let autoExpandGeneration = 0;

  function resetAutoExpandProgress() {
    expandedNodes.clear();
    autoExpandRunning = false;
    if (cy && els.autoExpandToggle?.checked) {
      queueAutoExpand(true);
    }
  }
  async function expandNode({ sourceColId, sourceId, fromDate, toDate }) {
    const resp = await callApi("expand", {
      viewIds: state.viewIds,
      sourceColId,
      sourceId,
      fromDate: fromDate ?? dateDefaults.from,
      toDate: toDate ?? dateDefaults.to,
      maxNodes: getMaxNodes(),
    });
    return unwrapData(resp);
  }

  async function appendExpansionResults(sourceKey, { force = false } = {}) {
    if (!cy) return false;
    if (!force && expandedNodes.has(sourceKey)) return false;
    const parsed = (sourceKey || "").split(":");
    if (parsed.length !== 2) {
      expandedNodes.add(sourceKey);
      return false;
    }
    const [colId, nodeId] = parsed;
    const rows = await expandNode({
      sourceColId: colId,
      sourceId: nodeId,
      fromDate: dateDefaults.from,
      toDate: dateDefaults.to,
    });

    const nodesToAdd = [];
    const edgesToAdd = [];

    rows.forEach((row) => {
      const displayCol = row.displayCol ?? row.DisplayCol ?? "";
      const id = `${row.id ?? row.Id ?? ""}`;
      const text = row.text ?? row.Text ?? "(no text)";
      const label =
        row.edgeLabel ?? row.EdgeLabel ?? row.ed_r_ed ?? row.ED_R_ED ?? "";
      const direction = row.direction ?? row.Direction ?? "";
      const color = row.color ?? row.Color ?? DEFAULT_NODE_COLOR;
      const { sourceArrow, targetArrow } = deriveArrows(direction);

      const targetKey = `${displayCol}:${id}`;

      const existingNode = cy.getElementById(targetKey);
      if (existingNode && existingNode.length) {
        if (!existingNode.data("color") && color) {
          existingNode.data("color", color);
        }
      } else {
        nodesToAdd.push({
          data: {
            id: targetKey,
            type: displayCol,
            label: text,
            color,
            seed: false,
          },
        });
      }

      const edgeIdentifier = `${sourceKey}|${targetKey}|${
        direction || "none"
      }`;
      const forwardEdge = cy.$(
        `edge[source = "${sourceKey}"][target = "${targetKey}"]`
      );
      const reverseEdge = cy.$(
        `edge[source = "${targetKey}"][target = "${sourceKey}"]`
      );
      const existingEdge =
        forwardEdge.length > 0
          ? forwardEdge
          : reverseEdge.length > 0
          ? reverseEdge
          : null;

      if (existingEdge && existingEdge.length) {
        const edgeEle = existingEdge[0];
        if (!edgeEle.data("label") && label) {
          edgeEle.data("label", label);
        }
      } else {
        edgesToAdd.push({
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
      }
    });

    if (nodesToAdd.length) {
      cy.add(nodesToAdd);
    }
    if (edgesToAdd.length) {
      cy.add(edgesToAdd);
    }
    if (nodesToAdd.length || edgesToAdd.length) {
      cy.layout(getLayoutOptions()).run();
    }
    updateLeafVisibility();

    expandedNodes.add(sourceKey);
    return nodesToAdd.length > 0 || edgesToAdd.length > 0;
  }

  function getGraphPalette() {
    return state.theme === "dark"
      ? {
          nodeText: "#0f172a",
          nodeOutline: "#f8faff",
          nodeOutlineWidth: 2,
          nodeBorder: "#0f172a",
          edgeLine: "#ffffff",
          edgeLabel: "#ffffff",
          edgeOutline: "#0b1423",
          edgeOutlineWidth: 2,
        }
      : {
          nodeText: "#0f172a",
          nodeOutline: "#ffffff",
          nodeOutlineWidth: 0,
          nodeBorder: "#0f172a",
          edgeLine: "#1f2937",
          edgeLabel: "#111111",
          edgeOutline: "#ffffff",
          edgeOutlineWidth: 0,
        };
  }

  function buildGraphStyle() {
    const palette = getGraphPalette();
    return [
      {
        selector: "node",
        style: {
          label: "data(label)",
          "text-valign": "center",
          "text-wrap": "wrap",
          "text-max-width": "80px",
          color: palette.nodeText,
          "text-outline-color": palette.nodeOutline,
          "text-outline-width": palette.nodeOutlineWidth,
          "background-color": "data(color)",
          "border-width": 1,
          "border-color": palette.nodeBorder,
          width: 80,
          height: 80,
          "font-size": 12,
        },
      },
      {
        selector: "edge",
        style: {
          "curve-style": "bezier",
          "target-arrow-shape": "data(targetArrow)",
          "source-arrow-shape": "data(sourceArrow)",
          label: "data(label)",
          width: 2,
          "line-color": palette.edgeLine,
          "target-arrow-color": palette.edgeLine,
          "source-arrow-color": palette.edgeLine,
          color: palette.edgeLabel,
          "font-size": 11,
          "text-outline-color": palette.edgeOutline,
          "text-outline-width": palette.edgeOutlineWidth,
        },
      },
      { selector: "node.leaf-hidden", style: { display: "none" } },
      { selector: "edge.leaf-edge-hidden", style: { display: "none" } },
    ];
  }

  function getLayoutOptions() {
    const layoutName = els.layoutSelect?.value || "cose";
    const animate = els.animateToggle ? !!els.animateToggle.checked : true;
    return { name: layoutName, padding: 20, animate };
  }

  function nodeIsSeed(node) {
    return !!node.data("seed");
  }

  function isLeafNode(node) {
    if (!node || nodeIsSeed(node)) return false;
    const degree = node
      .connectedEdges()
      .filter((edge) => {
        const sourceId = edge.source().id();
        const targetId = edge.target().id();
        const nodeId = node.id();
        const isSelfLoop = sourceId === nodeId && targetId === nodeId;
        return !isSelfLoop;
      }).length;
    if (degree === 0) return true;
    return degree <= 1;
  }

  function updateLeafVisibility() {
    if (!cy) return;
    const hide = !!(els.hideLeavesToggle && els.hideLeavesToggle.checked);
    cy.batch(() => {
      cy.nodes().forEach((node) => {
        const shouldHide = hide && isLeafNode(node);
        node.toggleClass("leaf-hidden", shouldHide);
      });
      cy.edges().forEach((edge) => {
        const hideEdge =
          hide &&
          (edge.source().hasClass("leaf-hidden") ||
            edge.target().hasClass("leaf-hidden"));
        edge.toggleClass("leaf-edge-hidden", hideEdge);
      });
    });
  }

  function queueAutoExpand(force = false) {
    if (!els.autoExpandToggle || !els.autoExpandToggle.checked) return;
    if (els.stopExpandToggle?.checked) return;
    if (!cy) return;
    if (autoExpandRunning && !force) return;

    autoExpandGeneration++;
    autoExpandPendingNodes(autoExpandGeneration);
  }

  async function autoExpandPendingNodes(token) {
    if (!cy) return;
    autoExpandRunning = true;
    try {
      setStatus("Auto expanding nodes...");
      while (
        cy &&
        token === autoExpandGeneration &&
        els.autoExpandToggle?.checked &&
        !(els.stopExpandToggle && els.stopExpandToggle.checked)
      ) {
        const nextNode = cy
          .nodes()
          .toArray()
          .find((n) => !expandedNodes.has(n.id()));
        if (!nextNode) break;
        await appendExpansionResults(nextNode.id());
      }
      if (token === autoExpandGeneration) {
        setStatus("Auto expand complete.");
      }
    } catch (err) {
      if (token === autoExpandGeneration) {
        setStatus(err.message);
      }
    } finally {
      if (token === autoExpandGeneration) {
        autoExpandRunning = false;
      }
    }
  }

  function renderGraph(nodes, edges) {
    const style = buildGraphStyle();

    const layoutOptions = getLayoutOptions();

    if (!cy) {
      cy = cytoscape({
        container: els.graph,
        elements: { nodes, edges },
        layout: layoutOptions,
        style,
      });
    } else {
      cy.elements().remove();
      cy.add(nodes).add(edges);
      cy.style(style);
      cy.layout(layoutOptions).run();
    }

    updateLeafVisibility();

    cy.removeListener("tap", "node");
    cy.on("tap", "node", async (event) => {
      if (els.stopExpandToggle && els.stopExpandToggle.checked) {
        return;
      }
      const tapped = event.target;
      if (!tapped || !tapped.id()) return;
      setStatus("Expanding node...");
      try {
        await appendExpansionResults(tapped.id(), { force: true });
        queueAutoExpand();
        setGraphReadyState(true);
        setStatus("Node expanded.");
      } catch (err) {
        setStatus(err.message);
      }
    });
  }

  els.language.onchange = () => {
    state.language = els.language.value;
    applyLanguageChrome();
    clearItems(true);
    loadViews();
  };

  els.viewsToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = els.viewsDropdown.classList.contains("open");
    setViewsDropdownOpen(!isOpen);
  });

  els.viewsOptions.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  els.viewsOptions.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const id = getViewId(target.value);
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
    updateViewIndicator();
    clearItems(true);
    loadNodeTypesForViews();
    if (els.itemSearch.value) {
      scheduleLoadItems();
    }
    if (cy && els.autoExpandToggle?.checked) {
      resetAutoExpandProgress();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setViewsDropdownOpen(false);
    }
  });

  els.nodeType.addEventListener("change", () => {
    clearItems(false);
    if (els.itemSearch.value) {
      scheduleLoadItems();
    }
  });

  els.itemSearch.addEventListener("input", () => {
    renderItems();
    scheduleLoadItems();
  });

  if (els.itemSuggestions) {
    els.itemSuggestions.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-index]");
      if (!button) {
        return;
      }
      const index = Number(button.dataset.index);
      const item = visibleItems[index];
      if (!item) {
        return;
      }
      state.activeItem = {
        id: `${item.id ?? item.Id ?? ""}`,
        text: item.text ?? item.Text ?? "(no text)",
      };
      els.itemSearch.value = state.activeItem.text;
      hideSuggestions();
    });
  }

  document.addEventListener("click", (event) => {
    if (!els.itemSuggestions) return;
    if (
      !els.itemSuggestions.contains(event.target) &&
      event.target !== els.itemSearch
    ) {
      hideSuggestions();
    }
  });

  els.addSelected.onclick = () => {
    const colId = els.nodeType.value;
    const colLabel =
      els.nodeType.options[els.nodeType.selectedIndex]?.textContent ?? colId;
    if (!colId) {
      setStatus("Pick an entity first.");
      return;
    }

    if (!state.activeItem) {
      setStatus("Choose an item from the suggestions.");
      return;
    }

    const fromDate = (els.fromDate.value || "").trim();
    const toDate = (els.toDate.value || "").trim();

    const duplicate = state.selected.some(
      (entry) => entry.colId === colId && entry.id === state.activeItem.id
    );

    if (duplicate) {
      setStatus("This item is already in the list.");
      return;
    }

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
    els.itemSearch.value = "";
    hideSuggestions();
    renderSelections();
  };

  const setGraphReadyState = (hasGraph) => {
    document.body.classList.toggle("graph-ready", hasGraph);
    if (els.clearGraph) {
      els.clearGraph.style.display = hasGraph ? "block" : "none";
    }
    updateGraphPadding();
  };

  function updateGraphPadding() {
    if (!els.graph) return;
    els.graph.style.marginLeft = "0";
    els.graph.style.marginRight = "0";
  }

  els.clearGraph.onclick = () => {
    if (cy) {
      cy.elements().remove();
      cy = null;
    }
    expandedNodes.clear();
    autoExpandRunning = false;
    state.selected = [];
    renderSelections();
    setGraphReadyState(false);
    setStatus("Graph cleared.");
  };

  const refreshGraphLayout = () => {
    if (!cy) return;
    const layoutName = els.layoutSelect?.value || defaults.defaultLayout;
    const animate = els.animateToggle
      ? !!els.animateToggle.checked
      : defaults.animateLayout;
    cy.layout({ name: layoutName, padding: 20, animate }).run();
  };

  els.layoutSelect?.addEventListener("change", refreshGraphLayout);
  els.animateToggle?.addEventListener("change", refreshGraphLayout);

  els.hideLeavesToggle?.addEventListener("change", () => {
    updateLeafVisibility();
  });

  els.autoExpandToggle?.addEventListener("change", () => {
    if (els.autoExpandToggle.checked) {
      resetAutoExpandProgress();
    } else {
      autoExpandGeneration++;
      autoExpandRunning = false;
    }
  });

  els.themeSelect?.addEventListener("change", () => {
    state.theme = els.themeSelect.value;
    document.body.dataset.theme = state.theme;
    if (cy) {
      cy.style(buildGraphStyle());
    }
  });

  els.exportPng?.addEventListener("click", () => {
    if (!cy) return;
    const png = cy.png({ full: true, scale: 2 });
    const link = document.createElement("a");
    link.href = png;
    link.download = `graph-${Date.now()}.png`;
    link.click();
  });

  els.showGraph.onclick = async () => {
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
      expandedNodes.clear();

      const nodes = new Map();
      const edges = new Map();
      const edgePairMap = new Map();
      const nodeKey = (colId, id) => `${colId}:${id}`;
      const edgeKey = (src, tgt) => `${src}|${tgt}`;
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
        const resp = await callApi("expand", {
          viewIds: state.viewIds,
          sourceColId: sel.colId,
          sourceId: sel.id,
          fromDate: sel.resolvedFromDate ?? dateDefaults.from,
          toDate: sel.resolvedToDate ?? dateDefaults.to,
          maxNodes: getMaxNodes(),
        });
        const rows = unwrapData(resp);

        rows.forEach((row) => {
          const displayCol = row.displayCol ?? row.DisplayCol ?? "";
          const id = `${row.id ?? row.Id ?? ""}`;
          const text = row.text ?? row.Text ?? "(no text)";
          const label =
            row.edgeLabel ?? row.EdgeLabel ?? row.ed_r_ed ?? row.ED_R_ED ?? "";
          const direction = row.direction ?? row.Direction ?? "";
          const color = row.color ?? row.Color ?? DEFAULT_NODE_COLOR;
          const { sourceArrow, targetArrow } = deriveArrows(direction);

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

        expandedNodes.add(nodeKey(sel.colId, sel.id));
      }

      renderGraph(Array.from(nodes.values()), Array.from(edges.values()));
      setGraphReadyState(true);
      setStatus(`Graph ready. Nodes: ${nodes.size}, Edges: ${edges.size}`);
      if (defaults.autoCollapse) {
        filtersCollapsed = true;
        updateFilterPanel();
      }
      queueAutoExpand();
    } catch (err) {
      setStatus(err.message);
    }
  };

  applyLanguageChrome();
  renderSelections();
  loadViews();
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
