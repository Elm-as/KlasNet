export function openConvocationsPreviewFromElementId(elementId: string, title = 'Aperçu convocations') {
  const el = document.getElementById(elementId);
  if (!el) return;
  try {
    const content = el.innerHTML;
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    doc.querySelectorAll('.no-print, button').forEach(e => e.remove());

    const contentSource = doc.body.innerHTML;

    const style = `
      <style>
        @page { size: A4 portrait; margin: 12mm; }
        :root { --page-height: 297mm; --print-margin: 12mm; }
        html,body { height: 100%; }
        body { font-family: 'Times New Roman', Times, serif; color: #111827; padding: 0; margin: 0; background: #ffffff; }
        .receipt-wrapper { width: 210mm; margin: 0 auto; padding: 0; box-sizing: border-box; }
        .convocations-wrapper { display: block; box-sizing: border-box; }
  .convocation { box-sizing: border-box; height: 65mm; padding: 6mm; overflow: visible; position: relative; }
        .convocation + .convocation { border-top: 1px dashed #444; margin-top: 4mm; padding-top: 4mm; }
        .convocation + .convocation::before { content: '\\2702'; position: absolute; top: -9mm; left: 50%; transform: translateX(-50%); background: white; padding: 0 3px; color: #444; font-size: 10px; }
  .convocation { break-inside: avoid; }
  /* ensure important / deadline markers render even when global CSS isn't loaded */
  .print-important { color: #b91c1c !important; font-weight: 800 !important; }
  .print-deadline { color: #7f1d1d !important; font-weight: 700 !important; font-size: 1.0rem !important; display: block; margin-top: 6px; }
        .convocation:nth-child(4n) { page-break-after: always; }
      </style>
    `;

    // Ensure convocation blocks are top-level siblings so CSS nth-child works
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>${style}</head><body><div class="receipt-wrapper print-four-per-page">${contentSource}</div></body></html>`;

    const newWindow = window.open('', '_blank');
    if (!newWindow) return;
    newWindow.document.open();
    newWindow.document.write(html);
    newWindow.document.close();
    newWindow.focus();
    setTimeout(() => { try { newWindow.print(); } catch (e) {} }, 300);
  } catch (e) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const newWindow = window.open('', '_blank');
    if (!newWindow) return;
    newWindow.document.open();
    newWindow.document.write('<html><head><title>' + title + '</title></head><body>' + el.innerHTML + '</body></html>');
    newWindow.document.close();
    newWindow.print();
  }
}
