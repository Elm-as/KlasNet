Installation et sécurisation — checklist rapide
=============================================

1) Nettoyer les comptes de démonstration
- Ouvrir l'application en tant qu'administrateur.
- Aller dans Gestion des utilisateurs.
- Supprimer les comptes de demo (teacher/director/test).
- Créer un compte administrateur pour l'école (email/identifiants).

2) Générer la paire de clés (pour l'éditeur)
- Sur ta machine (éditeur), lancer :
  node scripts/generate-keys.js
- Conserver `scripts/keys/private.pem` en lieu sûr (ne pas committer).
- Copier `scripts/keys/public.pem` pour l'intégrer dans l'application ou le conserver pour vérification.

3) Émettre la licence
- Récupérer `codeEtablissement` de l'installation (Configuration -> Ecole ou via export JSON).
- Lancer :
  node scripts/issue-license.js --ecoleId=LE_CODE --days=365 --type=annuelle --key=scripts/keys/private.pem
- Envoyer le fichier `.lic` généré à l'école.

4) Activation côté école
- Dans l'application : Configuration -> Gestion des licences -> coller le contenu du .lic -> Activer

5) Renouvellement / révocation
- Pour renouveler, émettre un nouveau .lic et demander à l'école de l'activer avant expiration.
- Pour révoquer, ajouter un endpoint serveur (optionnel) ou communiquer manuellement avec l'école.

Notes de sécurité
- Protéger la clé privée (HSM/KeyVault recommandé pour production).
- Ne pas partager le private.pem.

