const CONVOCATION_LEAD_DAYS = 12;

function computeDeadlineHtmlMock(echeancesDates, now) {
  try {
    const today = new Date(now);
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dates = (echeancesDates || [])
      .filter(Boolean)
      .map(d => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime());
    if (dates.length === 0) return '';

    let chosen = dates.find(d => d.getTime() >= startOfToday.getTime());
    if (!chosen) chosen = dates[dates.length - 1];

    const deadline = new Date(chosen.getTime());
    deadline.setDate(deadline.getDate() - CONVOCATION_LEAD_DAYS);

    if (deadline.getTime() < startOfToday.getTime()) {
      return `<div class="print-deadline">Date limite de paiement : <strong>Dès que possible</strong></div>`;
    }

    const formatted = deadline.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    return `<div class="print-deadline">Date limite de paiement : Avant le ${capitalized}</div>`;
  } catch (err) {
    return '';
  }
}

// Test case from your screenshot
const echeances = ['2025-09-01'];
const now = '2025-09-21T12:00:00';
console.log('Echéances:', echeances);
console.log('Now:', now);
console.log('Output HTML:\n', computeDeadlineHtmlMock(echeances, now));
