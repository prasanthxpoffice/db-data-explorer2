const DEFAULT_NODE_COLOR = "#87cefa";
const DEFAULT_DATE_SENTINELS = new Set(["1900-01-01", "2100-12-31"]);

function escapeHtml(val = "") {
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeDateValue(value) {
  if (!value) return null;
  const text =
    value instanceof Date && !Number.isNaN(value.getTime())
      ? value.toISOString().slice(0, 10)
      : String(value).slice(0, 10);
  return DEFAULT_DATE_SENTINELS.has(text) ? null : text;
}

function directionSymbol(directionRaw) {
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
}

function pickMetaValue(meta, ...keys) {
  if (!meta) return undefined;
  for (const key of keys) {
    if (key in meta && meta[key] !== undefined && meta[key] !== null) {
      return meta[key];
    }
    if (typeof key !== "string") continue;
    const lower = key.charAt(0).toLowerCase() + key.slice(1);
    if (lower in meta && meta[lower] !== undefined && meta[lower] !== null) {
      return meta[lower];
    }
    const upper = key.charAt(0).toUpperCase() + key.slice(1);
    if (upper in meta && meta[upper] !== undefined && meta[upper] !== null) {
      return meta[upper];
    }
  }
  return undefined;
}

function initCollapsiblePanel({ panel, toggleButton, chevron, onToggle }) {
  if (!panel) return null;
  let collapsed = false;

  const applyState = () => {
    panel.classList.toggle("collapsed", collapsed);
    if (chevron) {
      chevron.textContent = collapsed ? ">" : "v";
    }
    onToggle?.(collapsed);
  };

  const toggle = () => {
    collapsed = !collapsed;
    applyState();
  };

  if (toggleButton) {
    toggleButton.addEventListener("click", toggle);
  }

  if (chevron && (!toggleButton || !toggleButton.contains(chevron))) {
    chevron.addEventListener("click", (event) => {
      event.stopPropagation();
      toggle();
    });
  }

  applyState();

  return {
    toggle,
    setCollapsed(next) {
      const shouldCollapse = !!next;
      if (shouldCollapse === collapsed) return;
      collapsed = shouldCollapse;
      applyState();
    },
    isCollapsed: () => collapsed,
  };
}

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
    autoExpandDepth: APP_CONFIG.defaults?.autoExpandDepth ?? 1,
    autoExpandMinDepth: APP_CONFIG.defaults?.autoExpandMinDepth ?? 1,
    autoExpandMaxDepth: APP_CONFIG.defaults?.autoExpandMaxDepth ?? 5,
  };

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
    legends: [],
    legendControls: Object.create(null),
    lastLegendsViewKey: "",
    selected: [],
    activeItem: null,
    theme: defaults.theme,
    autoExpandDepth: defaults.autoExpandDepth,
    showLanguageSelector:
      APP_CONFIG.showLanguageSelector !== false,
    showTimelineButton: APP_CONFIG.showTimelineButton !== false,
  };
  const translations = window.TRANSLATIONS || {};
  const ensureTranslations = (lang, entries) => {
    translations[lang] = translations[lang] || {};
    Object.entries(entries).forEach(([key, value]) => {
      if (!(key in translations[lang])) {
        translations[lang][key] = value;
      }
    });
  };

  ensureTranslations("en", {
    timelineRecordLabel: "Record timeline",
    timelineRecordHint:
      "Enable to capture each change (may impact performance).",
    timelineRecordStart: "Recording enabled",
  });
  ensureTranslations("ar", {
    timelineRecordLabel: "تسجيل المسار الزمني",
    timelineRecordHint: "فعّل الخيار لتسجيل كل تغيير (قد يؤثر على الأداء).",
    timelineRecordStart: "تم تشغيل التسجيل",
  });

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
    legendsPanel: document.getElementById("legendsPanel"),
    toggleLegends: document.getElementById("toggleLegends"),
    legendsChevron: document.getElementById("legendsChevron"),
    legendsTable: document.getElementById("legendsTable"),
    legendsTableBody: document.getElementById("legendsTableBody"),
    legendsEmpty: document.getElementById("legendsEmpty"),
    pathPanel: document.getElementById("pathPanel"),
    togglePath: document.getElementById("togglePath"),
    pathChevron: document.getElementById("pathChevron"),
    pathAdd: document.getElementById("pathAdd"),
    pathReset: document.getElementById("pathReset"),
    pathList: document.getElementById("pathList"),
    pathStartDisplay: document.getElementById("pathStartDisplay"),
    pathEndDisplay: document.getElementById("pathEndDisplay"),
    pathStartLabel: document.getElementById("pathStartLabel"),
    pathEndLabel: document.getElementById("pathEndLabel"),
    timelinePanel: document.getElementById("timelinePanel"),
    toggleTimeline: document.getElementById("toggleTimeline"),
    timelineChevron: document.getElementById("timelineChevron"),
    timelineSlider: document.getElementById("timelineSlider"),
    timelineStepLabel: document.getElementById("timelineStepLabel"),
    timelineLog: document.getElementById("timelineLog"),
    timelineClearFuture: document.getElementById("timelineClearFuture"),
    timelineRecordToggle: document.getElementById("timelineRecordToggle"),
    viewsToggleLabel: document.getElementById("viewsToggleLabel"),
    layoutSelect: document.getElementById("layoutSelect"),
    animateToggle: document.getElementById("animateToggle"),
    stopExpandToggle: document.getElementById("stopExpandToggle"),
    hideLeavesToggle: document.getElementById("hideLeavesToggle"),
    autoExpandToggle: document.getElementById("autoExpandToggle"),
    autoExpandDepth: document.getElementById("autoExpandDepth"),
    themeSelect: document.getElementById("themeSelect"),
    exportPng: document.getElementById("exportPng"),
    loadingOverlay: document.getElementById("loading-overlay"),
    masterSettingsButton: document.getElementById("masterSettingsButton"),
    masterSettingsOverlay: document.getElementById("masterSettingsOverlay"),
    masterSettingsClose: document.getElementById("masterSettingsClose"),
    masterSettingsDialog: document.querySelector(".master-settings-dialog"),
    masterSettingsLegendsBody: document.getElementById("masterSettingsLegendsBody"),
    masterSettingsLegendsStatus: document.getElementById("masterSettingsLegendsStatus"),
    masterSettingsLegendsEmpty: document.getElementById("masterSettingsLegendsEmpty"),
    masterSettingsLegendsRefresh: document.getElementById("masterSettingsLegendsRefresh"),
    masterSettingsRelationsBody: document.getElementById("masterSettingsRelationsBody"),
    masterSettingsRelationsStatus: document.getElementById("masterSettingsRelationsStatus"),
    masterSettingsRelationsEmpty: document.getElementById("masterSettingsRelationsEmpty"),
    masterSettingsRelationsRefresh: document.getElementById("masterSettingsRelationsRefresh"),
    masterSettingsRelationsAdd: document.getElementById("masterSettingsRelationsAdd"),
    root: rootEl,
  };

  const floatingPanels = {
    filters: document.getElementById("filter-panel-root"),
    settings: document.getElementById("settings-panel-root"),
    legends: document.getElementById("legends-panel-root"),
    info: document.getElementById("info-panel-root"),
    path: document.getElementById("path-panel-root"),
    timeline: document.getElementById("timeline-panel-root"),
  };
  const floatingButtons = Array.from(
    document.querySelectorAll(".panel-trigger")
  );
  let activeFloatingPanel = null;
  let pathModule = null;
  let timelineModule = null;
  let timelineRecordingEnabled = false;
  const pinnedPanels = new Set();

  const infoPanelEls = {
    content: null,
    hydrated: false,
  };
  const isPanelPinned = (name) => pinnedPanels.has(name);
  const setPanelPinned = (name, pinned) => {
    if (!floatingPanels[name]) return;
    if (pinned) {
      pinnedPanels.add(name);
    } else {
      pinnedPanels.delete(name);
    }
    applyPanelState();
  };
  function hydrateInfoPanel() {
    infoPanelEls.content = document.getElementById("infoContent");
    infoPanelEls.hydrated = !!infoPanelEls.content;
    return infoPanelEls.hydrated;
  }
  const defaultInfoHtml = () => `<p>${translate("infoPrompt")}</p>`;
  const infoPanel = window.GraphApp.createInfoPanel({
    infoPanelEls,
    hydrate: hydrateInfoPanel,
    defaultInfoHtml,
    translate,
    directionSymbol,
    pickMetaValue,
    escapeHtml,
    normalizeDateValue,
    getEntityLabel,
    defaultNodeColor: DEFAULT_NODE_COLOR,
  });
  const handleNodeSelection = (payload) => {
    infoPanel.renderNodeInfo(payload);
    pathModule?.onNodeTap?.(payload);
  };

  const isTimelineRecording = () =>
    timelineRecordingEnabled && !!timelineModule;

  const recordTimelineSnapshot = (type, labelText) => {
    if (!isTimelineRecording()) return;
    const snapshot = graph.getElementsSnapshot();
    if (!snapshot.nodes.length && !snapshot.edges.length) return;
    const payload = {
      label: labelText,
      nodes: snapshot.nodes,
      edges: snapshot.edges,
    };
    if (type === "reset") {
      timelineModule.recordReset(payload);
    } else {
      timelineModule.recordAppend(payload);
    }
  };

  const handleElementsAdded = (payload) => {
    if (!isTimelineRecording()) return;
    const labelBase =
      payload.reason === "autoExpand"
        ? translate("timelineAutoExpandStep")
        : translate("timelineExpandStep");
    const detail = payload.sourceId ? ` (${payload.sourceId})` : "";
    recordTimelineSnapshot("append", `${labelBase}${detail}`);
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


  hydrateInfoPanel();
  infoPanel.reset();

  const setStatus = (msg) => {
    if (els.status) {
      els.status.textContent = msg;
    }
  };

  if (els.language) {
    els.language.value = state.language;
    const languageSection = els.language.closest(".panel-section");
    const hidden = state.showLanguageSelector === false;
    if (languageSection) {
      languageSection.classList.toggle("hidden", hidden);
    }
    if (hidden) {
      els.language.setAttribute("aria-hidden", "true");
      els.language.setAttribute("tabindex", "-1");
    } else {
      els.language.removeAttribute("aria-hidden");
      els.language.removeAttribute("tabindex");
    }
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
  const buildAutoExpandOptions = () => {
    if (!els.autoExpandDepth) return;
    const min = defaults.autoExpandMinDepth ?? 1;
    const max = defaults.autoExpandMaxDepth ?? 5;
    const clampedMin = Number.isFinite(min) ? Math.max(1, Math.floor(min)) : 1;
    const clampedMax = Number.isFinite(max)
      ? Math.max(clampedMin, Math.floor(max))
      : Math.max(clampedMin, 5);
    const options = [];
    for (let i = clampedMin; i <= clampedMax; i += 1) {
      const selected = i === state.autoExpandDepth ? "selected" : "";
      options.push(`<option value="${i}" ${selected}>${i}</option>`);
    }
    els.autoExpandDepth.innerHTML = options.join("");
    if (!options.some((opt) => opt.includes('value="' + state.autoExpandDepth + '"'))) {
      state.autoExpandDepth = clampedMin;
    }
  };
  buildAutoExpandOptions();
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
    DEFAULT_NODE_COLOR,
    setStatus,
    translate,
    callApi: data.callApi,
    unwrapData: data.unwrapData,
    getMaxNodes,
    getAutoExpandDepth: () => state.autoExpandDepth,
    getLegendFilters: getLegendFiltersPayload,
    onNodeSelected: handleNodeSelection,
    onEdgeSelected: infoPanel.renderEdgeInfo,
    onGraphCleared: infoPanel.reset,
    onElementsAdded: handleElementsAdded,
  });

  pathModule =
    window.GraphApp.createPathModule({
      els: {
        root: document.getElementById("pathPanel"),
        addBtn: document.getElementById("pathAdd"),
        resetBtn: document.getElementById("pathReset"),
        list: document.getElementById("pathList"),
        startDisplay: document.getElementById("pathStartDisplay"),
        endDisplay: document.getElementById("pathEndDisplay"),
        startLabel: document.getElementById("pathStartLabel"),
        endLabel: document.getElementById("pathEndLabel"),
      },
      translate,
      setStatus,
      getCy: () => window.cy || null,
    }) || null;

  timelineModule =
    window.GraphApp.createTimelineModule({
      els: {
        root: document.getElementById("timelinePanel"),
        slider: document.getElementById("timelineSlider"),
        stepLabel: document.getElementById("timelineStepLabel"),
        log: document.getElementById("timelineLog"),
        clearBtn: document.getElementById("timelineClearFuture"),
      },
      translate,
      setStatus,
      applySnapshot: (nodes, edges) => {
        graph.replaceElements(nodes, edges, {
          resetState: false,
          applyLayout: true,
        });
      },
      onApplied: () => {
        infoPanel.reset();
        pathModule?.onGraphCleared?.();
      },
    }) || null;

  const masterSettingsTabs = Array.from(
    document.querySelectorAll(".master-settings-tab")
  );
  const masterSettingsPanels = Array.from(
    document.querySelectorAll(".master-settings-panel")
  );
  const masterSettingsState = {
    legends: [],
    legendsLoaded: false,
    legendsLoading: false,
  };
  let masterSettingsLegendsPromise = null;
  const masterSettingsRelationsState = {
    relations: [],
    loaded: false,
    loading: false,
  };
  const DIRECTION_OPTIONS = ["->", "<-", "<->"];
  const HEX_COLOR_REGEX = /^#([0-9a-f]{6})$/i;
  const HEX_COLOR_SHORT_REGEX = /^#([0-9a-f]{3})$/i;

  function normalizeLegendColor(value) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (HEX_COLOR_REGEX.test(trimmed)) {
        return trimmed;
      }
      const short = HEX_COLOR_SHORT_REGEX.exec(trimmed);
      if (short) {
        const [r, g, b] = short[1].split("");
        return `#${r}${r}${g}${g}${b}${b}`;
      }
    }
    return DEFAULT_NODE_COLOR;
  }

  function setMasterSettingsLegendsStatus(message, isError = false) {
    if (!els.masterSettingsLegendsStatus) return;
    els.masterSettingsLegendsStatus.textContent = message;
    els.masterSettingsLegendsStatus.classList.toggle("error", isError);
  }

  function refreshMasterSettingsLegendsSummary() {
    if (masterSettingsState.legendsLoading) {
      setMasterSettingsLegendsStatus(translate("masterSettingsLegendsLoading"));
      return;
    }
    if (!masterSettingsState.legendsLoaded) {
      setMasterSettingsLegendsStatus(
        translate("masterSettingsLegendsStatusIdle")
      );
      return;
    }
    if (masterSettingsState.legends.length) {
      setMasterSettingsLegendsStatus(
        `${masterSettingsState.legends.length} ${translate("legendsTitle")}`
      );
    } else {
      setMasterSettingsLegendsStatus(
        translate("masterSettingsLegendsEmpty")
      );
    }
  }

  function getRecordField(item, ...keys) {
    if (!item) return "";
    for (const key of keys) {
      if (key in item && item[key] !== undefined && item[key] !== null) {
        return item[key];
      }
      const lower = key.toLowerCase();
      if (lower in item && item[lower] !== undefined && item[lower] !== null) {
        return item[lower];
      }
    }
    return "";
  }

  function toBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const trimmed = value.trim().toLowerCase();
      return trimmed === "1" || trimmed === "true" || trimmed === "yes";
    }
    return false;
  }

  function getNodeDisplayLabel(node) {
    const id = `${getRecordField(node, "Column_ID", "ColumnId")}`.trim();
    if (!id) return "";
    const en = getRecordField(node, "ColumnEn", "columnEn");
    const ar = getRecordField(node, "ColumnAr", "columnAr");
    const preferArabic = state.language === "ar";
    const label = preferArabic ? ar || en || id : en || ar || id;
    return label && label !== id ? `${label} (${id})` : id;
  }

  function buildNodeOptions(selectedId) {
    const selected = (selectedId || "").trim();
    const selectedLower = selected.toLowerCase();
    const placeholder = `<option value="">${escapeHtml(
      translate("masterSettingsRelationsSelectColumn")
    )}</option>`;
    let hasSelectedOption = false;
    const options = masterSettingsState.legends
      .map((node) => {
        const id = `${getRecordField(node, "Column_ID", "ColumnId")}`.trim();
        if (!id) return "";
        const label = getNodeDisplayLabel(node);
        const isSelected = !!selected && id.toLowerCase() === selectedLower;
        if (isSelected) {
          hasSelectedOption = true;
        }
        return `<option value="${escapeHtml(id)}" ${
          isSelected ? "selected" : ""
        }>${escapeHtml(label)}</option>`;
      })
      .filter(Boolean);
    if (selected && !hasSelectedOption) {
      options.unshift(
        `<option value="${escapeHtml(selected)}" selected>${escapeHtml(
          selected
        )}</option>`
      );
    }
    return [placeholder, ...options].join("");
  }

  function buildNodeSelect(name, selectedId) {
    return `<select name="${name}">${buildNodeOptions(selectedId)}</select>`;
  }
  function renderMasterSettingsLegends() {
    if (!els.masterSettingsLegendsBody) return;
    const rows = masterSettingsState.legends
      .map((legend) => {
        const columnId = `${getRecordField(
          legend,
          "Column_ID",
          "ColumnId",
          "column_id",
          "columnId"
        )}`.trim();
        if (!columnId) {
          return "";
        }
        const columnEn = getRecordField(legend, "ColumnEn", "columnEn");
        const columnAr = getRecordField(legend, "ColumnAr", "columnAr");
        const color = normalizeLegendColor(
          getRecordField(legend, "ColumnColor", "columnColor")
        );
        const isActive = toBoolean(getRecordField(legend, "IsActive", "isActive"));
        const updateLabel = translate("masterSettingsLegendsUpdate");
        return `
          <tr class="master-settings-legends-row" data-column-id="${escapeHtml(
            columnId
          )}">
            <td><code>${escapeHtml(columnId)}</code></td>
            <td>
              <input type="text" name="columnEn" value="${escapeHtml(
                columnEn || ""
              )}" />
            </td>
            <td>
              <input type="text" name="columnAr" value="${escapeHtml(
                columnAr || ""
              )}" />
            </td>
            <td class="color-cell">
              <input type="color" name="columnColor" value="${color}" />
            </td>
            <td class="checkbox-cell">
              <input type="checkbox" name="isActive" ${
                isActive ? "checked" : ""
              } aria-label="${translate("masterSettingsLegendActive")}" />
            </td>
            <td class="actions-cell">
              <button type="button" data-action="save">${escapeHtml(
                updateLabel
              )}</button>
            </td>
          </tr>
        `;
      })
      .filter(Boolean);

    if (!rows.length) {
      els.masterSettingsLegendsBody.innerHTML = `<tr><td colspan="6">${escapeHtml(
        translate("masterSettingsLegendsEmpty")
      )}</td></tr>`;
      if (els.masterSettingsLegendsEmpty) {
        els.masterSettingsLegendsEmpty.hidden = false;
      }
      return;
    }

    els.masterSettingsLegendsBody.innerHTML = rows.join("");
    if (els.masterSettingsLegendsEmpty) {
      els.masterSettingsLegendsEmpty.hidden = true;
    }
  }

  async function loadMasterSettingsLegends(force = false) {
    if (!els.masterSettingsLegendsBody) return;
    if (!force && masterSettingsState.legendsLoaded) return;
    if (masterSettingsState.legendsLoading) {
      await masterSettingsLegendsPromise;
      if (!force || masterSettingsState.legendsLoaded) {
        return;
      }
    }
    masterSettingsState.legendsLoading = true;
    setMasterSettingsLegendsStatus(translate("masterSettingsLegendsLoading"));
    const request = (async () => {
      try {
        const response = await data.callApi("masterNodes");
        const payload = data.unwrapData(response);
        masterSettingsState.legends = Array.isArray(payload) ? payload : [];
        masterSettingsState.legendsLoaded = true;
        renderMasterSettingsLegends();
        renderMasterSettingsRelations();
        refreshMasterSettingsLegendsSummary();
      } catch (err) {
        setMasterSettingsLegendsStatus(err.message, true);
      } finally {
        masterSettingsState.legendsLoading = false;
        masterSettingsLegendsPromise = null;
      }
    })();
    masterSettingsLegendsPromise = request;
    await request;
  }

  function collectLegendRowData(row) {
    if (!row) return null;
    const columnId = row.dataset.columnId;
    if (!columnId) return null;
    const columnEn = row.querySelector('input[name="columnEn"]')?.value ?? "";
    const columnAr = row.querySelector('input[name="columnAr"]')?.value ?? "";
    const columnColor =
      row.querySelector('input[name="columnColor"]')?.value ?? DEFAULT_NODE_COLOR;
    const isActive = row.querySelector('input[name="isActive"]')?.checked ?? false;
    return {
      Column_ID: columnId,
      ColumnEn: columnEn,
      ColumnAr: columnAr,
      ColumnColor: columnColor,
      IsActive: isActive,
    };
  }

  function updateLegendState(columnId, patch) {
    const target = masterSettingsState.legends.find((legend) => {
      const id = `${getRecordField(
        legend,
        "Column_ID",
        "ColumnId",
        "column_id",
        "columnId"
      )}`.trim();
      return id === columnId;
    });
    if (!target) return;
    Object.assign(target, patch);
    renderMasterSettingsRelations();
  }

  async function saveLegendRow(row, button) {
    const payload = collectLegendRowData(row);
    if (!payload) return;
    row.classList.add("saving");
    row.classList.remove("error");
    button.disabled = true;
    setMasterSettingsLegendsStatus(translate("masterSettingsLegendsLoading"));
    try {
      await data.callApi("updateMasterNode", payload);
      updateLegendState(payload.Column_ID, payload);
      row.classList.remove("dirty");
      setMasterSettingsLegendsStatus(translate("masterSettingsLegendsUpdated"));
    } catch (err) {
      row.classList.add("error");
      setMasterSettingsLegendsStatus(err.message, true);
    } finally {
      row.classList.remove("saving");
      button.disabled = false;
    }
  }

  function markLegendRowDirty(event) {
    if (!(event.target instanceof Element)) return;
    const row = event.target.closest(".master-settings-legends-row");
    if (!row) return;
    row.classList.add("dirty");
  }

  const setMasterSettingsTab = (tabName) => {
    if (!masterSettingsTabs.length) return;
    const targetTab =
      tabName ||
      masterSettingsTabs.find((tab) => tab.classList.contains("active"))
        ?.dataset.masterTab ||
      masterSettingsTabs[0]?.dataset.masterTab;
    if (!targetTab) return;
    masterSettingsTabs.forEach((tab) => {
      const isActive = tab.dataset.masterTab === targetTab;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
    });
    masterSettingsPanels.forEach((panel) => {
      const isActive = panel.dataset.masterPanel === targetTab;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
    });
    if (els.masterSettingsDialog) {
      const isEntities = targetTab === "entities";
      els.masterSettingsDialog.classList.toggle("wide", isEntities);
    }
    if (targetTab === "legends") {
      loadMasterSettingsLegends();
    } else if (targetTab === "entities") {
      loadMasterSettingsLegends();
      loadMasterSettingsRelations();
    }
  };

  const openMasterSettings = () => {
    if (!els.masterSettingsOverlay) return;
    setMasterSettingsTab();
    els.masterSettingsOverlay.classList.add("open");
    els.masterSettingsOverlay.setAttribute("aria-hidden", "false");
  };

  const closeMasterSettings = () => {
    if (!els.masterSettingsOverlay) return;
    els.masterSettingsOverlay.classList.remove("open");
    els.masterSettingsOverlay.setAttribute("aria-hidden", "true");
  };

  els.masterSettingsButton?.addEventListener("click", (event) => {
    event.preventDefault();
    openMasterSettings();
  });

  els.masterSettingsClose?.addEventListener("click", () => {
    closeMasterSettings();
  });

  els.masterSettingsOverlay?.addEventListener("click", (event) => {
    if (event.target === els.masterSettingsOverlay) {
      closeMasterSettings();
    }
  });

  masterSettingsTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setMasterSettingsTab(tab.dataset.masterTab);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      els.masterSettingsOverlay?.classList.contains("open")
    ) {
      closeMasterSettings();
    }
  });

  els.masterSettingsLegendsRefresh?.addEventListener("click", () => {
    loadMasterSettingsLegends(true);
  });

  els.masterSettingsLegendsBody?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button[data-action='save']");
    if (!button) return;
    const row = button.closest(".master-settings-legends-row");
    if (!row) return;
    saveLegendRow(row, button);
  });

  els.masterSettingsLegendsBody?.addEventListener("input", markLegendRowDirty);
  els.masterSettingsLegendsBody?.addEventListener("change", markLegendRowDirty);

  function setMasterSettingsRelationsStatus(message, isError = false) {
    if (!els.masterSettingsRelationsStatus) return;
    els.masterSettingsRelationsStatus.textContent = message;
    els.masterSettingsRelationsStatus.classList.toggle("error", isError);
  }

  function refreshMasterSettingsRelationsSummary() {
    if (masterSettingsRelationsState.loading) {
      setMasterSettingsRelationsStatus(
        translate("masterSettingsRelationsLoading")
      );
      return;
    }
    if (!masterSettingsRelationsState.loaded) {
      setMasterSettingsRelationsStatus(
        translate("masterSettingsRelationsStatusIdle")
      );
      return;
    }
    if (masterSettingsRelationsState.relations.length) {
      setMasterSettingsRelationsStatus(
        `${masterSettingsRelationsState.relations.length} ${translate(
          "masterSettingsRelationsHeading"
        )}`
      );
    } else {
      setMasterSettingsRelationsStatus(
        translate("masterSettingsRelationsEmpty")
      );
    }
  }

  function renderMasterSettingsRelations() {
    if (!els.masterSettingsRelationsBody) return;
    if (
      !masterSettingsRelationsState.loaded &&
      !masterSettingsRelationsState.relations.length
    ) {
      return;
    }
    const rows = masterSettingsRelationsState.relations.map((relation, index) => {
      const relationIdRaw = `${getRecordField(relation, "RelationID", "relationId")}`.trim();
      const relationId = parseInt(relationIdRaw, 10);
      const relationIdDisplay = Number.isFinite(relationId) ? relationId : "";
      const sourceId = `${getRecordField(relation, "Source_Column_ID", "sourceColumnId")}`.trim();
      const searchId = `${getRecordField(relation, "Search_Column_ID", "searchColumnId")}`.trim();
      const displayId = `${getRecordField(relation, "Display_Column_ID", "displayColumnId")}`.trim();
      const direction = `${getRecordField(relation, "Direction", "direction")}`.trim();
      const relationColumn = `${getRecordField(relation, "Relation_Column_ID", "relationColumnId")}`.trim();
      const relationEn = `${getRecordField(relation, "RelationEn", "relationEn")}`.trim();
      const relationAr = `${getRecordField(relation, "RelationAr", "relationAr")}`.trim();
      const isNew = !!relation.__isNew;
      const rowClasses = ["master-settings-relations-row"];
      if (isNew) {
        rowClasses.push("new");
      }
      const fallbackRowId =
        sourceId && searchId && displayId ? `${sourceId}|${searchId}|${displayId}` : `new-${index}`;
      if (!relation.__key && !Number.isFinite(relationId)) {
        relation.__key = fallbackRowId;
      }
      const rowKey =
        Number.isFinite(relationId) && relationId > 0
          ? `id-${relationId}`
          : relation.__key || fallbackRowId;
      const saveLabel = translate("masterSettingsRelationsSave");
      const deleteLabel = translate("masterSettingsRelationsDelete");
      const directionOptions = [
        `<option value="">${escapeHtml(
          translate("masterSettingsRelationsDirectionPlaceholder")
        )}</option>`,
        ...DIRECTION_OPTIONS.map(
          (opt) =>
            `<option value="${opt}" ${
              opt === direction ? "selected" : ""
            }>${opt}</option>`
        ),
      ].join("");
      const deleteButton =
        Number.isFinite(relationId) && relationId > 0
          ? `<button type="button" class="danger" data-action="delete">${escapeHtml(
              deleteLabel
            )}</button>`
          : "";
      return `
        <tr class="${rowClasses.join(" ")}" data-row-id="${escapeHtml(
          rowKey
        )}" data-relation-id="${Number.isFinite(relationId) ? relationId : ""}" data-new-row="${isNew ? "true" : "false"}">
          <td>${relationIdDisplay ? `<code>${relationIdDisplay}</code>` : "&mdash;"}</td>
          <td>
            ${buildNodeSelect("sourceColumnId", sourceId)}
          </td>
          <td>
            ${buildNodeSelect("searchColumnId", searchId)}
          </td>
          <td>
            ${buildNodeSelect("displayColumnId", displayId)}
          </td>
          <td>
            <select name="direction">
              ${directionOptions}
            </select>
          </td>
          <td>
            ${buildNodeSelect("relationColumnId", relationColumn)}
          </td>
          <td>
            <input type="text" name="relationEn" value="${escapeHtml(
              relationEn
            )}" />
          </td>
          <td>
            <input type="text" name="relationAr" value="${escapeHtml(
              relationAr
            )}" />
          </td>
          <td class="actions-cell">
            <button type="button" data-action="save">${escapeHtml(
              saveLabel
            )}</button>
            ${deleteButton}
          </td>
        </tr>
      `;
    });

    if (!rows.length) {
      els.masterSettingsRelationsBody.innerHTML = `<tr><td colspan="8">${escapeHtml(
        translate("masterSettingsRelationsEmpty")
      )}</td></tr>`;
      if (els.masterSettingsRelationsEmpty) {
        els.masterSettingsRelationsEmpty.hidden = false;
      }
      return;
    }

    els.masterSettingsRelationsBody.innerHTML = rows.join("");
    if (els.masterSettingsRelationsEmpty) {
      els.masterSettingsRelationsEmpty.hidden = true;
    }
  }

  async function loadMasterSettingsRelations(force = false) {
    if (!els.masterSettingsRelationsBody) return;
    if (masterSettingsRelationsState.loading) return;
    if (!force && masterSettingsRelationsState.loaded) return;
    masterSettingsRelationsState.loading = true;
    setMasterSettingsRelationsStatus(
      translate("masterSettingsRelationsLoading")
    );
    try {
      const response = await data.callApi("masterRelations");
      const payload = data.unwrapData(response);
      masterSettingsRelationsState.relations = Array.isArray(payload)
        ? payload
        : [];
      masterSettingsRelationsState.loaded = true;
      renderMasterSettingsRelations();
      refreshMasterSettingsRelationsSummary();
    } catch (err) {
      masterSettingsRelationsState.loaded = false;
      setMasterSettingsRelationsStatus(err.message, true);
    } finally {
      masterSettingsRelationsState.loading = false;
    }
  }

  function addMasterSettingsRelationRow() {
    masterSettingsRelationsState.loaded = true;
    const tempKey = `new-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newRow = {
      __isNew: true,
      __key: tempKey,
      RelationID: null,
      Source_Column_ID: "",
      Search_Column_ID: "",
      Display_Column_ID: "",
      Direction: "",
      Relation_Column_ID: "",
      RelationEn: "",
      RelationAr: "",
      SourceLabel: "",
      SearchLabel: "",
      DisplayLabel: "",
    };
    masterSettingsRelationsState.relations = [
      newRow,
      ...masterSettingsRelationsState.relations,
    ];
    renderMasterSettingsRelations();
    refreshMasterSettingsRelationsSummary();
  }

  function collectRelationRowData(row) {
    const getValue = (name) => {
      const element = row.querySelector(`[name="${name}"]`);
      if (!element) return "";
      const raw = element.value ?? "";
      return typeof raw === "string" ? raw.trim() : `${raw}`.trim();
    };
    const sourceColumnId = getValue("sourceColumnId");
    const searchColumnId = getValue("searchColumnId");
    const displayColumnId = getValue("displayColumnId");
    const direction = getValue("direction");
    const relationColumnId = getValue("relationColumnId");
    const relationEn = getValue("relationEn");
    const relationAr = getValue("relationAr");
    return {
      Source_Column_ID: sourceColumnId,
      Search_Column_ID: searchColumnId,
      Display_Column_ID: displayColumnId,
      Direction: direction || null,
      Relation_Column_ID: relationColumnId || null,
      RelationEn: relationEn || null,
      RelationAr: relationAr || null,
    };
  }

  function validateRelationPayload(payload) {
    if (
      !payload.Source_Column_ID ||
      !payload.Search_Column_ID ||
      !payload.Display_Column_ID
    ) {
      setMasterSettingsRelationsStatus(
        translate("masterSettingsRelationsMissingColumns"),
        true
      );
      return false;
    }
    const hasRelationColumn = !!payload.Relation_Column_ID;
    const hasOnlyOneText =
      (payload.RelationEn && !payload.RelationAr) ||
      (!payload.RelationEn && payload.RelationAr);
    if (hasOnlyOneText) {
      setMasterSettingsRelationsStatus(
        translate("masterSettingsRelationsMissingRelation"),
        true
      );
      return false;
    }
    const hasRelationTexts = !!payload.RelationEn && !!payload.RelationAr;
    if (!hasRelationColumn && !hasRelationTexts) {
      setMasterSettingsRelationsStatus(
        translate("masterSettingsRelationsMissingRelation"),
        true
      );
      return false;
    }
    if (hasRelationColumn && (payload.RelationEn || payload.RelationAr)) {
      setMasterSettingsRelationsStatus(
        translate("masterSettingsRelationsExclusiveRelation"),
        true
      );
      return false;
    }
    return true;
  }

  async function saveRelationRow(row, button) {
    const payload = collectRelationRowData(row);
    row.classList.remove("error");
    if (!validateRelationPayload(payload)) {
      row.classList.add("error");
      return;
    }
    row.classList.add("saving");
    button.disabled = true;
    setMasterSettingsRelationsStatus(
      translate("masterSettingsRelationsLoading")
    );
    try {
      await data.callApi("saveRelation", payload);
      setMasterSettingsRelationsStatus(
        translate("masterSettingsRelationsSaved")
      );
      await loadMasterSettingsRelations(true);
    } catch (err) {
      row.classList.add("error");
      setMasterSettingsRelationsStatus(err.message, true);
    } finally {
      row.classList.remove("saving");
      button.disabled = false;
    }
  }

  async function deleteRelationRow(row, button) {
    const relationId = parseInt(row.dataset.relationId || "", 10);
    if (!relationId || Number.isNaN(relationId)) {
      setMasterSettingsRelationsStatus(
        translate("masterSettingsRelationsDeleteError"),
        true
      );
      return;
    }
    const confirmMessage = translate("masterSettingsRelationsDeleteConfirm");
    const confirmed =
      typeof window.confirm === "function"
        ? window.confirm(confirmMessage)
        : true;
    if (!confirmed) {
      return;
    }
    row.classList.remove("error");
    row.classList.add("saving");
    button.disabled = true;
    setMasterSettingsRelationsStatus(
      translate("masterSettingsRelationsLoading")
    );
    try {
      await data.callApi("deleteRelation", { relationId });
      removeRelationFromState(relationId);
      renderMasterSettingsRelations();
      refreshMasterSettingsRelationsSummary();
      setMasterSettingsRelationsStatus(
        translate("masterSettingsRelationsDeleted")
      );
    } catch (err) {
      row.classList.add("error");
      setMasterSettingsRelationsStatus(
        err.message || translate("masterSettingsRelationsDeleteError"),
        true
      );
    } finally {
      row.classList.remove("saving");
      button.disabled = false;
    }
  }

  function markRelationRowDirty(event) {
    if (!(event.target instanceof Element)) return;
    const row = event.target.closest(".master-settings-relations-row");
    if (!row) return;
    row.classList.add("dirty");
  }

  function removeRelationFromState(relationId) {
    const normalized = `${relationId ?? ""}`.trim();
    if (!normalized) return;
    masterSettingsRelationsState.relations = masterSettingsRelationsState.relations.filter(
      (relation) =>
        `${getRecordField(relation, "RelationID", "relationId")}`.trim() !== normalized
    );
  }

  els.masterSettingsRelationsRefresh?.addEventListener("click", () => {
    loadMasterSettingsRelations(true);
  });

  els.masterSettingsRelationsAdd?.addEventListener("click", async () => {
    await loadMasterSettingsLegends();
    if (!masterSettingsRelationsState.loaded) {
      await loadMasterSettingsRelations(true);
    }
    addMasterSettingsRelationRow();
  });

  els.masterSettingsRelationsBody?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button[data-action]");
    if (!button) return;
    const row = button.closest(".master-settings-relations-row");
    if (!row) return;
    const action = button.dataset.action;
    if (action === "save") {
      saveRelationRow(row, button);
    } else if (action === "delete") {
      deleteRelationRow(row, button);
    }
  });

  els.masterSettingsRelationsBody?.addEventListener("input", markRelationRowDirty);
  els.masterSettingsRelationsBody?.addEventListener("change", markRelationRowDirty);

  const updateTimelineRecording = () => {
    if (!els.timelineRecordToggle) {
      timelineRecordingEnabled = false;
      return;
    }
    const enabled = !!els.timelineRecordToggle.checked;
    if (enabled === timelineRecordingEnabled) return;
    timelineRecordingEnabled = enabled;
    if (!enabled) {
      timelineModule?.resetHistory?.();
    } else {
      recordTimelineSnapshot("reset", translate("timelineRecordStart"));
    }
  };
  els.timelineRecordToggle?.addEventListener("change", updateTimelineRecording);
  updateTimelineRecording();

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
    renderLegendsPanel();
    pathModule?.onLanguageChanged?.();
    timelineModule?.refreshTranslations?.();
  }

  initCollapsiblePanel({
    panel: els.filterPanel,
    toggleButton: els.toggleFilters,
    chevron: els.filterChevron,
    onToggle: updateGraphPadding,
  });
  initCollapsiblePanel({
    panel: els.configPanel,
    toggleButton: els.toggleConfig,
    chevron: els.configChevron,
    onToggle: updateGraphPadding,
  });
  initCollapsiblePanel({
    panel: els.legendsPanel,
    toggleButton: els.toggleLegends,
    chevron: els.legendsChevron,
    onToggle: updateGraphPadding,
  });
  initCollapsiblePanel({
    panel: els.pathPanel,
    toggleButton: els.togglePath,
    chevron: els.pathChevron,
    onToggle: updateGraphPadding,
  });
  initCollapsiblePanel({
    panel: els.timelinePanel,
    toggleButton: els.toggleTimeline,
    chevron: els.timelineChevron,
    onToggle: updateGraphPadding,
  });

  function renderSelections() {
    if (!els.selections) return;
    els.selections.innerHTML = state.selected
      .map(
        (s, i) => `
      <li>
        <div class="row selection-entry">
          <div class="selection-info">
            <b>${s.colLabel ?? s.colId}</b> &mdash; ${s.text}
            <span class="pill">${s.id}</span>
          </div>
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

  const legendKey = (value) => (value || "").trim().toLowerCase();

  const isLegendKeyActive = (key) => {
    if (!key) return true;
    const controls = state.legendControls[key];
    if (!controls) return true;
    return controls.active !== false;
  };

  const applyLegendFiltersToGraph = () => {
    if (typeof graph.applyLegendFilter === "function") {
      graph.applyLegendFilter();
    }
  };

  if (typeof graph.setLegendFilter === "function") {
    graph.setLegendFilter((key) => isLegendKeyActive(key));
  }
  const buildLegendsViewKey = () =>
    state.viewIds.length
      ? state.viewIds
          .slice()
          .map((id) => Number(id) || 0)
          .sort((a, b) => a - b)
          .join(",")
      : "";

  function ensureLegendControlByKey(key, colId) {
    if (!key) return null;
    const existing = state.legendControls[key];
    if (existing) {
      if (!("active" in existing)) {
        existing.active = true;
      }
      if (!existing.fromDate) {
        existing.fromDate = dateDefaults.from;
      }
      if (!existing.toDate) {
        existing.toDate = dateDefaults.to;
      }
      if (!("useDateFilter" in existing)) {
        existing.useDateFilter = false;
      }
      if (colId && !existing.colId) {
        existing.colId = colId;
      }
      return existing;
    }
    const next = {
      active: true,
      fromDate: dateDefaults.from,
      toDate: dateDefaults.to,
      useDateFilter: false,
    };
    if (colId) {
      next.colId = colId;
    }
    state.legendControls[key] = next;
    return next;
  }

  function ensureLegendControl(colId) {
    return ensureLegendControlByKey(legendKey(colId), colId);
  }

  function renderLegendsPanel() {
    if (!els.legendsTable || !els.legendsTableBody || !els.legendsEmpty) {
      return;
    }

    const hasViews = state.viewIds.length > 0;
    const activeKeys = new Set();
    state.legends.forEach((legend) => {
      const colId = `${legend.colId ?? legend.ColId ?? ""}`.trim();
      const key = legendKey(colId);
      if (key) {
        activeKeys.add(key);
      }
    });

    Object.keys(state.legendControls).forEach((key) => {
      if (!activeKeys.has(key)) {
        delete state.legendControls[key];
      }
    });

    if (!hasViews) {
      els.legendsTable.hidden = true;
      els.legendsEmpty.hidden = false;
      els.legendsEmpty.textContent = translate("legendsPromptSelectViews");
      els.legendsTableBody.innerHTML = "";
      applyLegendFiltersToGraph();
      return;
    }

    if (!state.legends.length) {
      els.legendsTable.hidden = true;
      els.legendsEmpty.hidden = false;
      els.legendsEmpty.textContent = translate("legendsEmptyMessage");
      els.legendsTableBody.innerHTML = "";
      applyLegendFiltersToGraph();
      return;
    }

    els.legendsEmpty.hidden = true;
    els.legendsTable.hidden = false;
    const rows = state.legends
      .map((legend) => {
        const colId = `${legend.colId ?? legend.ColId ?? ""}`.trim();
        if (!colId) return "";
        const label = legend.label ?? legend.Label ?? colId;
        const color =
          legend.color ?? legend.Color ?? DEFAULT_NODE_COLOR;
        const key = legendKey(colId);
        const controls = ensureLegendControlByKey(key, colId);
        if (!key || !controls) {
          return "";
        }
        const checkedAttr = controls.active === false ? "" : "checked";
        const fromDate = formatDisplayDate(controls.fromDate);
        const toDate = formatDisplayDate(controls.toDate);
        const ariaLabel = escapeHtml(translate("legendsActiveAria"));
        const dateToggleLabel = escapeHtml(
          translate("legendsDateToggleAria", "Toggle date filter")
        );
        const showDates = controls.useDateFilter === true;
        const dateToggle = `
          <label class="switch legend-date-switch">
            <input
              type="checkbox"
              data-role="legend-date-toggle"
              ${showDates ? "checked" : ""}
              aria-label="${dateToggleLabel}"
            />
            <span class="slider" aria-hidden="true"></span>
          </label>
        `;
        const fromContent = showDates
          ? `<input
                type="text"
                class="legend-date-input"
                data-role="legend-from"
                value="${escapeHtml(fromDate)}"
                inputmode="numeric"
                placeholder="dd/mm/yyyy"
              />`
          : `<span class="legend-date-placeholder">&mdash;</span>`;
        const toContent = showDates
          ? `<input
                type="text"
                class="legend-date-input"
                data-role="legend-to"
                value="${escapeHtml(toDate)}"
                inputmode="numeric"
                placeholder="dd/mm/yyyy"
              />`
          : `<span class="legend-date-placeholder">&mdash;</span>`;
        const colorValue = escapeHtml(color);
        return `
          <tr data-legend-key="${escapeHtml(key)}">
            <td>
              <input
                type="checkbox"
                data-role="legend-active"
                ${checkedAttr}
                aria-label="${ariaLabel}"
              />
            </td>
            <td>
              <span class="legend-color-chip" style="background-color: ${colorValue};" aria-label="${colorValue}" title="${colorValue}"></span>
            </td>
            <td>${escapeHtml(label)}</td>
            <td>${dateToggle}</td>
            <td>${fromContent}</td>
            <td>${toContent}</td>
          </tr>
        `;
      })
      .filter(Boolean)
      .join("");
    els.legendsTableBody.innerHTML = rows;
    initLegendDatePickers();
    applyLegendFiltersToGraph();
  }

  function initLegendDatePickers() {
    const jq = window.jQuery;
    if (!jq || !jq.fn?.datepicker) return;
    const inputs = jq(".legend-date-input");
    if (!inputs.length) return;
    inputs.each(function () {
      const $input = jq(this);
      if ($input.hasClass("hasDatepicker")) {
        $input.datepicker("destroy");
      }
      $input.datepicker({
        dateFormat: "dd/mm/yy",
        showAnim: "fadeIn",
        onSelect: () => {
          this.dispatchEvent(new Event("change", { bubbles: true }));
        },
        onClose: () => {
          this.dispatchEvent(new Event("change", { bubbles: true }));
        },
      });
    });
  }

  function sanitizeDateString(value) {
    if (!value) return null;
    const text = `${value}`.trim();
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
      const [day, month, year] = text.split("/");
      return `${year}-${month}-${day}`;
    }
    return text.slice(0, 10);
  }

  function formatDateISO(date) {
    if (!(date instanceof Date)) return "";
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getDefaultLegendDateRange() {
    const now = new Date();
    const toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fromDate = new Date(toDate);
    fromDate.setMonth(fromDate.getMonth() - 6);
    return {
      from: formatDateISO(fromDate),
      to: formatDateISO(toDate),
    };
  }

  function formatDisplayDate(value) {
    if (!value) return "";
    const text = `${value}`.trim();
    if (!text) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const [year, month, day] = text.split("-");
      return `${day}/${month}/${year}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
      return text;
    }
    return text;
  }

  function parseDisplayDate(value) {
    if (!value) return "";
    const text = `${value}`.trim();
    if (!text) return "";
    const match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
      const day = match[1].padStart(2, "0");
      const month = match[2].padStart(2, "0");
      const year = match[3];
      return `${year}-${month}-${day}`;
    }
    return sanitizeDateString(text) || "";
  }

  function getLegendFiltersPayload() {
    const filters = [];
    Object.keys(state.legendControls).forEach((key) => {
      const controls = state.legendControls[key];
      if (!controls) return;
      const colId =
        controls.colId ||
        controls.columnId ||
        controls.ColumnId ||
        controls.column_id ||
        "";
      if (!colId) return;
      const useDates = controls.useDateFilter === true;
      const fromDate = useDates ? sanitizeDateString(controls.fromDate) : null;
      const toDate = useDates ? sanitizeDateString(controls.toDate) : null;
      filters.push({
        destinationColId: colId,
        fromDate,
        toDate,
      });
    });
    return filters;
  }

  async function refreshLegendsPanel(options = {}) {
    if (!state.viewIds.length) {
      state.legends = [];
      state.lastLegendsViewKey = "";
      renderLegendsPanel();
      return;
    }
    const nextKey = buildLegendsViewKey();
    if (!options.force && state.lastLegendsViewKey === nextKey) {
      return;
    }
    await data.loadLegendsForViews(options);
    state.lastLegendsViewKey = nextKey;
    renderLegendsPanel();
  }

  const graphPanelButtons = Array.from(
    document.querySelectorAll(".panel-trigger.graph-panel")
  );
  updateTopPanelVisibility(false);

  function updateTopPanelVisibility(hasGraph) {
    graphPanelButtons.forEach((btn) => {
      if (btn.classList.contains("timeline-trigger") && state.showTimelineButton === false) {
        btn.style.display = "none";
        return;
      }
      btn.style.display = hasGraph ? "" : "none";
    });
    if (!hasGraph && activeFloatingPanel && ["info", "path", "timeline"].includes(activeFloatingPanel)) {
      closeFloatingPanels();
    }
  }

  function setGraphReadyState(hasGraph) {
    rootEl.classList.toggle("graph-ready", hasGraph);
    if (els.clearGraph) {
      els.clearGraph.style.display = hasGraph ? "block" : "none";
    }
    updateTopPanelVisibility(hasGraph);
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

  els.language?.addEventListener("change", async () => {
    if (state.showLanguageSelector === false) {
      if (els.language) {
        els.language.value = state.language;
      }
      return;
    }
    state.language = els.language.value;
    applyLanguageChrome();
    renderMasterSettingsLegends();
    refreshMasterSettingsLegendsSummary();
    renderMasterSettingsRelations();
    refreshMasterSettingsRelationsSummary();
    data.clearItems(true);
    await data.loadViews();
    await refreshLegendsPanel({ force: true });
    infoPanel.reset();
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
      const pinned = isPanelPinned(key);
      const isActive = activeFloatingPanel === key || pinned;
      panel.classList.toggle("open", isActive);
      panel.classList.toggle("pinned", pinned);
      if (key === "path" && pathModule) {
        if (isActive) {
          pathModule.onPanelOpen?.();
        } else {
          pathModule.onPanelClose?.();
        }
      }
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

    const compact = isCompactLayout();
    if (compact) {
      if (activeFloatingPanel === name) {
        setActivePanel(null);
      } else {
        setActivePanel(name);
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    if (activeFloatingPanel === name) {
      setPanelPinned(name, false);
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
      pathModule?.onGraphCleared?.();
    }
    refreshLegendsPanel();
    setPanelPinned("filters", true);
    setActivePanel("legends");
  });

  const handleLegendControlsChange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const row = target.closest("tr[data-legend-key]");
    if (!row) return;
    const key = legendKey(row.dataset.legendKey || "");
    const controls = ensureLegendControlByKey(key);
    if (!controls) {
      return;
    }
    const role = target.dataset.role;
    let rerender = false;
    if (role === "legend-active") {
      controls.active = target.checked;
    } else if (role === "legend-date-toggle") {
      controls.useDateFilter = target.checked;
      if (controls.useDateFilter) {
        const { from, to } = getDefaultLegendDateRange();
        controls.fromDate = from;
        controls.toDate = to;
      }
      rerender = true;
    } else if (role === "legend-from") {
      controls.fromDate = parseDisplayDate(target.value);
      target.value = formatDisplayDate(controls.fromDate);
    } else if (role === "legend-to") {
      controls.toDate = parseDisplayDate(target.value);
      target.value = formatDisplayDate(controls.toDate);
    }
    if (rerender) {
      renderLegendsPanel();
    } else {
      applyLegendFiltersToGraph();
    }
  };

  els.legendsTableBody?.addEventListener("change", handleLegendControlsChange);
  els.legendsTableBody?.addEventListener("input", handleLegendControlsChange);

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

    state.selected.push({
      colId,
      colLabel,
      id: state.activeItem.id,
      text: state.activeItem.text,
    });

    state.activeItem = null;
    if (els.itemSearch) els.itemSearch.value = "";
    data.hideSuggestions();
    renderSelections();
  });

  els.clearGraph?.addEventListener("click", () => {
    pathModule?.onGraphCleared?.();
    graph.clearGraph();
    timelineModule?.resetHistory?.();
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

  els.autoExpandDepth?.addEventListener("change", () => {
    const raw = parseInt(els.autoExpandDepth.value, 10);
    const min = defaults.autoExpandMinDepth ?? 1;
    const max = defaults.autoExpandMaxDepth ?? 5;
    const normalized = Number.isFinite(raw)
      ? Math.min(Math.max(raw, min), max)
      : min;
    state.autoExpandDepth = normalized;
    if (els.autoExpandDepth.value !== `${normalized}`) {
      els.autoExpandDepth.value = `${normalized}`;
    }
    if (els.autoExpandToggle?.checked) {
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
      pathModule?.onGraphCleared?.();
      graph.clearGraph();
      timelineModule?.resetHistory?.();
      setGraphReadyState(false);
      const legendFilters = getLegendFiltersPayload();

      const nodes = new Map();
      const edges = new Map();
      const edgePairMap = new Map();
      const nodeKey = (colId, id) => `${colId}:${id}`;
      const undirectedKey = (a, b) => (a < b ? `${a}||${b}` : `${b}||${a}`);

      state.selected.forEach((sel) => {
        const key = nodeKey(sel.colId, sel.id);
        const fromDate = translate("anyValue");
        const toDate = translate("anyValue");
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
          maxNodes: getMaxNodes(),
          filters: legendFilters,
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

      const nodeArray = Array.from(nodes.values());
      const edgeArray = Array.from(edges.values());

      graph.renderGraph(nodeArray, edgeArray);
      pathModule?.onGraphUpdated?.();
      recordTimelineSnapshot("reset", translate("timelineFilterStep"));
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
  data.loadViews().then(() => {
    refreshLegendsPanel();
  });
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

function createInfoPanel({
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
}
