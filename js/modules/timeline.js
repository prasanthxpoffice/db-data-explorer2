(function (window) {
  const GraphApp = (window.GraphApp = window.GraphApp || {});

  GraphApp.createTimelineModule = function ({
    els,
    translate,
    applySnapshot,
    onApplied,
    setStatus,
  }) {
    if (!els?.root || typeof applySnapshot !== "function") {
      return null;
    }

    const steps = [];
    let currentIndex = -1;
    let isJumping = false;

    function updateStepUI() {
      if (els.slider) {
        if (steps.length <= 1) {
          els.slider.disabled = true;
          els.slider.value = "0";
        } else {
          els.slider.disabled = false;
          els.slider.min = "0";
          els.slider.max = String(steps.length - 1);
          els.slider.value = String(currentIndex);
        }
      }
      if (els.clearBtn) {
        els.clearBtn.disabled =
          steps.length <= 1 || currentIndex === steps.length - 1;
      }
      if (els.stepLabel) {
        if (!steps.length) {
          els.stepLabel.textContent = translate("timelineEmpty");
        } else {
          const prefix = translate("timelineStepPrefix");
          const step = steps[currentIndex] || steps[steps.length - 1];
          els.stepLabel.textContent = `${prefix} ${currentIndex + 1}/${
            steps.length
          } · ${step.label}`;
        }
      }
    }

    function formatTimestamp(ts) {
      const date = new Date(ts);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function renderLog() {
      if (!els.log) return;
      if (!steps.length) {
        els.log.innerHTML = `<li class="timeline-log-empty">${translate(
          "timelineEmpty"
        )}</li>`;
        return;
      }
      const nodeLabel = translate("statusNodes");
      const edgeLabel = translate("statusEdges");
      els.log.innerHTML = steps
        .map((step, idx) => {
          const activeClass = idx === currentIndex ? "active" : "";
          const details = [
            `${nodeLabel}: ${step.nodes.length}`,
            `${edgeLabel}: ${step.edges.length}`,
          ].join(", ");
          return `<li class="${activeClass}" data-index="${idx}">
            <strong>${step.label}</strong>
            <small>${formatTimestamp(step.timestamp)}${
            details ? ` · ${details}` : ""
          }</small>
          </li>`;
        })
        .join("");
    }

    function jumpTo(index) {
      if (!steps.length) return;
      const target = Math.max(0, Math.min(index, steps.length - 1));
      if (target === currentIndex && !isJumping) return;
      const snapshot = steps[target];
      isJumping = true;
      try {
        applySnapshot(snapshot?.nodes || [], snapshot?.edges || []);
        onApplied?.();
        currentIndex = target;
        updateStepUI();
        renderLog();
      } finally {
        isJumping = false;
      }
    }

    function addStep(entry, { makeCurrent = true } = {}) {
      steps.push(entry);
      if (makeCurrent) {
        currentIndex = steps.length - 1;
      }
      updateStepUI();
      renderLog();
    }

    function recordReset({ nodes, edges, label }) {
      const step = {
        type: "reset",
        timestamp: Date.now(),
        label: label || translate("timelineFilterStep"),
        nodes,
        edges,
      };
      steps.length = 0;
      addStep(step);
    }

    function recordAppend({ nodes, edges, label }) {
      if (!steps.length) {
        recordReset({ nodes, edges, label });
        return;
      }
      if (!nodes.length && !edges.length) return;
      const step = {
        type: "append",
        timestamp: Date.now(),
        label: label || translate("timelineExpandStep"),
        nodes,
        edges,
      };
      addStep(step);
    }

    function clearFutureSteps() {
      if (steps.length <= 1 || currentIndex === steps.length - 1) {
        return;
      }
      steps.splice(currentIndex + 1);
      updateStepUI();
      renderLog();
      setStatus?.(translate("timelineCleared"));
    }

    function resetHistory() {
      steps.length = 0;
      currentIndex = -1;
      if (els.slider) {
        els.slider.disabled = true;
        els.slider.value = "0";
      }
      if (els.clearBtn) {
        els.clearBtn.disabled = true;
      }
      if (els.log) {
        els.log.innerHTML = `<li class="timeline-log-empty">${translate(
          "timelineEmpty"
        )}</li>`;
      }
      if (els.stepLabel) {
        els.stepLabel.textContent = translate("timelineEmpty");
      }
    }

    function refreshTranslations() {
      updateStepUI();
      renderLog();
    }

    els.slider?.addEventListener("input", (event) => {
      if (!steps.length) return;
      const value = Number(event.target.value);
      if (Number.isNaN(value)) return;
      jumpTo(value);
    });

    els.log?.addEventListener("click", (event) => {
      const item = event.target.closest("li[data-index]");
      if (!item) return;
      const idx = Number(item.dataset.index);
      if (Number.isNaN(idx)) return;
      jumpTo(idx);
    });

    els.clearBtn?.addEventListener("click", clearFutureSteps);

    resetHistory();

    return {
      recordReset,
      recordAppend,
      resetHistory,
      jumpTo,
      refreshTranslations,
    };
  };
})(window);
