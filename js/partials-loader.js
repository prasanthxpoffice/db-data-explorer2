(() => {
  async function loadPartial(el) {
    const src = el?.dataset?.partial;
    if (!src) return;
    const resp = await fetch(src);
    if (!resp.ok) {
      throw new Error(`Failed to load ${src}`);
    }
    const html = await resp.text();
    el.innerHTML = html;
    el.removeAttribute("data-partial");
    const nested = Array.from(el.querySelectorAll("[data-partial]"));
    if (nested.length) {
      await Promise.all(nested.map(loadPartial));
    }
  }

  const targets = Array.from(document.querySelectorAll("[data-partial]"));
  Promise.all(targets.map(loadPartial))
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      document.dispatchEvent(new Event("partials:ready"));
    });
})();
