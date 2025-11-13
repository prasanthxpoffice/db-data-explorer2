(function (window) {
  const GraphApp = (window.GraphApp = window.GraphApp || {});

  GraphApp.createLoadingTracker = function (overlayEl, delay = 400) {
    let pending = 0;
    let timer = null;

    function showOverlay(show) {
      if (!overlayEl) return;
      if (show) {
        overlayEl.removeAttribute("hidden");
      } else {
        overlayEl.setAttribute("hidden", "true");
      }
    }

    function begin() {
      pending += 1;
      if (!timer) {
        timer = window.setTimeout(() => {
          timer = null;
          if (pending > 0) {
            showOverlay(true);
          }
        }, delay);
      }
    }

    function end() {
      pending = Math.max(0, pending - 1);
      if (pending === 0) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        showOverlay(false);
      }
    }

    return { beginLoading: begin, endLoading: end };
  };
})(window);
