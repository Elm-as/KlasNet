const fs = require('fs');
const path = require('path');
const rows = [
  ['Matricule','Nom','Prénoms','Sexe','DateNaissance'],
  ['ELV001','Kouassi','Jean','M','2012-04-12'],
  ['ELV002','Diabaté','Awa','F','2013-07-22'],
  ['ELV003','Traoré','Ousmane','M','2011-11-03']
];
const out = path.join(__dirname, '..', 'eleves-sample.csv');
fs.writeFileSync(out, rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n'), 'utf8');
console.log('Sample CSV generated at', out);
