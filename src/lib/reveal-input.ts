// Tap-to-insert reveal: after a "Try this" prompt fills a field, the field may be
// off-screen (mobile especially), so the user can't tell it's ready. Focus it —
// which also raises the mobile keyboard — and scroll it into view, caret at the
// end so Enter runs the whole prompt.
export function revealInput(
  el: HTMLInputElement | HTMLTextAreaElement | null
): void {
  if (!el) return;
  requestAnimationFrame(() => {
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const end = el.value.length;
    try {
      el.setSelectionRange(end, end);
    } catch {
      // Some input types don't support selection ranges; caret position is a
      // nicety, not essential.
    }
  });
}
