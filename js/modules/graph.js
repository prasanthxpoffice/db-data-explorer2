(function (window) {
  const GraphApp = (window.GraphApp = window.GraphApp || {});

  GraphApp.createGraphModule = function ({
    state,
    els,
    defaults,
    DEFAULT_NODE_COLOR,
    setStatus,
    translate,
    callApi,
    unwrapData,
    getMaxNodes,
    getAutoExpandDepth,
    getLegendFilters,
    onNodeSelected,
    onEdgeSelected,
    onGraphCleared,
    onElementsAdded,
  }) {
    let cy = null;
    const expandedNodes = new Set();
    let autoExpandRunning = false;
    let autoExpandGeneration = 0;
    let legendFilterFn = null;
    const autoExpandLevels = new Map();

    function cloneElement(el) {
      if (!el || !el.data) return null;
      const clone = { data: { ...el.data } };
      if (el.classes) clone.classes = el.classes;
      if ("selectable" in el) clone.selectable = el.selectable;
      if ("grabbable" in el) clone.grabbable = el.grabbable;
      if ("locked" in el) clone.locked = el.locked;
      if (el.group) clone.group = el.group;
      if (el.style) clone.style = { ...el.style };
      if (el.position) clone.position = { ...el.position };
      return clone;
    }

    function cloneElements(list) {
      if (!Array.isArray(list)) return [];
      return list.map(cloneElement).filter(Boolean);
    }

    function getEntityLabel(colId) {
      const key = (colId || "").toLowerCase();
      if (!key) return colId;
      const match = state.nodeTypes.find((nt) => {
        const id = (nt.colId || nt.ColId || "").toLowerCase();
        return id === key;
      });
      return match ? match.label || match.Label || match.colId || colId : colId;
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

    function isLegendVisible(node) {
      if (!legendFilterFn || !node) return true;
      const typeKey = (node.data("type") || "").toLowerCase();
      return legendFilterFn(typeKey);
    }

    function applyLegendFilter() {
      if (!cy) return;
      cy.batch(() => {
        cy.nodes().forEach((node) => {
          const visible = isLegendVisible(node);
          node.toggleClass("legend-hidden", !visible);
        });
        cy.edges().forEach((edge) => {
          const hide =
            edge.source().hasClass("legend-hidden") ||
            edge.target().hasClass("legend-hidden");
          edge.toggleClass("legend-edge-hidden", hide);
        });
      });
    }

    function setLegendFilter(fn) {
      legendFilterFn = typeof fn === "function" ? fn : null;
      applyLegendFilter();
    }

    function cleanupAutoExpandLevels() {
      if (!cy) {
        autoExpandLevels.clear();
        return;
      }
      const validKeys = new Set();
      cy.nodes().forEach((node) => validKeys.add(node.id()));
      for (const key of Array.from(autoExpandLevels.keys())) {
        if (!validKeys.has(key)) {
          autoExpandLevels.delete(key);
        }
      }
    }

    function seedAutoExpandLevels(force = false) {
      if (!cy) return;
      cleanupAutoExpandLevels();
      cy.nodes().forEach((node) => {
        if (force || !autoExpandLevels.has(node.id())) {
          autoExpandLevels.set(node.id(), 0);
        }
      });
    }

    function getAutoExpandDepthLimit() {
      const raw =
        typeof getAutoExpandDepth === "function"
          ? Number.parseInt(getAutoExpandDepth(), 10)
          : Number.NaN;
      if (!Number.isFinite(raw)) {
        return 1;
      }
      return Math.min(Math.max(raw, 1), 5);
    }

    function nodeIsSeed(node) {
      return !!node?.data("seed");
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

    function clearGraph() {
      if (cy) {
        cy.destroy();
        cy = null;
        window.cy = null;
      }
      expandedNodes.clear();
      autoExpandLevels.clear();
      autoExpandRunning = false;
      autoExpandGeneration = 0;
      if (onGraphCleared) {
        onGraphCleared();
      }
    }

    function resetAutoExpandProgress() {
      expandedNodes.clear();
      autoExpandLevels.clear();
      seedAutoExpandLevels(true);
      autoExpandRunning = false;
      autoExpandGeneration++;
      if (els.autoExpandToggle?.checked) {
        queueAutoExpand(true);
      }
    }

    function getLayoutOptions() {
      const layoutName = els.layoutSelect?.value || "cose";
      const animate = els.animateToggle ? !!els.animateToggle.checked : true;
      return { name: layoutName, padding: 20, animate };
    }

    async function appendExpansionResults(
      sourceKey,
      { force = false, reason = "expand" } = {}
    ) {
      if (!cy) return false;
      if (!force && expandedNodes.has(sourceKey)) return false;
      const parsed = (sourceKey || "").split(":");
      if (parsed.length !== 2) {
        expandedNodes.add(sourceKey);
        return false;
      }
      const [colId, nodeId] = parsed;
      const baseDepth = autoExpandLevels.get(sourceKey) ?? 0;
      const filterPayload =
        typeof getLegendFilters === "function" ? getLegendFilters() : [];
      const rows = await callApi("expand", {
        viewIds: state.viewIds,
        sourceColId: colId,
        sourceId: nodeId,
        maxNodes: getMaxNodes(),
        filters: filterPayload,
      }).then(unwrapData);

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

        const entityLabel = getEntityLabel(displayCol);
        const targetKey = `${displayCol}:${id}`;
        const nextDepth = baseDepth + 1;

        const existingNode = cy.getElementById(targetKey);
        if (existingNode && existingNode.length) {
          if (!existingNode.data("color") && color) {
            existingNode.data("color", color);
          }
          if (!existingNode.data("entityLabel")) {
            existingNode.data("entityLabel", entityLabel);
          }
          if (!existingNode.data("meta")) {
            existingNode.data("meta", { ...row, entityLabel });
          } else if (!existingNode.data("meta").entityLabel) {
            const updatedMeta = existingNode.data("meta");
            updatedMeta.entityLabel = entityLabel;
            existingNode.data("meta", updatedMeta);
          }
          const existingDepth = autoExpandLevels.get(targetKey);
          if (existingDepth === undefined || nextDepth < existingDepth) {
            autoExpandLevels.set(targetKey, nextDepth);
          }
        } else {
          nodesToAdd.push({
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
          autoExpandLevels.set(targetKey, nextDepth);
        }

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
          if (!edgeEle.data("meta")) {
            edgeEle.data("meta", {
              ...row,
              sourceColId: colId,
              sourceId: nodeId,
            });
          }
        } else {
          edgesToAdd.push({
            data: {
              id: `${sourceKey}|${targetKey}|${direction || "none"}`,
              source: sourceKey,
              target: targetKey,
              label,
              direction,
              sourceArrow,
              targetArrow,
              meta: {
                ...row,
                sourceColId: colId,
                sourceId: nodeId,
              },
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
      applyLegendFilter();

      if ((nodesToAdd.length || edgesToAdd.length) && onElementsAdded) {
        onElementsAdded({
          nodes: nodesToAdd.map(cloneElement).filter(Boolean),
          edges: edgesToAdd.map(cloneElement).filter(Boolean),
          reason,
          sourceId: sourceKey,
        });
      }

      expandedNodes.add(sourceKey);
      return nodesToAdd.length > 0 || edgesToAdd.length > 0;
    }

    async function autoExpandPendingNodes(token) {
      if (!cy) return;
      autoExpandRunning = true;
      try {
        seedAutoExpandLevels(false);
        while (
          cy &&
          token === autoExpandGeneration &&
          els.autoExpandToggle?.checked &&
          !(els.stopExpandToggle && els.stopExpandToggle.checked)
        ) {
          const depthLimit = getAutoExpandDepthLimit();
          const candidates = cy
            .nodes()
            .toArray()
            .filter((n) => {
              const level = autoExpandLevels.get(n.id()) ?? 0;
              return !expandedNodes.has(n.id()) && level < depthLimit;
            });
          const pending = candidates.length;
          if (!pending) break;
          const pendingLabel =
            translate("statusAutoExpandPending") || "Pending";
          setStatus(
            `${translate("statusAutoExpanding")} (${pendingLabel}: ${pending})`
          );
          const nextNode = candidates[0];
          await appendExpansionResults(nextNode.id(), {
            reason: "autoExpand",
          });
        }
        if (token === autoExpandGeneration) {
          if (els.autoExpandToggle) {
            els.autoExpandToggle.checked = false;
          }
          setStatus(translate("statusAutoExpandComplete"));
        }
      } catch (err) {
        if (token === autoExpandGeneration) {
          if (els.autoExpandToggle) {
            els.autoExpandToggle.checked = false;
          }
          setStatus(err.message);
        }
      } finally {
        if (token === autoExpandGeneration) {
          autoExpandRunning = false;
        }
      }
    }

    function queueAutoExpand(force = false) {
      if (!els.autoExpandToggle || !els.autoExpandToggle.checked) return;
      if (els.stopExpandToggle?.checked) return;
      if (!cy) return;
      if (autoExpandRunning && !force) return;

      seedAutoExpandLevels(false);

      if (force) {
        autoExpandGeneration++;
        autoExpandRunning = false;
      } else if (!autoExpandRunning) {
        autoExpandGeneration++;
      }

      autoExpandPendingNodes(autoExpandGeneration);
    }

    function buildNodeInfoPayload(node) {
      if (!node) return null;
      const [type = "", rawId = ""] = (node.id() || "").split(":");
      const nodeMeta = node.data("meta") || {};
      const entityLabel =
        node.data("entityLabel") ||
        nodeMeta.entityLabel ||
        getEntityLabel(type);
      const connections = node
        .connectedEdges()
        .toArray()
        .map((edge) => {
          const source = edge.source();
          const target = edge.target();
          if (!source || !target) return null;
          const isSource = source.id() === node.id();
          const neighbor = isSource ? target : source;
          if (!neighbor || !neighbor.id()) return null;
          const [neighborType = "", neighborRawId = ""] = (
            neighbor.id() || ""
          ).split(":");
          const neighborMeta = neighbor.data("meta") || {};
          const entityLabelNeighbor =
            neighbor.data("entityLabel") ||
            neighborMeta.entityLabel ||
            getEntityLabel(neighborType);
          return {
            edgeId: edge.id(),
            edgeLabel: edge.data("label") || "",
            direction: edge.data("direction") || "",
            orientation: isSource ? "outgoing" : "incoming",
            neighbor: {
              key: neighbor.id(),
              type: neighborType,
              id: neighborRawId || neighbor.id(),
              label: neighbor.data("label") || "",
               entityLabel: entityLabelNeighbor,
              color: neighbor.data("color") || DEFAULT_NODE_COLOR,
            },
          };
        })
        .filter(Boolean);

      return {
        key: node.id(),
        type,
        id: rawId || node.id(),
        label: node.data("label") || "",
        color: node.data("color") || DEFAULT_NODE_COLOR,
        entityLabel,
        seed: !!node.data("seed"),
        meta: node.data("meta") || null,
        connections,
      };
    }

    function buildEdgeInfoPayload(edge) {
      if (!edge) return null;
      const edgeData = edge.data() || {};
      const source = edge.source();
      const target = edge.target();
      if (!source || !target) return null;
      const [sourceType = "", sourceRawId = ""] = (source.id() || "").split(
        ":"
      );
      const [targetType = "", targetRawId = ""] = (target.id() || "").split(
        ":"
      );
      const mapNode = (node, type, rawId) => ({
        key: node.id(),
        type,
        id: rawId || node.id(),
        label: node.data("label") || "",
        color: node.data("color") || DEFAULT_NODE_COLOR,
      });
      return {
        id: edgeData.id || edge.id(),
        label: edgeData.label || "",
        direction: edgeData.direction || "",
        source: mapNode(source, sourceType, sourceRawId),
        target: mapNode(target, targetType, targetRawId),
        meta: edge.data("meta") || null,
      };
    }

    function buildStyle() {
      const palette =
        state.theme === "dark"
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
        { selector: "node.legend-hidden", style: { display: "none" } },
        {
          selector: "node.path-node",
          style: {
            "border-width": 5,
            "border-color": "data(pathColor)",
            "border-opacity": 1,
          },
        },
        {
          selector: "node.path-node.path-node-dim",
          style: {
            "border-opacity": 0.25,
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
        { selector: "edge.legend-edge-hidden", style: { display: "none" } },
        {
          selector: "edge.path-base-edge",
          style: {
            "line-color": "data(pathColor)",
            width: 6,
            "target-arrow-shape": "data(pathTargetShape)",
            "source-arrow-shape": "data(pathSourceShape)",
            "target-arrow-color": "data(pathColor)",
            "source-arrow-color": "data(pathColor)",
            "line-cap": "round",
            "z-index-compare": "manual",
            "z-index": 999,
            opacity: 1,
          },
        },
        {
          selector: "edge.path-base-edge.path-edge-dim",
          style: {
            opacity: 0.35,
          },
        },
        { selector: "node.path-focus-hidden", style: { display: "none" } },
        { selector: "edge.path-focus-hidden", style: { display: "none" } },
        { selector: "node.leaf-hidden", style: { display: "none" } },
        { selector: "edge.leaf-edge-hidden", style: { display: "none" } },
      ];
    }

    function runLayout() {
      if (!cy) return;
      cy.layout(getLayoutOptions()).run();
    }

    function refreshStyle() {
      if (!cy) return;
      cy.style(buildStyle());
      updateLeafVisibility();
      applyLegendFilter();
    }

    function replaceElements(
      nodes,
      edges,
      { resetState = false, applyLayout = true } = {}
    ) {
      if (!cy) {
        renderGraph(nodes, edges);
      } else {
        cy.startBatch();
        try {
          cy.elements().remove();
          cy.add(cloneElements(nodes));
          cy.add(cloneElements(edges));
        } finally {
          cy.endBatch();
        }
        if (applyLayout) {
          runLayout();
        } else {
          cy.resize();
        }
        updateLeafVisibility();
        applyLegendFilter();
        autoExpandLevels.clear();
        seedAutoExpandLevels(true);
        if (els.autoExpandToggle?.checked) {
          queueAutoExpand(true);
        }
      }
      if (resetState) {
        expandedNodes.clear();
        autoExpandRunning = false;
        autoExpandGeneration++;
      }
    }

    function getElementsSnapshot() {
      if (!cy) {
        return { nodes: [], edges: [] };
      }
      const nodeJson = cy.nodes().map((node) => node.json());
      const edgeJson = cy.edges().map((edge) => edge.json());
      return {
        nodes: cloneElements(nodeJson),
        edges: cloneElements(edgeJson),
      };
    }

    function renderGraph(nodes, edges) {
      const style = buildStyle();
      if (!cy) {
        cy = cytoscape({
          container: els.graph,
          elements: { nodes, edges },
          layout: getLayoutOptions(),
          style,
        });
        window.cy = cy;
      } else {
        cy.elements().remove();
        cy.add(nodes).add(edges);
        cy.style(style);
        runLayout();
      }

      cy.removeListener("tap", "node");
      cy.on("tap", "node", async (event) => {
        const tapped = event.target;
        if (!tapped || !tapped.id()) return;
        let nodePayload = null;
        try {
          nodePayload = buildNodeInfoPayload(tapped);
        } catch (err) {
          console.error("Failed to build node info", err);
        }
        if (nodePayload && onNodeSelected) {
          onNodeSelected(nodePayload);
        }
        if (els.stopExpandToggle && els.stopExpandToggle.checked) {
          return;
        }
        setStatus(translate("statusExpandingNode"));
        try {
          await appendExpansionResults(tapped.id(), {
            force: true,
            reason: "manualExpand",
          });
          queueAutoExpand();
          setStatus(translate("statusNodeExpanded"));
        } catch (err) {
          setStatus(err.message);
        }
      });

      cy.removeListener("tap", "edge");
      cy.on("tap", "edge", (event) => {
        const tappedEdge = event.target;
        if (!tappedEdge) return;
        let edgePayload = null;
        try {
          edgePayload = buildEdgeInfoPayload(tappedEdge);
        } catch (err) {
          console.error("Failed to build edge info", err);
        }
        if (edgePayload && onEdgeSelected) {
          onEdgeSelected(edgePayload);
        }
      });

      updateLeafVisibility();
      applyLegendFilter();
      autoExpandLevels.clear();
      seedAutoExpandLevels(true);
      if (els.autoExpandToggle?.checked) {
        queueAutoExpand(true);
      }
    }

    return {
      renderGraph,
      replaceElements,
      getElementsSnapshot,
      clearGraph,
      resetAutoExpandProgress,
      queueAutoExpand,
      updateLeafVisibility,
      deriveArrows,
      runLayout,
      refreshStyle,
      setLegendFilter,
      applyLegendFilter,
    };
  };
})(window);
