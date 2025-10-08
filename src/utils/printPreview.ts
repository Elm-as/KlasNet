// Thin shim: keep backward-compatible function name but delegate to specialized handlers
import { openReceiptsPreviewFromElementId } from './printHandlers/receipts';
import { openConvocationsPreviewFromElementId } from './printHandlers/convocations';

/**
 * Backward-compatible function. If element has attribute data-print-mode="convocations" or the
 * element has class print-four-per-page we route to the convocations handler. Otherwise we use receipts handler.
 */
export function openPrintPreviewFromElementId(elementId: string, title = 'Aperçu') {
  const el = document.getElementById(elementId);
  if (!el) return;
  const isConvocations = el.getAttribute('data-print-mode') === 'convocations' || el.classList.contains('print-four-per-page');
  if (isConvocations) return openConvocationsPreviewFromElementId(elementId, title);
  // default: receipts path. If element carries data-print-two-up we pass twoUp true
  const twoUp = !!el.getAttribute && !!el.getAttribute('data-print-two-up');
  return openReceiptsPreviewFromElementId(elementId, title, twoUp);
}
