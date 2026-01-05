import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import clsx from 'clsx';

export interface ImportPreviewData {
  headers: string[];
  rows: any[][];
  totalRows: number;
  previewRows?: number;
}

export interface ValidationError {
  row: number;
  column?: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface ImportPreviewProps {
  data: ImportPreviewData;
  validationErrors?: ValidationError[];
  onConfirm?: () => void;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
}

/**
 * Composant de prévisualisation pour l'import de données Excel/CSV
 * Affiche un aperçu des données et les erreurs de validation avant l'import
 */
export default function ImportPreview({
  data,
  validationErrors = [],
  onConfirm,
  onCancel,
  loading = false,
  className,
}: ImportPreviewProps) {
  const { headers, rows, totalRows, previewRows = 10 } = data;

  const errorsByRow = useMemo(() => {
    const map = new Map<number, ValidationError[]>();
    validationErrors.forEach((error) => {
      const existing = map.get(error.row) || [];
      map.set(error.row, [...existing, error]);
    });
    return map;
  }, [validationErrors]);

  const errorCount = validationErrors.filter((e) => e.severity === 'error').length;
  const warningCount = validationErrors.filter((e) => e.severity === 'warning').length;

  const hasErrors = errorCount > 0;

  return (
    <div className={clsx('bg-white rounded-lg shadow-lg', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Prévisualisation de l'import
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          {totalRows} ligne(s) détectée(s) - Affichage des {Math.min(previewRows, totalRows)} premières
        </p>
      </div>

      {/* Validation Summary */}
      {validationErrors.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="space-y-2">
            {errorCount > 0 && (
              <div className="flex items-center text-red-700">
                <XCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">{errorCount} erreur(s) bloquante(s)</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center text-orange-600">
                <AlertTriangle className="w-5 h-5 mr-2" />
                <span className="font-medium">{warningCount} avertissement(s)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Table */}
      <div className="overflow-x-auto max-h-96">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-16">
                #
              </th>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.slice(0, previewRows).map((row, rowIndex) => {
              const rowErrors = errorsByRow.get(rowIndex + 1);
              const hasRowError = rowErrors && rowErrors.some((e) => e.severity === 'error');
              const hasRowWarning = rowErrors && rowErrors.some((e) => e.severity === 'warning');

              return (
                <React.Fragment key={rowIndex}>
                  <tr
                    className={clsx({
                      'bg-red-50': hasRowError,
                      'bg-orange-50': hasRowWarning && !hasRowError,
                    })}
                  >
                    <td className="px-4 py-3 text-sm text-gray-500 font-medium">{rowIndex + 1}</td>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3 text-sm text-gray-900 truncate max-w-xs">
                        {cell !== null && cell !== undefined ? String(cell) : '-'}
                      </td>
                    ))}
                  </tr>
                  {rowErrors && (
                    <tr className="bg-gray-50">
                      <td colSpan={headers.length + 1} className="px-4 py-2">
                        <div className="space-y-1">
                          {rowErrors.map((error, errorIndex) => (
                            <div
                              key={errorIndex}
                              className={clsx('flex items-start text-sm', {
                                'text-red-700': error.severity === 'error',
                                'text-orange-600': error.severity === 'warning',
                                'text-blue-600': error.severity === 'info',
                              })}
                            >
                              {error.severity === 'error' && <XCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />}
                              {error.severity === 'warning' && <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />}
                              {error.severity === 'info' && <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />}
                              <span>
                                {error.column && <strong>{error.column}: </strong>}
                                {error.message}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length > previewRows && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          ... et {totalRows - previewRows} autre(s) ligne(s)
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          {!hasErrors && validationErrors.length === 0 && (
            <div className="flex items-center text-green-700">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Prêt pour l'import</span>
            </div>
          )}
          {hasErrors && (
            <div className="flex items-center text-red-700">
              <XCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Corrigez les erreurs avant d'importer</span>
            </div>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={hasErrors || loading}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium text-white',
              hasErrors || loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {loading ? 'Import en cours...' : 'Confirmer l\'import'}
          </button>
        </div>
      </div>
    </div>
  );
}
