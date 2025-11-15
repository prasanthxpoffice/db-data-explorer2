(function (window) {
  const GraphApp = (window.GraphApp = window.GraphApp || {});

  GraphApp.createPathModule = function ({
    els,
    translate,
    setStatus,
    getCy,
  }) {
    if (!els?.root) return null;

    const colors = [
      "#f97316",
      "#ec4899",
      "#06b6d4",
      "#8b5cf6",
      "#10b981",
      "#ef4444",
    ];

    const state = {
      paths: [],
      seq: 1,
      panelOpen: false,
      selection: { start: null, end: null },
      activeFocus: null,
    };

    const nodeUsage = new Map(); // nodeId -> Set(pathId)
    const edgeUsage = new Map(); // edgeId -> Set(pathId)
    const blinkIntervals = new Map();
    const edgeBlinkIntervals = new Map();

    const escapeHtml = (value = "") =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    function currentCy() {
      const cy = getCy?.();
      return cy && cy.nodes ? cy : null;
    }

    function pickColor() {
      return colors[(state.seq - 1) % colors.length];
    }

    function canAddPath() {
      return !!(state.selection.start && state.selection.end);
    }

    function selectionLabel(role) {
      const placeholderKey =
        role === "start" ? "pathStartPlaceholder" : "pathEndPlaceholder";
      const selection = state.selection[role];
      if (!selection) {
        return translate(
          placeholderKey,
          role === "start" ? "Select start node" : "Select end node"
        );
      }
      return selection.label || selection.id || translate("noLabel");
    }

    function updateSelectionDisplays() {
      if (els.startLabel) {
        els.startLabel.textContent = selectionLabel("start");
      }
      if (els.endLabel) {
        els.endLabel.textContent = selectionLabel("end");
      }
      if (els.startDisplay) {
        els.startDisplay.classList.toggle(
          "selected",
          !!state.selection.start
        );
      }
      if (els.endDisplay) {
        els.endDisplay.classList.toggle("selected", !!state.selection.end);
      }
      if (els.addBtn) {
        els.addBtn.disabled = !canAddPath();
      }
    }

    function resetSelection() {
      state.selection.start = null;
      state.selection.end = null;
      updateSelectionDisplays();
    }

    function applyPathFocus() {
      const cy = currentCy();
      if (!cy) return;
      const focusId = state.activeFocus;
      const record = focusId
        ? state.paths.find((p) => p.id === focusId)
        : null;
      if (focusId && !record) {
        state.activeFocus = null;
      }
      cy.batch(() => {
        if (!record) {
          cy.nodes().forEach((node) =>
            node.removeClass("path-focus-hidden")
          );
          cy.edges().forEach((edge) =>
            edge.removeClass("path-focus-hidden")
          );
          return;
        }
        const nodeSet = new Set(record.nodeIds || []);
        const edgeSet = new Set(record.edgeIds || []);
        cy.nodes().forEach((node) => {
          node.toggleClass(
            "path-focus-hidden",
            !nodeSet.has(node.id())
          );
        });
        cy.edges().forEach((edge) => {
          edge.toggleClass(
            "path-focus-hidden",
            !edgeSet.has(edge.id())
          );
        });
      });
    }

    function setActiveFocus(pathId) {
      state.activeFocus = pathId || null;
      renderList();
      applyPathFocus();
    }

    function ensureSelectionNodesExist() {
      const cy = currentCy();
      if (!cy) {
        resetSelection();
        return;
      }
      ["start", "end"].forEach((role) => {
        const selection = state.selection[role];
        if (!selection) return;
        const node = cy.getElementById(selection.id);
        if (!node || !node.length) {
          state.selection[role] = null;
        }
      });
      updateSelectionDisplays();
    }

    function normalizePayload(payload) {
      if (!payload?.key) return null;
      return {
        id: payload.key,
        label:
          payload.label ||
          payload.entityLabel ||
          payload.meta?.text ||
          payload.id ||
          translate("noLabel"),
      };
    }

    function handleNodeTap(payload) {
      if (!state.panelOpen) return;
      const node = normalizePayload(payload);
      if (!node) return;

      if (!state.selection.start || (state.selection.start && state.selection.end)) {
        state.selection.start = node;
        state.selection.end = null;
      } else if (!state.selection.end) {
        if (node.id === state.selection.start.id) {
          setStatus?.(translate("pathSameNode"));
          return;
        }
        state.selection.end = node;
      }
      updateSelectionDisplays();
    }

    function computeShortestPath(start, end) {
      const cy = currentCy();
      if (!cy) return null;
      const elements = cy.elements();
      if (!elements.aStar) return null;
      const result = elements.aStar({
        root: start,
        goal: end,
        directed: false,
      });
      if (!result.found) return null;
      return result.path;
    }

    function startNodeBlink(nodeId) {
      stopNodeBlink(nodeId);
      const cy = currentCy();
      if (!cy) return;
      const node = cy.getElementById(nodeId);
      if (node && node.length) {
        node.removeClass("path-node-dim");
      }
    }

    function stopNodeBlink(nodeId) {
      const intervalId = blinkIntervals.get(nodeId);
      if (intervalId) {
        clearInterval(intervalId);
        blinkIntervals.delete(nodeId);
      }
      const cy = currentCy();
      if (cy) {
        const node = cy.getElementById(nodeId);
        if (node && node.length) {
          node.removeClass("path-node-dim");
        }
      }
    }

    function highlightNodes(pathId, nodeIds, color) {
      const cy = currentCy();
      if (!cy) return;
      nodeIds.forEach((nodeId) => {
        const node = cy.getElementById(nodeId);
        if (!node || !node.length) return;
        if (!nodeUsage.has(nodeId)) {
          nodeUsage.set(nodeId, new Set());
        }
        nodeUsage.get(nodeId).add(pathId);
        node.data("pathColor", color);
        node.addClass("path-node");
        startNodeBlink(nodeId);
      });
    }

    function highlightEdges(pathId, steps, color) {
      const cy = currentCy();
      if (!cy) return [];
      const ids = [];
      steps.forEach((step) => {
        const edge = cy.getElementById(step.edgeId);
        if (!edge || !edge.length) return;
        if (!edgeUsage.has(step.edgeId)) {
          edgeUsage.set(step.edgeId, new Set());
        }
        edgeUsage.get(step.edgeId).add(pathId);
        edge.data("pathColor", color);
        edge.data(
          "pathTargetShape",
          step.forward ? "triangle" : "none"
        );
        edge.data(
          "pathSourceShape",
          step.forward ? "none" : "triangle"
        );
        edge.addClass("path-base-edge");
        startEdgeBlink(step.edgeId);
        ids.push(step.edgeId);
      });
      return ids;
    }

    function startEdgeBlink(edgeId) {
      const cy = currentCy();
      if (!cy) return;
      const edge = cy.getElementById(edgeId);
      if (!edge || !edge.length) return;
      stopEdgeBlink(edgeId);
      let dim = false;
      const intervalId = window.setInterval(() => {
        const current = cy.getElementById(edgeId);
        if (!current || !current.length) {
          stopEdgeBlink(edgeId);
          return;
        }
        dim = !dim;
        current.toggleClass("path-edge-dim", dim);
      }, 500);
      edgeBlinkIntervals.set(edgeId, intervalId);
    }

    function stopEdgeBlink(edgeId) {
      const intervalId = edgeBlinkIntervals.get(edgeId);
      if (intervalId) {
        clearInterval(intervalId);
        edgeBlinkIntervals.delete(edgeId);
      }
      const cy = currentCy();
      if (cy) {
        const edge = cy.getElementById(edgeId);
        if (edge && edge.length) {
          edge.removeClass("path-edge-dim");
        }
      }
    }

    function animateNodes(nodeIds) {
      const cy = currentCy();
      if (!cy) return;
      nodeIds.forEach((nodeId, idx) => {
        const node = cy.getElementById(nodeId);
        if (!node || !node.length) return;
        setTimeout(() => {
          node.animate(
            { style: { opacity: 0.6 } },
            {
              duration: 150,
              complete: () =>
                node.animate({ style: { opacity: 1 } }, { duration: 150 }),
            }
          );
        }, idx * 120);
      });
    }

    function handleAddPath() {
      if (!canAddPath()) {
        setStatus?.(translate("pathSelectNodes"));
        return;
      }
      const cy = currentCy();
      if (!cy) {
        setStatus?.(translate("pathNoGraph"));
        return;
      }
      const startId = state.selection.start.id;
      const endId = state.selection.end.id;
      if (state.paths.some((p) => p.start.id === startId && p.end.id === endId)) {
        setStatus?.(translate("pathDuplicate"));
        return;
      }
      const start = cy.getElementById(startId);
      const end = cy.getElementById(endId);
      if (!start || !start.length || !end || !end.length) {
        ensureSelectionNodesExist();
        setStatus?.(translate("pathSelectNodes"));
        return;
      }
      const path = computeShortestPath(start, end);
      if (!path) {
        setStatus?.(translate("pathNotFound"));
        return;
      }
      const nodeIds = [];
      const pathEdges = [];
      path.forEach((ele) => {
        if (ele.isNode()) {
          nodeIds.push(ele.id());
        } else if (ele.isEdge()) {
          pathEdges.push(ele);
        }
      });
      if (nodeIds.length < 2) {
        setStatus?.(translate("pathNotFound"));
        return;
      }
      const steps = [];
      for (let i = 0; i < pathEdges.length; i += 1) {
        const edge = pathEdges[i];
        const from = nodeIds[i];
        const to = nodeIds[i + 1];
        if (!from || !to) continue;
        const forward =
          edge.source().id() === from && edge.target().id() === to;
        steps.push({
          edgeId: edge.id(),
          forward,
        });
      }

      const color = pickColor();
      const pathId = `path-${state.seq++}`;

      highlightNodes(pathId, nodeIds, color);
      const edgeIds = highlightEdges(pathId, steps, color);
      animateNodes(nodeIds);

      state.paths.push({
        id: pathId,
        color,
        start: { id: startId, label: state.selection.start.label },
        end: { id: endId, label: state.selection.end.label },
        nodeIds,
        edgeIds,
        edgeMeta: steps,
      });

      renderList();
      resetSelection();
      applyPathFocus();
    }

    function updateNodeUsageAfterRemoval(nodeId, pathId) {
      const cy = currentCy();
      const usage = nodeUsage.get(nodeId);
      if (!usage) return;
      usage.delete(pathId);
      const node = cy?.getElementById(nodeId);
      if (!node || !node.length) return;
      if (usage.size === 0) {
        nodeUsage.delete(nodeId);
        node.removeClass("path-node");
        node.removeData("pathColor");
        stopNodeBlink(nodeId);
      } else {
        const lastPathId = Array.from(usage)[usage.size - 1];
        const record = state.paths.find((p) => p.id === lastPathId);
        if (record) {
          node.data("pathColor", record.color);
          startNodeBlink(nodeId);
        }
      }
    }

    function updateEdgeUsageAfterRemoval(edgeId, pathId) {
      const cy = currentCy();
      const usage = edgeUsage.get(edgeId);
      if (!usage) return;
      usage.delete(pathId);
      const edge = cy?.getElementById(edgeId);
      if (!edge || !edge.length) return;
      if (usage.size === 0) {
        edgeUsage.delete(edgeId);
        edge.removeClass("path-base-edge");
        edge.removeClass("path-edge-dim");
        edge.removeData("pathColor");
        edge.removeData("pathTargetShape");
        edge.removeData("pathSourceShape");
        stopEdgeBlink(edgeId);
      } else {
        const lastPathId = Array.from(usage)[usage.size - 1];
        const record = state.paths.find((p) => p.id === lastPathId);
        if (record) {
          edge.data("pathColor", record.color);
          const step = record.edgeMeta?.find(
            (meta) => meta.edgeId === edgeId
          );
          const forward = step ? !!step.forward : true;
          edge.data("pathTargetShape", forward ? "triangle" : "none");
          edge.data("pathSourceShape", forward ? "none" : "triangle");
        }
      }
    }

    function removePath(pathId) {
      const cy = currentCy();
      const index = state.paths.findIndex((p) => p.id === pathId);
      if (index === -1) return;
      const path = state.paths[index];
      state.paths.splice(index, 1);

      if (cy) {
        path.edgeIds?.forEach((edgeId) =>
          updateEdgeUsageAfterRemoval(edgeId, path.id)
        );
        path.nodeIds.forEach((nodeId) =>
          updateNodeUsageAfterRemoval(nodeId, path.id)
        );
      }
      if (state.activeFocus === pathId) {
        state.activeFocus = null;
      }
      renderList();
      applyPathFocus();
    }

    function clearAll() {
      const cy = currentCy();
      if (cy) {
        cy.nodes(".path-node").forEach((node) => {
          node.removeClass("path-node");
          node.removeData("pathColor");
          stopNodeBlink(node.id());
        });
        cy.edges(".path-base-edge").forEach((edge) => {
          edge.removeClass("path-base-edge");
          edge.removeClass("path-edge-dim");
          edge.removeData("pathColor");
          edge.removeData("pathTargetShape");
          edge.removeData("pathSourceShape");
          stopEdgeBlink(edge.id());
        });
      }
      state.paths = [];
      state.seq = 1;
      nodeUsage.clear();
      edgeUsage.clear();
      blinkIntervals.forEach((_, nodeId) => stopNodeBlink(nodeId));
      edgeBlinkIntervals.forEach((_, edgeId) => stopEdgeBlink(edgeId));
      resetSelection();
      state.activeFocus = null;
      renderList();
      applyPathFocus();
    }

    function renderList() {
      if (!els.list) return;
      if (!state.paths.length) {
        els.list.innerHTML = `<li class="path-entry empty">${translate(
          "pathListEmpty",
          "No paths added yet."
        )}</li>`;
        return;
      }
      els.list.innerHTML = state.paths
        .map((path) => {
          const isFocused = state.activeFocus === path.id;
          const focusLabel = escapeHtml(
            translate("pathFocus", "Focus path")
          );
          return `
          <li class="path-entry">
            <div class="path-color-dot" style="background:${path.color}"></div>
            <div class="path-entry-info">
              <strong>${escapeHtml(path.start.label)} &rarr; ${escapeHtml(
            path.end.label
          )}</strong>
              <span>${translate("pathStart")}: ${escapeHtml(
                path.start.label
              )}</span>
              <span>${translate("pathEnd")}: ${escapeHtml(
                path.end.label
              )}</span>
            </div>
            <div class="path-entry-actions">
              <div class="path-entry-focus">
                <label class="switch" aria-label="${focusLabel}">
                  <input type="checkbox" data-path-focus="${path.id}" ${
            isFocused ? "checked" : ""
          } />
                  <span class="slider"></span>
                </label>
                <span class="path-focus-label">${focusLabel}</span>
              </div>
              <button data-path-remove="${path.id}" aria-label="${translate(
            "pathRemove",
            "Remove path"
          )}">&times;</button>
            </div>
          </li>
        `;
        })
        .join("");
    }

    function handleListClick(event) {
      const btn = event.target.closest("[data-path-remove]");
      if (!btn) return;
      removePath(btn.dataset.pathRemove);
    }

    function handleFocusChange(event) {
      const input = event.target.closest("input[data-path-focus]");
      if (!input) return;
      const pathId = input.dataset.pathFocus;
      if (input.checked) {
        if (state.activeFocus !== pathId) {
          setActiveFocus(pathId);
        }
      } else if (state.activeFocus === pathId) {
        setActiveFocus(null);
      }
    }

    if (els.addBtn) {
      els.addBtn.addEventListener("click", handleAddPath);
    }
    if (els.resetBtn) {
      els.resetBtn.addEventListener("click", resetSelection);
    }
    if (els.list) {
      els.list.addEventListener("click", handleListClick);
      els.list.addEventListener("change", handleFocusChange);
    }

    updateSelectionDisplays();
    renderList();
    applyPathFocus();

    function handleGraphUpdated() {
      ensureSelectionNodesExist();
      applyPathFocus();
    }

    return {
      onGraphUpdated: handleGraphUpdated,
      onGraphCleared: clearAll,
      onLanguageChanged: () => {
        renderList();
        updateSelectionDisplays();
      },
      onPanelOpen: () => {
        state.panelOpen = true;
        updateSelectionDisplays();
      },
      onPanelClose: () => {
        state.panelOpen = false;
      },
      onNodeTap: handleNodeTap,
    };
  };
})(window);
