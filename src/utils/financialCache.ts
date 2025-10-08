import { echeancesManager } from './echeancesManager';

interface CachedSituation {
  data: any;
  timestamp: number;
  dataHash: string;
}

class FinancialCache {
  private cache: Map<string, CachedSituation> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Générer un hash simple des données pour détecter les changements
  private generateHash(eleveId: string, paiementsCount: number): string {
    return `${eleveId}-${paiementsCount}`;
  }

  // Obtenir la situation financière avec cache
  getSituationEcheances(eleveId: string, paiementsCount: number): any {
    const hash = this.generateHash(eleveId, paiementsCount);
    const cached = this.cache.get(eleveId);

    // Vérifier si le cache est valide
    if (cached && cached.dataHash === hash) {
      const age = Date.now() - cached.timestamp;
      if (age < this.cacheTimeout) {
        return cached.data;
      }
    }

    // Calculer et mettre en cache
    try {
      const situation = echeancesManager.getSituationEcheances(eleveId);
      this.cache.set(eleveId, {
        data: situation,
        timestamp: Date.now(),
        dataHash: hash
      });
      return situation;
    } catch (error) {
      console.warn('Error calculating financial situation for', eleveId, error);
      return null;
    }
  }

  // Invalider le cache pour un élève spécifique
  invalidate(eleveId: string): void {
    this.cache.delete(eleveId);
  }

  // Invalider tout le cache
  invalidateAll(): void {
    this.cache.clear();
  }

  // Nettoyer les entrées expirées
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}

export const financialCache = new FinancialCache();

// Nettoyer le cache périodiquement
if (typeof window !== 'undefined') {
  setInterval(() => financialCache.cleanup(), 60 * 1000); // Toutes les minutes
}
