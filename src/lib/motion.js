export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Calls `onChange(isVisible)` as the element enters or leaves the viewport; returns a cleanup. */
export function watchVisibility(element, onChange) {
  if (typeof IntersectionObserver === 'undefined') {
    onChange(true);
    return () => {};
  }
  const io = new IntersectionObserver((entries) => onChange(entries.some((e) => e.isIntersecting)), {
    threshold: 0.05,
  });
  io.observe(element);
  return () => io.disconnect();
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
