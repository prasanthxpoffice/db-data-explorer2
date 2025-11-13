(() => {
  const targets = Array.from(document.querySelectorAll("[data-partial]"));
  const loads = targets.map((el) =>
    fetch(el.dataset.partial)
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`Failed to load ${el.dataset.partial}`);
        }
        return resp.text();
      })
      .then((html) => {
        el.innerHTML = html;
      })
  );

  Promise.all(loads)
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      document.dispatchEvent(new Event("partials:ready"));
    });
})();
