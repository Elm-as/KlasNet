export function formatNomPrenoms(person?: { nom?: string; prenoms?: string } | null): string {
  if (!person) return '';
  const nom = (person.nom || '').toString().trim();
  const prenoms = (person.prenoms || '').toString().trim();
  if (!nom && !prenoms) return '';
  if (!nom) return prenoms;
  if (!prenoms) return nom;
  return `${nom} ${prenoms}`;
}

export function formatSurname(nom?: string | null): string {
  return (nom || '').toString().trim().toUpperCase();
}

export function formatPrenomsNom(person?: { nom?: string; prenoms?: string } | null): string {
  if (!person) return '';
  const nom = (person.nom || '').toString().trim();
  const prenoms = (person.prenoms || '').toString().trim();
  if (!nom && !prenoms) return '';
  if (!prenoms) return nom;
  return `${prenoms} ${nom}`;
}
