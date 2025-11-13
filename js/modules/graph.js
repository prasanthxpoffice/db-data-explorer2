(function (window) {
  const GraphApp = (window.GraphApp = window.GraphApp || {});

  GraphApp.createGraphModule = function ({
    state,
    els,
    defaults,
    dateDefaults,
    DEFAULT_NODE_COLOR,
    setStatus,
    callApi,
    unwrapData,
    getMaxNodes,
  }) {
    let cy = null;
    const expandedNodes = new Set();
    let autoExpandRunning = false;
    let autoExpandGeneration = 0;

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
              id: `${sourceKey}|${targetKey}|${direction || "none"}`,
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
        if (els.stopExpandToggle && els.stopExpandToggle.checked) {
          return;
        }
        const tapped = event.target;
        if (!tapped || !tapped.id()) return;
        setStatus("Expanding node...");
        try {
          await appendExpansionResults(tapped.id(), { force: true });
          queueAutoExpand();
          setStatus("Node expanded.");
        } catch (err) {
          setStatus(err.message);
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
