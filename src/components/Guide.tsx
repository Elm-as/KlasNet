import { useState, useEffect } from 'react';
import { Users, DollarSign, BookOpen, Settings, Search, AlertTriangle, TrendingUp, CheckCircle, Home, Upload, ArrowLeft, ArrowRight } from 'lucide-react';

const steps = [
  {
    title: "Bienvenue sur KlasNet !",
    description: "Bienvenue dans votre application de gestion scolaire KlasNet. Ce guide va vous accompagner pas à pas pour découvrir chaque fonctionnalité. Prenez le temps de lire chaque étape, puis cliquez sur 'Suivant'.\n\nNote : Vous pouvez relancer ce guide à tout moment en cliquant sur le bouton 'Guide' en haut à droite.",
    icon: <Home className="h-8 w-8 text-gray-600 mx-auto mb-3" />
  },
  {
    title: "Tableau de bord",
    description: "Le tableau de bord est la page d'accueil. Il affiche en temps réel :\n- Le nombre total d'élèves et d'élèves actifs\n- Les recettes totales et celles du mois\n- Les paiements complétés et en attente\n- Des graphiques pour visualiser l'évolution des finances\n\nEn bas, retrouvez les 'Actions Rapides' pour accéder directement aux fonctions principales.\n\nExemple : Cliquez sur 'Nouvel Élève' pour inscrire un nouvel élève en un seul clic.",
    icon: <TrendingUp className="h-8 w-8 text-gray-600 mx-auto mb-3" />
  },
  {
    title: "Gestion des élèves",
    description: "Dans le menu 'Élèves', vous pouvez :\n- Voir la liste de tous les élèves\n- Ajouter un nouvel élève (bouton 'Nouvel Élève')\n- Modifier ou supprimer un élève existant\n\nNote : Utilisez la barre de recherche pour retrouver rapidement un élève par nom, prénom ou matricule.\n\nExemple : Pour inscrire un nouvel élève, cliquez sur 'Nouvel Élève', remplissez le formulaire puis validez.",
    icon: <Users className="h-8 w-8 text-gray-600 mx-auto mb-3" />
  },
  {
    title: "Finances et paiements",
    description: "Dans la section 'Finances', vous pouvez :\n- Enregistrer un paiement pour un élève\n- Consulter l'historique des paiements\n- Voir la situation financière de chaque élève (solde, montant dû, etc.)\n\nExemple : Pour enregistrer un paiement, cliquez sur 'Nouveau Paiement', sélectionnez l'élève concerné et saisissez le montant.",
    icon: <DollarSign className="h-8 w-8 text-gray-600 mx-auto mb-3" />
  },
  {
    title: "Saisie des notes",
    description: "Dans la section 'Notes', vous pouvez :\n- Saisir les notes des élèves pour chaque matière et période\n- Consulter les moyennes et les résultats\n\nNote : Saisissez régulièrement les notes pour suivre la progression des élèves et générer les bulletins facilement.",
    icon: <BookOpen className="h-8 w-8 text-gray-600 mx-auto mb-3" />
  },
  {
    title: "Configuration",
    description: "Dans 'Configuration', personnalisez votre application :\n- Définissez l'année scolaire active\n- Ajoutez ou modifiez les frais scolaires\n- Gérez les compositions et les paramètres de l'école\n\nExemple : Pour changer d'année scolaire, saisissez la nouvelle année puis cliquez sur 'Changer'.\n\nNote : Vérifiez toujours que l'année scolaire active est correcte avant de saisir de nouvelles données.",
    icon: <Settings className="h-8 w-8 text-gray-600 mx-auto mb-3" />
  },
  {
    title: "Recherche rapide",
    description: "La barre de recherche (en haut de chaque page) vous permet de retrouver rapidement :\n- Un élève\n- Une classe\n- Un enseignant\n- Une opération financière\n\nTapez simplement un mot-clé (nom, prénom, etc.) et les résultats s'affichent instantanément.",
    icon: <Search className="h-8 w-8 text-gray-600 mx-auto mb-3" />
  },
  {
    title: "Historique et alertes",
    description: "KlasNet vous informe en temps réel :\n- Alertes sur les paiements en retard\n- Notifications pour les actions à effectuer (ex : élèves sans notes)\n- Historique des modifications (ajout, suppression, paiement, etc.)\n\nNote : Consultez régulièrement l'historique pour suivre l'activité de l'école et anticiper les besoins.",
    icon: <AlertTriangle className="h-8 w-8 text-gray-600 mx-auto mb-3" />
  },
  {
    title: "Import/Export Excel",
    description: "Gagnez du temps grâce à l'importation et l'exportation des listes d'élèves au format Excel.\n\n- Importez facilement une liste d'élèves depuis un fichier Excel.\n- Prévisualisez les données avant de valider l'importation.\n- Sélectionnez la classe d'affectation et vérifiez les colonnes importantes (Matricule, Nom, Prénoms).\n- Exportez la liste actuelle pour la partager ou l'archiver.\n\nNote : Vérifiez toujours l'aperçu avant de valider pour éviter les erreurs de saisie.",
    icon: <Upload className="h-8 w-8 text-gray-600 mx-auto mb-3" />
  },
  {
    title: "Prêt à commencer",
    description: "Vous êtes prêt à utiliser KlasNet.\n\nN'hésitez pas à explorer chaque menu, à utiliser la recherche et à consulter ce guide en cas de besoin.\n\nBonne gestion avec KlasNet.",
    icon: <CheckCircle className="h-8 w-8 text-gray-600 mx-auto mb-3" />
  }
];

export default function Guide({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleStepClick = (idx: number) => {
    setStep(idx);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg border border-gray-200 max-w-lg w-full mx-4 relative">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Guide d'utilisation</h2>
            <button 
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors" 
              onClick={onClose}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Barre de progression */}
          <div className="flex items-center mt-4 space-x-1">
            {steps.map((s, idx) => (
              <button
                key={idx}
                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                  idx <= step ? 'bg-gray-900' : 'bg-gray-200'
                }`}
                onClick={() => handleStepClick(idx)}
                aria-label={`Aller à l'étape ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6">
          <div className="text-center mb-6">
            {steps[step].icon}
            <h3 className="text-xl font-bold text-gray-900 mb-3">{steps[step].title}</h3>
          </div>
          
          <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line mb-8 min-h-[120px]">
            {steps[step].description}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <button
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Précédent</span>
            </button>
            
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {step + 1} / {steps.length}
            </span>
            
            {step < steps.length - 1 ? (
              <button
                className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                onClick={() => setStep(s => s + 1)}
              >
                <span>Suivant</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                onClick={onClose}
              >
                <CheckCircle className="h-4 w-4" />
                <span>Terminer</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}