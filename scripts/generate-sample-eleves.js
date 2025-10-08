const ExcelJS = require('exceljs');
const path = require('path');
(async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Eleves');
  sheet.addRow(['Matricule', 'Nom', 'Prénoms', 'Sexe', 'DateNaissance']);
  sheet.addRow(['ELV001', 'Kouassi', 'Jean', 'M', '2012-04-12']);
  sheet.addRow(['ELV002', 'Diabaté', 'Awa', 'F', '2013-07-22']);
  sheet.addRow(['ELV003', 'Traoré', 'Ousmane', 'M', '2011-11-03']);

  const out = path.join(__dirname, '..', 'eleves-sample.xlsx');
  await workbook.xlsx.writeFile(out);
  console.log('Sample file generated at', out);
})();
