(function (window) {
  const GraphApp = (window.GraphApp = window.GraphApp || {});

  GraphApp.createGraphModule = function ({
    state,
    els,
    defaults,
    dateDefaults,
    DEFAULT_NODE_COLOR,
    setStatus,
    translate,
    callApi,
    unwrapData,
    getMaxNodes,
    onNodeSelected,
    onEdgeSelected,
    onGraphCleared,
  }) {
    let cy = null;
    const expandedNodes = new Set();
    let autoExpandRunning = false;
    let autoExpandGeneration = 0;

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
      autoExpandRunning = false;
      autoExpandGeneration = 0;
      if (onGraphCleared) {
        onGraphCleared();
      }
    }

    function resetAutoExpandProgress() {
      expandedNodes.clear();
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

    async function appendExpansionResults(sourceKey, { force = false } = {}) {
      if (!cy) return false;
      if (!force && expandedNodes.has(sourceKey)) return false;
      const parsed = (sourceKey || "").split(":");
      if (parsed.length !== 2) {
        expandedNodes.add(sourceKey);
        return false;
      }
      const [colId, nodeId] = parsed;
      const rows = await callApi("expand", {
        viewIds: state.viewIds,
        sourceColId: colId,
        sourceId: nodeId,
        fromDate: dateDefaults.from,
        toDate: dateDefaults.to,
        maxNodes: getMaxNodes(),
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

      expandedNodes.add(sourceKey);
      return nodesToAdd.length > 0 || edgesToAdd.length > 0;
    }

    async function autoExpandPendingNodes(token) {
      if (!cy) return;
      autoExpandRunning = true;
      try {
        setStatus(translate("statusAutoExpanding"));
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
          setStatus(translate("statusAutoExpandComplete"));
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

    function queueAutoExpand(force = false) {
      if (!els.autoExpandToggle || !els.autoExpandToggle.checked) return;
      if (els.stopExpandToggle?.checked) return;
      if (!cy) return;
      if (autoExpandRunning && !force) return;

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
          await appendExpansionResults(tapped.id(), { force: true });
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
    }

    return {
      renderGraph,
      clearGraph,
      resetAutoExpandProgress,
      queueAutoExpand,
      updateLeafVisibility,
      deriveArrows,
      runLayout,
      refreshStyle,
    };
  };
})(window);
