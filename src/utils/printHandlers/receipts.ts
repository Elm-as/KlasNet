export function openReceiptsPreviewFromElementId(elementId: string, title = 'Aperçu', twoUp = true) {
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
        @page { 
          size: A4 portrait; 
          margin: 8mm; 
          background: white;
        }
        
        :root { 
          --page-height: 297mm; 
          --print-margin: 8mm; 
          --cut-gap: 6mm;
          --primary-blue: #1e40af;
          --primary-green: #059669;
          --accent-gold: #d97706;
          --text-dark: #1f2937;
          --text-gray: #6b7280;
          --border-light: #e5e7eb;
          --bg-light: #f9fafb;
        }
        
        html, body { 
          height: 100%; 
          margin: 0; 
          padding: 0; 
          background: white;
          font-family: 'Times New Roman', Times, serif;
          color: var(--text-dark);
          line-height: 1.4;
        }

        /* Layout containers */
        .receipt-wrapper { 
          width: 210mm; 
          margin: 0 auto; 
          box-sizing: border-box; 
          height: var(--page-height); 
        }
        
        .print-content { 
          box-sizing: border-box; 
          padding: calc(var(--print-margin) - 2mm); 
          display: block; 
          height: calc(var(--page-height)); 
        }

        /* Two-up layout improvements */
        .print-content.two-up { 
          display: flex; 
          flex-direction: column; 
          justify-content: space-between; 
          gap: var(--cut-gap); 
          page-break-after: always; 
        }
        /* Visible cut indicator for two-up double receipts */
        .print-content.two-up::before {
          content: '✂ Découper ici';
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: calc(50% - 10px);
          background: white;
          padding: 4px 10px;
          border-radius: 999px;
          font-weight: 700;
          color: var(--primary-blue);
          border: 1px solid rgba(0,0,0,0.06);
          z-index: 10;
        }
        
        .print-content.two-up .receipt-compact {
          /* Force each receipt to occupy exactly 50% of the printable area (minus cut gap) */
          height: calc((var(--page-height) - (var(--print-margin) * 2) - var(--cut-gap)) / 2);
          box-sizing: border-box;
          padding: 8px 12px;
          background: white;
          border: 2px solid var(--primary-blue);
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(30, 64, 175, 0.1);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        /* Main receipt card styling */
        .receipt-compact { 
          box-sizing: border-box; 
          width: 100%; 
          max-width: 780px; 
          margin: 0 auto; 
          background: white; 
          padding: 20px 24px; 
          border-radius: 12px; 
          border: 2px solid var(--primary-blue);
          box-shadow: 0 4px 12px rgba(30, 64, 175, 0.12);
          page-break-inside: avoid; 
          break-inside: avoid; 
          display: flex; 
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* Decorative elements */
        .receipt-compact::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--primary-blue) 0%, var(--primary-green) 50%, var(--accent-gold) 100%);
        }

        .receipt-compact::after {
          content: '';
          position: absolute;
          top: 12px;
          right: 12px;
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-green) 100%);
          border-radius: 50%;
          opacity: 0.05;
          z-index: 0;
        }

        .receipt-compact > * {
          position: relative;
          z-index: 1;
        }

        /* Page break styling for non two-up */
        .print-content:not(.two-up) .receipt-compact:not(:last-child) { 
          page-break-after: always; 
        }
        
        .receipt-compact + .receipt-compact { 
          margin-top: 10mm; 
          border-top: 2px dashed var(--primary-blue); 
          position: relative; 
        }
        
        .receipt-compact + .receipt-compact::before { 
          content: '✂ Découper ici'; 
          position: absolute; 
          top: -8mm; 
          left: 50%; 
          transform: translateX(-50%); 
          background: white; 
          padding: 4px 16px; 
          color: var(--primary-blue); 
          font-size: 11px; 
          font-weight: 600;
          border: 1px solid var(--primary-blue);
          border-radius: 20px;
          z-index: 10;
        }

        /* Header improvements */
        .receipt-compact .entete { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 16px; 
          padding-bottom: 12px; 
          border-bottom: 2px solid var(--bg-light);
          margin-bottom: 16px;
        }
        
        .receipt-compact .entete img { 
          width: 70px; 
          height: 70px; 
          object-fit: contain; 
          border-radius: 8px;
          border: 2px solid var(--border-light);
          padding: 4px;
          background: var(--bg-light);
        }
        
        .receipt-compact .entete .entete-text { 
          text-align: center; 
          flex: 1;
        }
        
        .receipt-compact .entete .entete-text .school-name { 
          font-weight: 800; 
          font-size: 22px; 
          letter-spacing: -0.025em; 
          color: var(--primary-blue);
          text-shadow: 0 1px 2px rgba(30, 64, 175, 0.1);
          margin-bottom: 4px;
        }
        
        .receipt-compact .entete .entete-text .libelle { 
          color: var(--primary-green); 
          font-weight: 600; 
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .receipt-compact .meta { 
          display: flex; 
          justify-content: space-between; 
          font-size: 12px; 
          color: var(--text-gray); 
          margin-top: 8px;
          padding: 8px 12px;
          background: var(--bg-light);
          border-radius: 6px;
          border-left: 3px solid var(--accent-gold);
        }

        /* Student info styling */
        .receipt-compact .student-row { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          gap: 16px; 
          margin: 16px 0;
          padding: 12px;
          background: linear-gradient(135deg, rgba(30, 64, 175, 0.02) 0%, rgba(5, 150, 105, 0.02) 100%);
          border-radius: 8px;
          border: 1px solid var(--border-light);
        }
        
        .receipt-compact .student-row .left { 
          flex: 1;
          max-width: 65%; 
        }
        
        .receipt-compact .student-row .right { 
          text-align: right; 
          color: var(--text-dark); 
          font-weight: 700;
          font-size: 18px; /* slightly larger for amounts */
        }

        /* Title styling */
        h4 { 
          text-align: center; 
          font-size: 20px; 
          margin: 16px 0 20px; 
          font-weight: 800;
          color: var(--primary-blue);
          text-transform: uppercase;
          letter-spacing: 1px;
          position: relative;
        }

        h4::after {
          content: '';
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 3px;
          background: linear-gradient(90deg, var(--primary-blue), var(--primary-green));
          border-radius: 2px;
        }

        /* Table improvements */
        table { 
          width: 100%; 
          border-collapse: separate;
          border-spacing: 0;
          font-size: 15px;
          margin: 16px 0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        thead tr { 
          background: linear-gradient(135deg, var(--primary-blue), var(--primary-green));
          color: white; 
        }
        
        th, td { 
          padding: 12px 16px; 
          border-bottom: 1px solid var(--border-light);
          vertical-align: middle;
        }
        
        th { 
          text-align: left; 
          font-weight: 700;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        tbody tr:nth-child(even) {
          background: rgba(249, 250, 251, 0.5);
        }
        
        tbody tr:hover {
          background: rgba(30, 64, 175, 0.03);
        }
        
        td.amount, .text-right { 
          text-align: right; 
          font-weight: 700; 
          color: var(--primary-green);
          font-size: 15px;
        }

        tfoot tr {
          background: var(--bg-light);
          border-top: 2px solid var(--primary-blue);
        }

        tfoot td {
          font-weight: 900;
          font-size: 18px;
          color: var(--primary-blue);
          border-bottom: none;
        }

        /* Summary box improvements */
        .summary-box { 
          margin-top: 20px; 
          padding: 20px; 
          border-radius: 12px; 
          background: linear-gradient(135deg, rgba(30, 64, 175, 0.02) 0%, rgba(5, 150, 105, 0.02) 100%);
          border: 2px solid var(--border-light);
          border-left: 4px solid var(--primary-blue);
          page-break-inside: avoid; 
        }
        
        .summary-grid { 
          display: grid; 
          grid-template-columns: 1fr auto; 
          gap: 12px 20px; 
          align-items: center; 
        }
        
        .summary-grid .label { 
          color: var(--text-gray);
          font-weight: 500;
          font-size: 13px;
        }
        
        .summary-grid .value { 
          text-align: right; 
          font-weight: 900;
          font-size: 16px; /* bigger for clarity */
        }
        
        .summary-grid .value.secondary { 
          font-weight: 700; 
          color: var(--text-dark); 
        }
        
        .summary-grid .value.alert { 
          color: #dc2626;
        }

        /* Footer styling */
        .muted { 
          color: var(--text-gray); 
          text-align: center; 
          margin-top: 20px; 
          font-size: 11px;
          font-style: italic;
          padding-top: 12px;
          border-top: 1px solid var(--border-light);
        }

        /* Compact mode adjustments */
        .print-content.two-up .receipt-compact .entete img { 
          width: 45px; 
          height: 45px; 
        }
        
        .print-content.two-up .receipt-compact .entete .entete-text .school-name { 
          font-size: 16px; 
        }
        
        .print-content.two-up h4 { 
          font-size: 14px; 
          margin: 12px 0 16px; 
        }
        
        .print-content.two-up table { 
          font-size: 11px; 
          margin: 12px 0;
        }
        
        .print-content.two-up th, .print-content.two-up td { 
          padding: 8px 12px; 
        }
        
        .print-content.two-up .summary-box { 
          padding: 12px 16px; 
          margin-top: 12px;
        }

        .print-content.two-up .summary-grid {
          gap: 8px 16px;
        }

        .print-content.two-up .summary-grid .value {
          font-size: 13px;
        }

        /* Force compact mode */
        .force-compact .receipt-compact { 
          padding: 12px 16px; 
          border-radius: 6px; 
        }
        
        .force-compact .receipt-compact .entete img { 
          width: 35px; 
          height: 35px; 
        }
        
        .force-compact .receipt-compact .entete .entete-text .school-name { 
          font-size: 14px; 
        }
        
        .force-compact h4 { 
          font-size: 12px;
          margin: 8px 0 12px;
        }
        
        .force-compact table { 
          font-size: 10px;
          margin: 10px 0;
        }
        
        .force-compact th, .force-compact td { 
          padding: 6px 10px; 
        }
        
        .force-compact .summary-box { 
          padding: 10px 12px; 
          margin-top: 10px;
        }
        
        .force-compact .muted { 
          font-size: 9px;
          margin-top: 12px;
        }

        /* Print-specific adjustments */
        @media print {
          body { 
            -webkit-print-color-adjust: exact; 
            color-adjust: exact; 
            print-color-adjust: exact;
          }
          
          .receipt-compact { 
            box-shadow: none !important; 
            border: 2px solid var(--primary-blue) !important;
          }
          
          .receipt-wrapper { 
            padding: 0; 
          }

          /* Ensure gradients print properly */
          .receipt-compact::before,
          thead tr,
          h4::after {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    `;

    // Rest of the function remains the same...
    let innerReceipts = '';
    
    if (twoUp) {
      try {
        const receiptsNodes = doc.querySelectorAll('.receipt-compact');
        if (receiptsNodes && receiptsNodes.length > 0) {
          const pages = [];
          for (let i = 0; i < receiptsNodes.length; i += 2) {
            const a = receiptsNodes[i].outerHTML;
            const b = receiptsNodes[i + 1] ? receiptsNodes[i + 1].outerHTML : '';
            pages.push(`<div class="print-content two-up">${a}${b}</div>`);
          }
          innerReceipts = pages.join('');
        } else {
          innerReceipts = `<div class="print-content two-up"><div class="receipt-compact">${contentSource}</div><div class="receipt-compact">${contentSource}</div></div>`;
        }
      } catch (e) {
        innerReceipts = `<div class="print-content two-up"><div class="receipt-compact">${contentSource}</div><div class="receipt-compact">${contentSource}</div></div>`;
      }
    } else {
      innerReceipts = `<div class="print-content">${contentSource}</div>`;
    }

    const printWrapperInner = innerReceipts;

    // Enhanced auto-adjust script with better scaling
    const autoAdjustScript = `
      <script>
        (function(){
          const TWO_UP = ${twoUp ? 'true' : 'false'};
          function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

          function mmToPx(mm){
            const div = document.createElement('div');
            div.style.position = 'absolute';
            div.style.left = '-9999px';
            div.style.height = mm + 'mm';
            document.body.appendChild(div);
            const px = div.getBoundingClientRect().height;
            document.body.removeChild(div);
            return px;
          }

          async function adjustAndPrint(){
            await sleep(200); // Allow more time for styles to load

            const pageHeightPx = mmToPx(297);
            const marginPx = mmToPx(8); // Updated margin
            const printablePx = pageHeightPx - marginPx * 2;

            const wrapper = document.querySelector('.receipt-wrapper');
            if (!wrapper){ 
              await sleep(200); 
              try{ window.print(); } catch(e){} 
              return; 
            }

            const cutGapPx = mmToPx(6); // Updated gap
            const receipts = Array.from(wrapper.querySelectorAll('.receipt-compact'));
            if (receipts.length === 0){ 
              await sleep(200); 
              try{ window.print(); } catch(e){} 
              return; 
            }

            const combinedHeight = receipts.reduce((acc, r) => acc + r.getBoundingClientRect().height, 0) + (receipts.length - 1) * cutGapPx;

            if (!TWO_UP){
              if (combinedHeight <= printablePx){ 
                await sleep(150); 
                try{ window.print(); } catch(e){} 
                return; 
              }
            } else {
              const perReceiptLimit = (printablePx - cutGapPx) / 2;
              const worst = Math.max(...receipts.map(r => r.getBoundingClientRect().height));
              if (worst <= perReceiptLimit){ 
                await sleep(150); 
                try{ window.print(); } catch(e){} 
                return; 
              }
            }

            let targetScale = 1;
            if (!TWO_UP){
              targetScale = Math.min(1, printablePx / combinedHeight);
            } else {
              const worst = Math.max(...receipts.map(r => r.getBoundingClientRect().height));
              const perReceiptLimit = (printablePx - cutGapPx) / 2;
              targetScale = Math.min(1, perReceiptLimit / worst);
            }

            const MIN_SCALE = 0.35; // Slightly higher minimum for better readability
            targetScale = Math.max(MIN_SCALE, targetScale);

            if (targetScale < 0.8){
              try{
                const outer = document.querySelector('.receipt-wrapper');
                if (outer && !outer.classList.contains('force-compact')){
                  outer.classList.add('force-compact');
                  await sleep(100);
                  
                  const receiptsAfterCompact = Array.from(outer.querySelectorAll('.receipt-compact'));
                  const worstAfter = Math.max(...receiptsAfterCompact.map(r => r.getBoundingClientRect().height));
                  const newPerLimit = (printablePx - cutGapPx) / 2;
                  
                  if (!TWO_UP){
                    const combinedAfter = receiptsAfterCompact.reduce((acc, r) => acc + r.getBoundingClientRect().height, 0) + (receiptsAfterCompact.length - 1) * cutGapPx;
                    targetScale = Math.min(1, printablePx / combinedAfter);
                  } else {
                    targetScale = Math.min(1, newPerLimit / worstAfter);
                  }
                  targetScale = Math.max(MIN_SCALE, targetScale);
                }
              } catch(e) { /* ignore */ }
            }

            // Smooth scaling with better progression
            document.body.style.transformOrigin = 'top left';
            const steps = 8;
            for (let i = 0; i < steps; i++){
              const progress = (i + 1) / steps;
              const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
              const s = 1 - ((1 - targetScale) * easeProgress);
              document.body.style.transform = 'scale(' + s + ')';
              await sleep(30);
            }

            // Final adjustments for two-up fallback
            const afterWorst = Math.max(...receipts.map(r => r.getBoundingClientRect().height * targetScale));
            if (TWO_UP){
              const perReceiptLimit = (printablePx - cutGapPx) / 2;
              if (afterWorst > perReceiptLimit + 2){
                try{
                  const newWrapper = document.createElement('div');
                  newWrapper.className = 'receipt-wrapper';
                  const content = document.createElement('div');
                  content.className = 'print-content';
                  
                  receipts.forEach((r, idx) => {
                    const c = document.createElement('div');
                    c.className = 'receipt-compact';
                    c.innerHTML = r.innerHTML;
                    content.appendChild(c);
                    if (idx < receipts.length - 1){
                      const br = document.createElement('div');
                      br.style.pageBreakAfter = 'always';
                      content.appendChild(br);
                    }
                  });
                  
                  newWrapper.appendChild(content);
                  document.body.innerHTML = '';
                  document.body.appendChild(newWrapper);
                  document.body.style.transform = '';
                } catch (e) { /* ignore */ }
              }
            }

            await sleep(200);
            try{ window.print(); } catch(e){}
          }

          adjustAndPrint();
        })();
      </script>
    `;

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>${style}</head><body><div class="receipt-wrapper">${printWrapperInner}</div>${autoAdjustScript}</body></html>`;

    const newWindow = window.open('', '_blank');
    if (!newWindow) return;
    newWindow.document.open();
    newWindow.document.write(html);
    newWindow.document.close();
    newWindow.focus();
    setTimeout(() => { try { newWindow.print(); } catch (e) {} }, 400);
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