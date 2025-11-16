(function (window) {
  const GraphApp = (window.GraphApp = window.GraphApp || {});

  GraphApp.createDataModule = function ({
    APP_CONFIG,
    state,
    els,
    defaults,
    setStatus,
    translate,
    beginLoading,
    endLoading,
  }) {
    let visibleItems = [];
    let loadItemsTimer = null;
    let outsideClickHandler = null;

    function hideSuggestions() {
      if (!els.itemSuggestions) return;
      els.itemSuggestions.classList.remove("show");
      els.itemSuggestions.innerHTML = "";
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
        ? `${translate("filtersSelectedPrefix")} ${state.viewIds.length} ${translate(
            "filtersSelectedSuffix"
          )}`
        : translate("filtersSelectViews");
      if (els.viewsToggleLabel) {
        els.viewsToggleLabel.textContent = label;
      } else if (els.viewsToggle) {
        els.viewsToggle.textContent = `${label} v`;
      }
      if (els.viewsToggle) {
        els.viewsToggle.setAttribute("aria-label", label);
      }
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
            `${translate("viewPrefix")} ${id}`;
          return `<label><input type="checkbox" value="${rawId}" ${checked} /> ${description}</label>`;
        })
        .filter(Boolean);

      state.viewIds = state.viewIds.filter((id) => validIds.has(id));
      if (els.viewsOptions) {
        els.viewsOptions.innerHTML = items.length
          ? items.join("")
          : `<small class="hint">${translate("noViews")}</small>`;
      }
      updateViewIndicator();
    }

    function handleOutsideClick(event) {
      if (!els.viewsDropdown || els.viewsDropdown.contains(event.target)) {
        return;
      }
      setViewsDropdownOpen(false);
    }

    function setViewsDropdownOpen(open) {
      if (!els.viewsDropdown || !els.viewsToggle) return;
      if (open) {
        els.viewsDropdown.classList.add("open");
        if (!outsideClickHandler) {
          outsideClickHandler = handleOutsideClick;
          document.addEventListener("click", outsideClickHandler);
        }
      } else {
        els.viewsDropdown.classList.remove("open");
        if (outsideClickHandler) {
          document.removeEventListener("click", outsideClickHandler);
          outsideClickHandler = null;
        }
      }
      els.viewsToggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    async function loadViews() {
      try {
        setStatus(translate("statusLoadingViews"));
        const resp = await callApi("views");
        state.views = unwrapData(resp);
        renderViewsList();
        setStatus(translate("statusViewsLoaded"));
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
        setStatus(translate("statusLoadingNodeTypes"));
        const resp = await callApi("nodeTypes", { viewIds: state.viewIds });
        state.nodeTypes = unwrapData(resp);
        renderNodeTypes();
        setStatus(`${translate("statusNodeTypes")}: ${state.nodeTypes.length}`);
        if (els.itemSearch?.value) {
          scheduleLoadItems();
        }
      } catch (err) {
        setStatus(err.message);
      }
    }

    async function loadLegendsForViews({ onlyActive = true } = {}) {
      if (!state.viewIds.length) {
        state.legends = [];
        return state.legends;
      }
      try {
        setStatus(translate("statusLoadingLegends"));
        const resp = await callApi("legends", {
          viewIds: state.viewIds,
          onlyActive,
        });
        state.legends = unwrapData(resp);
        setStatus(`${translate("statusLegendsLoaded")}: ${state.legends.length}`);
        return state.legends;
      } catch (err) {
        state.legends = [];
        setStatus(err.message);
        return state.legends;
      }
    }

    function renderNodeTypes() {
      if (!els.nodeType) return;
      els.nodeType.innerHTML = state.nodeTypes
        .map((nt) => {
          const id = nt.colId ?? nt.ColId ?? "";
          const label = nt.label ?? nt.Label ?? id;
          return `<option value="${id}">${label}</option>`;
        })
        .join("");
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
          const text =
            item.text ?? item.Text ?? translate("noText");
          const active =
            state.activeItem &&
            state.activeItem.id === `${item.id ?? item.Id ?? ""}`
              ? "active"
              : "";
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

    function scheduleLoadItems() {
      const query = (els.itemSearch.value || "").trim();
      if (!state.viewIds.length || !els.nodeType?.value || !query) {
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
      const colId = els.nodeType?.value;
      if (!colId || !state.viewIds.length) {
        return;
      }
      try {
        setStatus(translate("statusLoadingItems"));
        const resp = await callApi("items", {
          viewIds: state.viewIds,
          colId,
          maxCount: defaults.maxItems,
        });
        state.items = unwrapData(resp);
        renderItems();
        setStatus(`${translate("statusItemsLoaded")}: ${state.items.length}`);
      } catch (err) {
        setStatus(err.message);
      }
    }

    return {
      callApi,
      unwrapData,
      getViewId,
      updateViewIndicator,
      renderViewsList,
      setViewsDropdownOpen,
      handleOutsideClick,
      loadViews,
      loadNodeTypesForViews,
      loadLegendsForViews,
      renderNodeTypes,
      renderItems,
      clearItems,
      scheduleLoadItems,
      loadItemsFromServer,
      hideSuggestions,
      getVisibleItems: () => visibleItems,
    };
  };
})(window);
