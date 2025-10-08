const { db } = require('../src/utils/database');

// Script pour corriger les labels des échéances existantes
function fixEcheancesLabels() {
  console.log('Correction des labels des échéances...');
  
  try {
    const fraisScolaires = db.getAll('fraisScolaires') || [];
    let updated = 0;
    
    fraisScolaires.forEach(frais => {
      if (frais.echeances && frais.echeances.length > 0) {
        let needsUpdate = false;
        const updatedEcheances = frais.echeances.map(echeance => {
          let correctLabel = echeance.label;
          
          // Corriger les labels selon la modalité
          if (echeance.modalite === 1) {
            correctLabel = 'Inscription';
          } else if (echeance.modalite === 2) {
            correctLabel = 'Versement 1';
          } else if (echeance.modalite === 3) {
            correctLabel = 'Versement 2';
          } else if (echeance.modalite === 4) {
            correctLabel = 'Versement 3';
          } else if (echeance.modalite === 5) {
            correctLabel = 'Versement 4';
          } else if (echeance.modalite === 6) {
            correctLabel = 'Versement 5';
          } else if (echeance.modalite === 7) {
            correctLabel = 'Versement 6';
          }
          
          if (correctLabel !== echeance.label) {
            needsUpdate = true;
            console.log(`  ${frais.niveau}: Modalité ${echeance.modalite} - "${echeance.label}" → "${correctLabel}"`);
          }
          
          return {
            ...echeance,
            label: correctLabel
          };
        });
        
        if (needsUpdate) {
          db.update('fraisScolaires', frais.id, {
            ...frais,
            echeances: updatedEcheances,
            updatedAt: new Date().toISOString()
          });
          updated++;
        }
      }
    });
    
    console.log(`✅ Correction terminée. ${updated} configurations de frais mises à jour.`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  }
}

// Exécuter le script
fixEcheancesLabels();
