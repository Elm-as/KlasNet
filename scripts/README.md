Génération de licences (hors-ligne)
================================

Scripts disponibles:

- `generate-keys.js` : génère une paire RSA (private.pem, public.pem) dans `scripts/keys/`. Protégez `private.pem` (mode 600).
- `issue-license.js` : émet un JWT RS256 signé avec la clé privée. Usage :

  node issue-license.js --ecoleId=ECOLE_123 --days=365 --type=annuelle --key=./keys/private.pem

  Le script écrit un fichier `.lic` contenant le token JWT. Distribuez ce fichier au client.

Remarques de sécurité:
- Ne commitez jamais la clé privée dans le dépôt.
- Stockez la clé privée dans un emplacement sécurisé (HSM ou vault) pour production.
