#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

function usage() {
  console.log('Usage: node verify-license.js <license-file> [--pub=path/to/public.pem]');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) usage();

const licensePath = args[0];
const pubArg = args.find(a => a.startsWith('--pub='));
const pubPath = pubArg ? pubArg.split('=')[1] : path.join(__dirname, 'keys', 'public.pem');

if (!fs.existsSync(licensePath)) { console.error('Fichier licence introuvable:', licensePath); process.exit(2); }
if (!fs.existsSync(pubPath)) { console.error('Clé publique introuvable:', pubPath); process.exit(2); }

const token = fs.readFileSync(licensePath, 'utf8').trim();
const publicKey = fs.readFileSync(pubPath, 'utf8');

try {
  const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  console.log('Licence valide. Payload:');
  console.log(JSON.stringify(payload, null, 2));
} catch (err) {
  console.error('Échec vérification licence:', err.message || err);
  process.exit(3);
}
