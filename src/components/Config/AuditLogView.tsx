import React, { useState, useMemo } from 'react';
import { FileText, Download, Search, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  type: 'import' | 'export' | 'payment' | 'note' | 'delete' | 'update' | 'create';
  action: string;
  user: string;
  details: Record<string, any>;
  status: 'success' | 'error' | 'warning';
}

// Stockage local des logs d'audit
const AUDIT_LOG_KEY = 'klasnet_audit_logs';
const MAX_AUDIT_LOGS = 1000; // Nombre maximum de logs à conserver

export class AuditLogger {
  static log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const logs = this.getLogs();
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    logs.unshift(newEntry);
    
    // Garder seulement les MAX_AUDIT_LOGS derniers logs
    const trimmedLogs = logs.slice(0, MAX_AUDIT_LOGS);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmedLogs));
    
    // Dispatch event pour mise à jour en temps réel
    window.dispatchEvent(new CustomEvent('audit-log-updated'));
  }

  static getLogs(): AuditLogEntry[] {
    try {
      const stored = localStorage.getItem(AUDIT_LOG_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erreur lecture logs audit:', error);
      return [];
    }
  }

  static clearLogs() {
    localStorage.removeItem(AUDIT_LOG_KEY);
    window.dispatchEvent(new CustomEvent('audit-log-updated'));
  }

  static exportLogs(): string {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  }
}

/**
 * Composant pour afficher l'historique des opérations (imports, exports, modifications)
 * Permet la traçabilité et l'audit des actions dans l'application
 */
export default function AuditLogView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => AuditLogger.getLogs());

  // Écouter les mises à jour des logs
  React.useEffect(() => {
    const handleUpdate = () => {
      setLogs(AuditLogger.getLogs());
    };
    window.addEventListener('audit-log-updated', handleUpdate);
    return () => window.removeEventListener('audit-log-updated', handleUpdate);
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filtre par type
      if (filterType !== 'all' && log.type !== filterType) return false;
      
      // Filtre par status
      if (filterStatus !== 'all' && log.status !== filterStatus) return false;
      
      // Filtre par recherche
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          log.action.toLowerCase().includes(term) ||
          log.user.toLowerCase().includes(term) ||
          JSON.stringify(log.details).toLowerCase().includes(term)
        );
      }
      
      return true;
    });
  }, [logs, searchTerm, filterType, filterStatus]);

  const handleExport = () => {
    const data = AuditLogger.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      import: 'Import',
      export: 'Export',
      payment: 'Paiement',
      note: 'Note',
      delete: 'Suppression',
      update: 'Modification',
      create: 'Création',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      import: 'bg-blue-100 text-blue-800',
      export: 'bg-green-100 text-green-800',
      payment: 'bg-purple-100 text-purple-800',
      note: 'bg-indigo-100 text-indigo-800',
      delete: 'bg-red-100 text-red-800',
      update: 'bg-orange-100 text-orange-800',
      create: 'bg-teal-100 text-teal-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      success: 'text-green-600',
      error: 'text-red-600',
      warning: 'text-orange-600',
    };
    return colors[status] || 'text-gray-600';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Journal d'Audit</h2>
            <p className="mt-1 text-sm text-gray-600">
              Historique de toutes les opérations effectuées dans l'application
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="all">Tous les types</option>
              <option value="import">Import</option>
              <option value="export">Export</option>
              <option value="payment">Paiement</option>
              <option value="note">Note</option>
              <option value="create">Création</option>
              <option value="update">Modification</option>
              <option value="delete">Suppression</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="success">Succès</option>
              <option value="error">Erreur</option>
              <option value="warning">Avertissement</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          {filteredLogs.length} entrée(s) sur {logs.length} au total
        </div>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune entrée trouvée</h3>
          <p className="text-gray-600">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all'
              ? 'Essayez de modifier vos filtres'
              : 'Les opérations seront enregistrées ici'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span
                        className={clsx(
                          'px-2 py-1 text-xs font-medium rounded-full',
                          getTypeColor(log.type)
                        )}
                      >
                        {getTypeLabel(log.type)}
                      </span>
                      <span className={clsx('text-sm font-medium', getStatusColor(log.status))}>
                        {log.status === 'success' && '✓ Succès'}
                        {log.status === 'error' && '✗ Erreur'}
                        {log.status === 'warning' && '⚠ Avertissement'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 font-medium">{log.action}</p>
                    {Object.keys(log.details).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          Voir les détails
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <div className="flex items-center text-xs text-gray-500 mb-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {format(new Date(log.timestamp), 'dd MMM yyyy', { locale: fr })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(log.timestamp), 'HH:mm:ss')}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{log.user}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
