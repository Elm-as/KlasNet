#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createPublicKey } = require('crypto');

function usage() {
  console.log('Usage: node scripts/check-keypair.js --priv="C:\\path\\to\\private.pem" [--pub="scripts/keys/public.pem"]');
  process.exit(2);
}

const args = require('minimist')(process.argv.slice(2));
const privPath = args.priv || args.private || args._[0];
const pubPath = args.pub || args.public || path.join(__dirname, 'keys', 'public.pem');

if (!privPath) return usage();
if (!fs.existsSync(privPath)) {
  console.error('Fichier private.pem introuvable:', privPath);
  process.exit(3);
}
if (!fs.existsSync(pubPath)) {
  console.error('Fichier public.pem introuvable:', pubPath);
  process.exit(4);
}

try {
  const priv = fs.readFileSync(privPath, 'utf8');
  const derivedPub = createPublicKey(priv).export({ type: 'spki', format: 'pem' }).toString();
  const repoPub = fs.readFileSync(pubPath, 'utf8').toString();

  const norm = s => s.replace(/\r/g, '\n').split('\n').map(l => l.trim()).filter(Boolean).join('\n');
  const d = norm(derivedPub);
  const r = norm(repoPub);

  console.log('--- Derived public key (from provided private.pem) ---');
  console.log(derivedPub);
  console.log('--- Repository public key (' + pubPath + ') ---');
  console.log(repoPub);

  if (d === r) {
    console.log('\nRESULT: MATCH — la clé privée correspond à la clé publique embarquée.');
    process.exit(0);
  } else {
    console.error('\nRESULT: MISMATCH — la clé privée NE CORRESPOND PAS à la clé publique embarquée.');
    process.exit(5);
  }
} catch (err) {
  console.error('Erreur lors de la vérification:', err.message || err);
  process.exit(10);
}
