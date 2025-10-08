import { db } from './database';

interface LicenceStatus {
  isValid: boolean;
  isExpired: boolean;
  daysRemaining: number;
  type: string;
  dateExpiration: string;
  lastCheck: string;
}

const LICENCE_STORAGE_KEY = 'klasnet_licence';
const LAST_CHECK_KEY = 'klasnet_last_check';
const ANTI_CHEAT_KEY = 'klasnet_time_check';

// Public key (PEM) — embed the public key used to sign licences. Replace if you rotate keys.
const DEFAULT_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoI1o4BX9ixXBWDH+KRGv
L8YdNrzhmTUiy1fJKAqyiA+JT9NCh0fL1xhnLundf0sGbTN6Cd91OkKbxbzpa99S
uWNzd9ISVYZXFFgVfQfBAyUDcjCQxPiypQT9K4aLTJQqf0H4gh985VzvwiwCM0C9
b2NwlCN304JU949CLJhIaExhIuuP0uvYC0heNwp6HjHYClppEmLoEgM3xE6hj/jW
nTraasw8aUSuDqn0dnrxnhRT1pD0ADDVHxfzaUKA0jKmuv2uvBhNvUrWCl9FoyDd
A7nMXmDJG5pnTkKmnNA3eU4ArY1uZsRVYss7iOR6gUa4f/XV8FUhtz00irZC54fW
PwIDAQAB
-----END PUBLIC KEY-----`;

export class LicenceManager {
  private static instance: LicenceManager;
  private publicKeyPem: string;

  static getInstance(): LicenceManager {
    if (!LicenceManager.instance) {
      LicenceManager.instance = new LicenceManager(DEFAULT_PUBLIC_KEY_PEM);
    }
    return LicenceManager.instance;
  }

  constructor(publicKeyPem?: string) {
    this.publicKeyPem = publicKeyPem || DEFAULT_PUBLIC_KEY_PEM;
  }

  // Verify a JWT RS256 token and return the payload (throws if invalid)
  private async verifyJwtAndGetPayload(token: string): Promise<any> {
    const [headerB64, payloadB64, sigB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !sigB64) throw new Error('Invalid JWT format');

  const encoder = new TextEncoder();
  const signedData = encoder.encode(`${headerB64}.${payloadB64}`);

  const sigArr = this.base64UrlToUint8Array(sigB64);

  const publicKey = await this.importPublicKey(this.publicKeyPem);

  const ok = await (crypto.subtle.verify as any)('RSASSA-PKCS1-v1_5', publicKey, sigArr, signedData);
    if (!ok) throw new Error('Invalid signature');

    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payloadJson);
  }

  // Vérification anti-triche de la date système
  private checkTimeManipulation(): boolean {
    try {
      const lastCheck = localStorage.getItem(ANTI_CHEAT_KEY);
      const now = Date.now();
      if (lastCheck) {
        const lastTime = parseInt(lastCheck);
        if (now < lastTime - (60 * 60 * 1000)) {
          console.warn('Manipulation de date détectée');
          return false;
        }
      }
      localStorage.setItem(ANTI_CHEAT_KEY, now.toString());
      return true;
    } catch (error) {
      console.error('Erreur vérification anti-triche:', error);
      return false;
    }
  }

  // Vérifier le statut de la licence (maintenant asynchrone pour permettre vérification JWT)
  async checkLicenceStatus(): Promise<LicenceStatus> {
    if (!this.checkTimeManipulation()) {
      return {
        isValid: false,
        isExpired: true,
        daysRemaining: 0,
        type: 'invalide',
        dateExpiration: '',
        lastCheck: new Date().toISOString()
      };
    }

    try {
      const licenceToken = localStorage.getItem(LICENCE_STORAGE_KEY);

      if (!licenceToken) {
        // Générer une licence d'essai (local) si aucune licence fournie
        return this.createTrialLicence();
      }

      // Distinguish JWT tokens (header.payload.sig) from old base64 trial token
      if ((licenceToken.match(/\./g) || []).length === 2) {
        // JWT flow
        try {
          const payload = await this.verifyJwtAndGetPayload(licenceToken);
          const exp = (payload.exp && Number(payload.exp)) ? new Date(Number(payload.exp) * 1000) : null;
          const now = new Date();
          const daysRemaining = exp ? Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

          // Ensure licence is issued for this installation (sub === codeEtablissement)
          const currentEcoleId = this.getCurrentEcoleId();
          const tokenSub = (payload.sub as string) || '';
          if (tokenSub && !this.isEcoleMatch(tokenSub, currentEcoleId)) {
            console.warn(`Licence sub mismatch: token for ${tokenSub} but this installation is ${currentEcoleId}`);
            return {
              isValid: false,
              isExpired: true,
              daysRemaining: 0,
              type: 'invalide',
              dateExpiration: '',
              lastCheck: new Date().toISOString()
            };
          }

          const status: LicenceStatus = {
            isValid: !!exp && daysRemaining > 0,
            isExpired: !exp || daysRemaining <= 0,
            daysRemaining: Math.max(0, daysRemaining),
            type: (payload.type as string) || 'inconnue',
            dateExpiration: exp ? exp.toISOString() : '',
            lastCheck: new Date().toISOString()
          };

          localStorage.setItem(LAST_CHECK_KEY, status.lastCheck);
          return status;
        } catch (err) {
          console.warn('Licence JWT invalide ou signature incorrecte', err);
          return {
            isValid: false,
            isExpired: true,
            daysRemaining: 0,
            type: 'invalide',
            dateExpiration: '',
            lastCheck: new Date().toISOString()
          };
        }
      } else {
        // Legacy local trial encoded as base64 JSON
        try {
          const decoded = JSON.parse(atob(licenceToken));
          // decoded.exp can be a number (seconds since epoch) or an ISO string. Normalize to Date.
          let exp: Date | null = null;
          if (decoded.exp) {
            if (typeof decoded.exp === 'number') {
              // If value looks like seconds (reasonable range), convert to ms; otherwise assume ms.
              exp = new Date(decoded.exp > 1e12 ? decoded.exp : decoded.exp * 1000);
            } else {
              exp = new Date(decoded.exp);
            }
          }
          const now = new Date();
          const daysRemaining = exp ? Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          return {
            isValid: !!exp && daysRemaining > 0,
            isExpired: !exp || daysRemaining <= 0,
            daysRemaining: Math.max(0, daysRemaining),
            type: decoded.type || 'essai',
            dateExpiration: exp ? exp.toISOString() : '',
            lastCheck: new Date().toISOString()
          };
        } catch (e) {
          return {
            isValid: false,
            isExpired: true,
            daysRemaining: 0,
            type: 'invalide',
            dateExpiration: '',
            lastCheck: new Date().toISOString()
          };
        }
      }
    } catch (error) {
      console.error('Erreur vérification licence:', error);
      return {
        isValid: false,
        isExpired: true,
        daysRemaining: 0,
        type: 'erreur',
        dateExpiration: '',
        lastCheck: new Date().toISOString()
      };
    }
  }

  // Création d'une licence d'essai locale (7 jours)
  private createTrialLicence(): LicenceStatus {
    const now = new Date();
    const expiration = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    const ecoleId = 'ECOLE_ESSAI_' + Date.now();
    const licencePayload = {
      sub: ecoleId,
      type: 'essai',
      iat: Math.floor(now.getTime() / 1000),
      // store ISO string to avoid ambiguity when decoding
      exp: expiration.toISOString()
    };

    // On stocke la version encodée sans signature (pour la démo). En production, émettre un vrai JWT signé depuis le serveur.
    const token = btoa(JSON.stringify(licencePayload));
    localStorage.setItem(LICENCE_STORAGE_KEY, token);

    return {
      isValid: true,
      isExpired: false,
      daysRemaining: 7,
      type: 'essai',
      dateExpiration: expiration.toISOString(),
      lastCheck: new Date().toISOString()
    };
  }

  // Activer une licence (attend un JWT signé)
  activateLicence(token: string): { success: boolean; message: string; status?: LicenceStatus } {
    // On stocke et on laisse la vérification au checkLicenceStatus asynchrone
    localStorage.setItem(LICENCE_STORAGE_KEY, token);

    // Retour immédiat; appelants devraient rafraîchir le statut
    return { success: true, message: 'Licence enregistrée. Actualisez le statut pour vérifier la validité.' };
  }

  // Mise à jour automatique des licences (si serveur disponible)
  async updateLicenceFromServer(): Promise<boolean> {
    try {
      const response = await fetch('/api/licence/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentKey: localStorage.getItem(LICENCE_STORAGE_KEY),
          ecoleId: this.getCurrentEcoleId()
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.newKey) {
          localStorage.setItem(LICENCE_STORAGE_KEY, data.newKey);
          return true;
        }
      }
    } catch (error) {
      console.log('Mise à jour licence impossible (hors ligne)');
    }
    return false;
  }

  private getCurrentEcoleId(): string {
    const ecole = db.getAll('ecole')[0] as any;
    return ecole?.codeEtablissement || 'ECOLE_DEFAULT';
  }

  // Normalise un identifiant: majuscules, on retire tous les caractères non alphanumériques
  private normalizeId(id?: string): string {
    if (!id) return '';
    return id.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  // Retourne true si les deux identifiants partagent une séquence numérique significative
  private hasCommonNumericSeq(a: string, b: string, minLen = 4): boolean {
    const numsA = a.match(/\d+/g) || [];
    const numsB = b.match(/\d+/g) || [];
    for (const na of numsA) {
      for (const nb of numsB) {
        if (na === nb && na.length >= minLen) return true;
        // suffix match (dernier N chiffres)
        if (na.length >= minLen && nb.length >= minLen) {
          const la = na.slice(-minLen);
          const lb = nb.slice(-minLen);
          if (la === lb) return true;
        }
      }
    }
    return false;
  }

  // Compare de façon tolérante tokenSub et currentEcoleId
  private isEcoleMatch(tokenSub: string, currentEcoleId: string): boolean {
    const nToken = this.normalizeId(tokenSub);
    const nCurrent = this.normalizeId(currentEcoleId);
    if (!nToken || !nCurrent) return false;

    if (nToken === nCurrent) return true;
    if (nToken.includes(nCurrent) || nCurrent.includes(nToken)) return true;

    // Si des séquences numériques significatives se recoupent
    if (this.hasCommonNumericSeq(nToken, nCurrent, 4)) return true;

    // Dernier recours: comparer les 6 derniers caractères si présents
    const lastToken = nToken.slice(-6);
    const lastCurrent = nCurrent.slice(-6);
    if (lastToken && lastCurrent && lastToken === lastCurrent) return true;

    return false;
  }

  // Réinitialiser la licence (pour tests)
  resetLicence(): void {
    localStorage.removeItem(LICENCE_STORAGE_KEY);
    localStorage.removeItem(LAST_CHECK_KEY);
    localStorage.removeItem(ANTI_CHEAT_KEY);
  }

  private async importPublicKey(pem: string): Promise<CryptoKey> {
    const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n/g, '');
    const binaryDer = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return await crypto.subtle.importKey('spki', binaryDer.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  }

  private base64UrlToUint8Array(base64UrlString: string): Uint8Array {
  let base64 = base64UrlString.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4; if (pad) base64 += '='.repeat(4 - pad);
  const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
    return arr;
  }
}

export const licenceManager = LicenceManager.getInstance();