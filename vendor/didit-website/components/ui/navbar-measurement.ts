export type NavbarMeasurementCleanup = () => void;

/**
 * Keep the visible chrome offset current without forcing a layout read for
 * every ResizeObserver, resize, or scroll notification. All signals share one
 * requestAnimationFrame slot, so a burst costs at most one measurement.
 */
export function installNavbarMeasurement(
  nav: HTMLElement,
  onMeasure: (bottom: number) => void
): NavbarMeasurementCleanup {
  let outer = nav;
  let cursor = nav.parentElement;
  while (cursor) {
    if (cursor.tagName === "HEADER") outer = cursor;
    cursor = cursor.parentElement;
  }

  let raf = 0;
  const measure = () => {
    raf = 0;
    const bottom = Math.max(0, outer.getBoundingClientRect().bottom);
    onMeasure(bottom);
    document.documentElement.style.setProperty("--site-header-bottom", `${bottom}px`);
  };
  const scheduleMeasure = () => {
    if (!raf) raf = window.requestAnimationFrame(measure);
  };

  const resizeObserver = new ResizeObserver(scheduleMeasure);
  resizeObserver.observe(outer);
  scheduleMeasure();
  window.addEventListener("resize", scheduleMeasure);
  window.addEventListener("scroll", scheduleMeasure, { passive: true });

  return () => {
    resizeObserver.disconnect();
    if (raf) window.cancelAnimationFrame(raf);
    window.removeEventListener("resize", scheduleMeasure);
    window.removeEventListener("scroll", scheduleMeasure);
  };
}
