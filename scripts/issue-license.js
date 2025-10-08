#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

async function main() {
  try {
    const args = require('minimist')(process.argv.slice(2));
    const days = Number(args.days || 365);
    const type = args.type || 'annuelle';
  const ecoleId = args.ecoleId || `ECOLE_${Date.now()}`;
  const ecoleIdStr = String(ecoleId);
    const keyPath = args.key || path.join(__dirname, 'keys', 'private.pem');

    if (!fs.existsSync(keyPath)) {
      console.error('Clé privée introuvable:', keyPath);
      process.exit(1);
    }

    const privateKeyPem = fs.readFileSync(keyPath, 'utf8');

    const payload = { type };
    const options = {
      algorithm: 'RS256',
      issuer: 'klasnet:licence-server',
      subject: ecoleIdStr,
      expiresIn: `${days}d`
    };

    const token = jwt.sign(payload, privateKeyPem, options);

  const safeId = ecoleIdStr.replace(/[^a-z0-9_\-]/gi, '_');
  const out = path.join(__dirname, `license_${safeId}_${Date.now()}.lic`);
    fs.writeFileSync(out, token);
    console.log('Licence émise:', out);
    console.log(token);
  } catch (err) {
    console.error('Erreur émission licence:', err);
    process.exit(1);
  }
}

main();
