import React, { useRef, useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import clsx from 'clsx';

export interface VirtualTableColumn<T> {
  key: string;
  label: string;
  width?: number | string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: VirtualTableColumn<T>[];
  rowHeight?: number;
  height?: number;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  emptyMessage?: string;
  getRowKey?: (item: T, index: number) => string | number;
}

/**
 * Table virtualisée pour afficher de grandes quantités de données
 * Utilise react-window pour ne rendre que les lignes visibles
 * Améliore considérablement les performances avec des listes de 100+ éléments
 */
export default function VirtualTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 60,
  height = 600,
  onRowClick,
  className,
  headerClassName,
  rowClassName,
  emptyMessage = 'Aucune donnée à afficher',
  getRowKey,
}: VirtualTableProps<T>) {
  const listRef = useRef<List>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const getColumnWidth = (column: VirtualTableColumn<T>) => {
    if (typeof column.width === 'number') return column.width;
    if (typeof column.width === 'string') {
      if (column.width.includes('%')) {
        const percentage = parseFloat(column.width) / 100;
        return containerWidth * percentage;
      }
      return parseFloat(column.width);
    }
    // Largeur par défaut: diviser équitablement
    return containerWidth / columns.length;
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = data[index];
    const rowClasses =
      typeof rowClassName === 'function' ? rowClassName(item, index) : rowClassName;

    return (
      <div
        style={style}
        className={clsx(
          'flex items-center border-b border-gray-200 hover:bg-gray-50 cursor-pointer',
          rowClasses
        )}
        onClick={() => onRowClick?.(item, index)}
      >
        {columns.map((column) => {
          const width = getColumnWidth(column);
          const value = item[column.key];
          const content = column.render ? column.render(item, index) : value;

          return (
            <div
              key={column.key}
              style={{ width: `${width}px` }}
              className={clsx('px-4 py-3 truncate', column.className)}
              title={typeof content === 'string' ? content : undefined}
            >
              {content}
            </div>
          );
        })}
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <div className={clsx('bg-white rounded-lg shadow', className)}>
        <div className="p-8 text-center text-gray-500">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={clsx('bg-white rounded-lg shadow overflow-hidden', className)}>
      {/* Header */}
      <div className={clsx('flex bg-gray-100 border-b border-gray-300 font-semibold', headerClassName)}>
        {columns.map((column) => {
          const width = getColumnWidth(column);
          return (
            <div
              key={column.key}
              style={{ width: `${width}px` }}
              className={clsx('px-4 py-3 text-left text-sm text-gray-700', column.className)}
            >
              {column.label}
            </div>
          );
        })}
      </div>

      {/* Virtualized Body */}
      <List
        ref={listRef}
        height={height}
        itemCount={data.length}
        itemSize={rowHeight}
        width={containerWidth}
        itemKey={(index) => (getRowKey ? getRowKey(data[index], index) : index)}
      >
        {Row}
      </List>
    </div>
  );
}

/**
 * Version simplifiée avec pagination au lieu de virtualisation
 * Utile pour des datasets moyens (50-200 items)
 */
export function PaginatedTable<T extends Record<string, any>>({
  data,
  columns,
  pageSize = 20,
  onRowClick,
  className,
  headerClassName,
  rowClassName,
  emptyMessage = 'Aucune donnée à afficher',
}: Omit<VirtualTableProps<T>, 'rowHeight' | 'height' | 'getRowKey'> & { pageSize?: number }) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = currentPage * pageSize;
  const endIndex = Math.min(startIndex + pageSize, data.length);
  const currentData = data.slice(startIndex, endIndex);

  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const getColumnWidth = (column: VirtualTableColumn<T>) => {
    if (typeof column.width === 'number') return column.width;
    if (typeof column.width === 'string') {
      if (column.width.includes('%')) {
        const percentage = parseFloat(column.width) / 100;
        return containerWidth * percentage;
      }
      return parseFloat(column.width);
    }
    return containerWidth / columns.length;
  };

  if (data.length === 0) {
    return (
      <div className={clsx('bg-white rounded-lg shadow', className)}>
        <div className="p-8 text-center text-gray-500">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={clsx('bg-white rounded-lg shadow', className)}>
      {/* Header */}
      <div className={clsx('flex bg-gray-100 border-b border-gray-300 font-semibold', headerClassName)}>
        {columns.map((column) => {
          const width = getColumnWidth(column);
          return (
            <div
              key={column.key}
              style={{ width: `${width}px` }}
              className={clsx('px-4 py-3 text-left text-sm text-gray-700', column.className)}
            >
              {column.label}
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div>
        {currentData.map((item, index) => {
          const globalIndex = startIndex + index;
          const rowClasses =
            typeof rowClassName === 'function' ? rowClassName(item, globalIndex) : rowClassName;

          return (
            <div
              key={globalIndex}
              className={clsx(
                'flex items-center border-b border-gray-200 hover:bg-gray-50 cursor-pointer',
                rowClasses
              )}
              onClick={() => onRowClick?.(item, globalIndex)}
            >
              {columns.map((column) => {
                const width = getColumnWidth(column);
                const value = item[column.key];
                const content = column.render ? column.render(item, globalIndex) : value;

                return (
                  <div
                    key={column.key}
                    style={{ width: `${width}px` }}
                    className={clsx('px-4 py-3 truncate', column.className)}
                    title={typeof content === 'string' ? content : undefined}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-700">
            Affichage de {startIndex + 1} à {endIndex} sur {data.length} résultats
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className={clsx(
                'px-3 py-1 rounded border',
                currentPage === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              Précédent
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              Page {currentPage + 1} sur {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className={clsx(
                'px-3 py-1 rounded border',
                currentPage === totalPages - 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
