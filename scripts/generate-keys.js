#!/usr/bin/env node
const { generateKeyPairSync } = require('crypto');
const { writeFileSync, mkdirSync } = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'keys');
mkdirSync(outDir, { recursive: true });

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

writeFileSync(path.join(outDir, 'private.pem'), privateKey, { mode: 0o600 });
writeFileSync(path.join(outDir, 'public.pem'), publicKey);

console.log('Clés RSA générées:');
console.log(' - private:', path.join(outDir, 'private.pem'));
console.log(' - public :', path.join(outDir, 'public.pem'));
console.log('\nImportant: protégez la clé privée. Ne la commitez pas dans le dépôt.');
