import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../utils/database';
import { echeancesManager } from '../../utils/echeancesManager';
import { getEnteteConfig } from '../../utils/entetesConfig';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, AreaChart, Area } from 'recharts';
import { TrendingUp, Calendar, Layers, DollarSign, Search, Download, FileText, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

type Ecriture = {
  id: string;
  date: string;
  type: 'Entree' | 'Sortie';
  category: string;
  amount: number;
  note?: string;
  createdAt?: string;
};

const predefinedCategories = ['Salaire', 'Fournitures', 'Inscription', 'Paiement Scolaire', 'Maintenance', 'Transport', 'Divers'];

export default function ComptabiliteList() {
  const [entries, setEntries] = useState<Ecriture[]>([]);
  const [refreshTick, setRefreshTick] = useState(false);
  const [form, setForm] = useState<Partial<Ecriture>>({ date: new Date().toISOString().slice(0,10), type: 'Entree', category: '', amount: 0, note: '' });
  // pagination & filters
  const [quickFilter, setQuickFilter] = useState<'all' | 'today' | 'month' | 'year' | 'custom'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Set date filters based on quickFilter
  useEffect(() => {
    const now = new Date();
    if (quickFilter === 'all') {
      setFilterStart('');
      setFilterEnd('');
    } else if (quickFilter === 'today') {
      const today = now.toISOString().slice(0, 10);
      setFilterStart(today);
      setFilterEnd(today);
    } else if (quickFilter === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      setFilterStart(firstDay);
      setFilterEnd(lastDay);
    } else if (quickFilter === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
      setFilterStart(firstDay);
      setFilterEnd(lastDay);
    }
    // For 'custom', keep current filterStart and filterEnd
  }, [quickFilter]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<'date' | 'category' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editEntry, setEditEntry] = useState<Ecriture | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const load = () => setEntries((db.getAll('compta') || []) as Ecriture[]);

  useEffect(() => {
    load();
    const onData = () => { load(); setRefreshTick(r => !r); };
    window.addEventListener('dataChanged', onData as EventListener);
    return () => window.removeEventListener('dataChanged', onData as EventListener);
  }, []);

  const resetForm = () => setForm({ date: new Date().toISOString().slice(0,10), type: 'Entree', category: '', amount: 0, note: '' });

  const handleCreate = () => {
    try {
      const item: any = {
        date: form.date || new Date().toISOString(),
        type: form.type || 'Entree',
        category: form.category || 'Général',
        amount: Number(form.amount) || 0,
        note: form.note || '',
        createdAt: new Date().toISOString(),
      };
    db.create('compta', item);
    resetForm();
    load();
    } catch (err) {
      console.error(err);
      alert('Erreur en créant l\'écriture');
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer cette écriture ?')) return;
    try {
  db.delete('compta', id);
  load();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression');
    }
  };

  // map payments into Ecriture shape and merge with compta entries for display/chart
  const combinedEntries = useMemo(() => {
    const payments = (db.getAll('paiements') || []).filter((p: any) => !(p as any).canceled);
    // Skip payments that already have a matching compta entry (same day and same amount)
    const mapped = payments.reduce((acc: Ecriture[], p: any) => {
      const pDate = p.datePaiement || p.date || p.createdAt || new Date().toISOString();
      let pDay = '';
      try { pDay = new Date(pDate).toISOString().slice(0,10); } catch { pDay = '' }
      const pAmount = Number(p.montant || 0);
      const existsMatch = entries.some(e => {
        if (e.type !== 'Entree') return false;
        let eDay = '';
        try { eDay = new Date(e.date).toISOString().slice(0,10); } catch { eDay = '' }
        return eDay && pDay && eDay === pDay && Number(e.amount || 0) === pAmount;
      });
      if (existsMatch) return acc; // skip duplicate
      acc.push({
        id: `pai_${p.id}`,
        date: pDate,
        type: 'Entree' as const,
        category: p.numeroRecu ? `Paiement ${p.numeroRecu}` : 'Paiement',
        amount: pAmount,
        note: p.notes || ''
      } as Ecriture);
      return acc;
    }, [] as Ecriture[]);
    return [...entries, ...mapped];
  }, [entries, refreshTick]);

  const totals = useMemo(() => {
    const visible = combinedEntries.filter(e => {
      if (filterCategory && e.category !== filterCategory) return false;
      if (filterStart && e.date < filterStart) return false;
      if (filterEnd && e.date > filterEnd) return false;
      return true;
    });
    const entrees = visible.filter(v => v.type === 'Entree').reduce((s, v) => s + Number(v.amount || 0), 0);
    const sorties = visible.filter(v => v.type === 'Sortie').reduce((s, v) => s + Number(v.amount || 0), 0);
    return { entrees, sorties, solde: entrees - sorties, count: visible.length };
  }, [combinedEntries, filterCategory, filterStart, filterEnd]);

  

  // KPI quick values - always show current today/month/year regardless of filters
  const kpis = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0,10);
    const currentMonthStr = now.toISOString().slice(0,7);
    const currentYear = now.getFullYear();

    const isToday = (e: Ecriture) => {
      try { return new Date(e.date).toISOString().slice(0,10) === todayStr; } catch { return false; }
    };

    const isCurrentMonth = (e: Ecriture) => {
      try { return new Date(e.date).toISOString().slice(0,7) === currentMonthStr; } catch { return false; }
    };

    const isCurrentYear = (e: Ecriture) => {
      try { return new Date(e.date).getFullYear() === currentYear; } catch { return false; }
    };

    const sumByType = (arr: Ecriture[], type: 'Entree' | 'Sortie') => arr.filter(v => v.type === type).reduce((s, v) => s + Number(v.amount||0), 0);

    return {
      today: {
        entrees: sumByType(combinedEntries.filter(isToday), 'Entree'),
        sorties: sumByType(combinedEntries.filter(isToday), 'Sortie'),
      },
      month: {
        entrees: sumByType(combinedEntries.filter(isCurrentMonth), 'Entree'),
        sorties: sumByType(combinedEntries.filter(isCurrentMonth), 'Sortie'),
      },
      year: {
        entrees: sumByType(combinedEntries.filter(isCurrentYear), 'Entree'),
        sorties: sumByType(combinedEntries.filter(isCurrentYear), 'Sortie'),
      },
      countMonth: combinedEntries.filter(isCurrentMonth).length
    };
  }, [combinedEntries]);

  // Finance stats: Total Recettes, Impayés (reste à encaisser), Sorties, Solde
  const financeStats = useMemo(() => {
  // compute totals from combinedEntries to avoid double-counting
  const totalRecettes = combinedEntries.filter(e => e.type === 'Entree').reduce((s, v) => s + Number(v.amount || 0), 0);
    const totalSorties = combinedEntries.filter(e => e.type === 'Sortie').reduce((s, v) => s + Number(v.amount || 0), 0);
    // compute impayés by summing positive remaining (solde) from situations
    let impayes = 0;
    try {
      const eleves = db.getAll('eleves');
      const paiements = db.getAll('paiements');
      const classes = db.getAll('classes');
      const situations = eleves.map((ele: any) => {
        try { return echeancesManager.getSituationEcheances(ele.id); } catch { return null; }
      }).filter(Boolean) as any[];
      impayes = situations.reduce((s, sit) => {
        const rest = Number(sit.totalRestant || 0);
        return s + (rest > 0 ? rest : 0);
      }, 0);
    } catch (e) { impayes = 0; }

    const solde = totalRecettes - totalSorties;
    return { totalRecettes, impayes, totalSorties, solde };
  }, [entries, refreshTick]);

  const filteredEntries = useMemo(() => {
    let visible = combinedEntries.filter(e => {
      if (filterCategory && e.category !== filterCategory) return false;
      if (filterStart && e.date < filterStart) return false;
      if (filterEnd && e.date > filterEnd) return false;
      if (searchQuery && !e.category.toLowerCase().includes(searchQuery.toLowerCase()) && !e.note?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    // Apply sorting
    visible = visible.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'date':
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        case 'category':
          aVal = a.category.toLowerCase();
          bVal = b.category.toLowerCase();
          break;
        case 'amount':
          aVal = a.amount;
          bVal = b.amount;
          break;
        default:
          aVal = a.date;
          bVal = b.date;
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return visible;
  }, [combinedEntries, filterCategory, filterStart, filterEnd, searchQuery, sortBy, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const paginated = filteredEntries.slice((page-1)*pageSize, (page-1)*pageSize + pageSize);

  const handleEditClick = (id: string) => {
    const e = entries.find(x => x.id === id) || null;
    setEditEntry(e);
    setShowEditModal(true);
  };

  const handleUpdate = (payload: Partial<Ecriture>) => {
    if (!editEntry) return;
    try {
      db.update('compta', editEntry.id, { ...editEntry, ...payload });
      setShowEditModal(false);
      setEditEntry(null);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handlePrint = () => {
    if (filteredEntries.length === 0) {
      alert('Aucune écriture à imprimer avec les filtres actuels');
      return;
    }

    // Calculate totals
    const totalDebit = filteredEntries.filter(e => e.type === 'Entree').reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalCredit = filteredEntries.filter(e => e.type === 'Sortie').reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const rows = filteredEntries.map(e => `
      <tr>
        <td style="border: 1px solid #333; padding: 8px; text-align: left; background-color: #f9f9f9;">${new Date(e.date).toLocaleDateString('fr-FR')}</td>
        <td style="border: 1px solid #333; padding: 8px; text-align: left; background-color: #f9f9f9;">${e.category}</td>
        <td style="border: 1px solid #333; padding: 8px; text-align: right; background-color: #e6ffe6;">${e.type === 'Entree' ? Number(e.amount).toLocaleString('fr-FR') : ''}</td>
        <td style="border: 1px solid #333; padding: 8px; text-align: right; background-color: #ffe6e6;">${e.type === 'Sortie' ? Number(e.amount).toLocaleString('fr-FR') : ''}</td>
      </tr>
    `).join('\n');

    const totalRow = `
      <tr style="font-weight: bold; background-color: #ddd;">
        <td colspan="2" style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold;">TOTAUX</td>
        <td style="border: 1px solid #333; padding: 8px; text-align: right; font-weight: bold; background-color: #e6ffe6;">${totalDebit.toLocaleString('fr-FR')}</td>
        <td style="border: 1px solid #333; padding: 8px; text-align: right; font-weight: bold; background-color: #ffe6e6;">${totalCredit.toLocaleString('fr-FR')}</td>
      </tr>
    `;

    const html = `
      <html>
        <head>
          <title>Journal Comptable</title>
          <style>
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12px;
              color: #000;
              padding: 15mm;
              line-height: 1.4;
            }
            h2 {
              text-align: center;
              margin-bottom: 30px;
              font-size: 18px;
              font-weight: bold;
              text-decoration: underline;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            th {
              border: 2px solid #333;
              padding: 10px;
              text-align: center;
              background-color: #4a5568;
              color: white;
              font-weight: bold;
              font-size: 13px;
            }
            td {
              border: 1px solid #333;
              padding: 8px;
            }
            .signature {
              text-align: right;
              margin-top: 50px;
              font-weight: bold;
              font-size: 14px;
            }
            @media print {
              body { margin: 0; }
              .signature { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h2>Journal Comptable</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Libellé</th>
                <th>Débit</th>
                <th>Crédit</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              ${totalRow}
            </tbody>
          </table>
          <div class="signature">Signature</div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Impossible d\'ouvrir la fenêtre d\'impression');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    // Use setTimeout to ensure content is loaded before printing
    setTimeout(() => {
      printWindow.print();
      // Don't close immediately, let the user close after printing
      printWindow.onafterprint = () => printWindow.close();
    }, 500);
  };

  // Export Excel function removed as per user request


  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">Comptabilité</h1>
            <p className="text-sm text-gray-500">Journal des entrées et sorties — aperçu rapide</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Recettes</div>
              <div className="text-2xl font-extrabold text-gray-900">{financeStats.totalRecettes.toLocaleString('fr-FR')} FCFA</div>
            </div>
            <div className="text-right px-4 border-l">
              <div className="text-sm text-gray-500">Impayés</div>
              <div className="text-2xl font-extrabold text-red-600">{financeStats.impayes.toLocaleString('fr-FR')} FCFA</div>
              <div className="text-xs text-gray-400">Reste à encaisser</div>
            </div>
            <div className="text-right px-4 border-l">
              <div className="text-sm text-gray-500">Sorties</div>
              <div className="text-2xl font-extrabold text-red-600">{financeStats.totalSorties.toLocaleString('fr-FR')} FCFA</div>
            </div>
            <div className="text-right px-4 border-l">
              <div className="text-sm text-gray-500">Solde</div>
              <div className="text-2xl font-extrabold text-indigo-700">{financeStats.solde.toLocaleString('fr-FR')} FCFA</div>
            </div>
          </div>
        </div>

  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-gradient-to-r from-green-50 to-white p-4 rounded shadow flex flex-col justify-between border-l-4 border-green-500">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-green-100 rounded-md">
                <TrendingUp className="text-green-700" size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-500">Aujourd'hui</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm font-bold">
              <div className="text-green-700">Entrées</div>
              <div className="text-right text-green-700">{kpis.today.entrees.toLocaleString('fr-FR')} FCFA</div>
              <div className="text-red-600">Sorties</div>
              <div className="text-right text-red-600">{kpis.today.sorties.toLocaleString('fr-FR')} FCFA</div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-white p-4 rounded shadow flex flex-col justify-between border-l-4 border-blue-500">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-md">
                <Calendar className="text-blue-600" size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-500">Ce mois</div>
                <div className="text-xs text-gray-400">{kpis.countMonth} écritures</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm font-bold">
              <div className="text-green-700">Entrées</div>
              <div className="text-right text-green-700">{kpis.month.entrees.toLocaleString('fr-FR')} FCFA</div>
              <div className="text-red-600">Sorties</div>
              <div className="text-right text-red-600">{kpis.month.sorties.toLocaleString('fr-FR')} FCFA</div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-indigo-50 to-white p-4 rounded shadow flex flex-col justify-between border-l-4 border-indigo-500">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-indigo-100 rounded-md">
                <Layers className="text-indigo-700" size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-500">Cette année</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm font-bold">
              <div className="text-green-700">Entrées</div>
              <div className="text-right text-green-700">{kpis.year.entrees.toLocaleString('fr-FR')} FCFA</div>
              <div className="text-red-600">Sorties</div>
              <div className="text-right text-red-600">{kpis.year.sorties.toLocaleString('fr-FR')} FCFA</div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {/* Active filter label */}
            {(() => {
              let filterLabel = 'Filtre actif : Aucun';
              if (quickFilter === 'today') filterLabel = 'Filtre actif : Aujourd\'hui';
              else if (quickFilter === 'month') filterLabel = 'Filtre actif : Ce mois';
              else if (quickFilter === 'year') filterLabel = 'Filtre actif : Cette année';
              else if (quickFilter === 'custom') filterLabel = `Filtre actif : ${filterStart || '...'} → ${filterEnd || '...'}`;
              return <span className="text-sm text-gray-500">{filterLabel}</span>;
            })()}
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
          <div className="flex items-center space-x-2"><span className="inline-block w-3 h-3 bg-green-600 rounded-full" /> <span>Entrées</span></div>
          <div className="flex items-center space-x-2"><span className="inline-block w-3 h-3 bg-red-600 rounded-full" /> <span>Sorties</span></div>
          <div className="flex items-center space-x-2"><DollarSign className="text-gray-400" size={14} /><span className="text-xs">Montants en FCFA</span></div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Période</label>
            <select value={quickFilter} onChange={e => setQuickFilter(e.target.value as any)} className="p-2 border rounded">
              <option value="all">Toutes</option>
              <option value="today">Aujourd'hui</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
              <option value="custom">Personnalisée</option>
            </select>
            {quickFilter === 'custom' && (
              <>
                <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="p-2 border rounded" />
                <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="p-2 border rounded" />
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Catégorie</label>
            <input placeholder="Catégorie" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-2 border rounded" />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Rechercher</label>
            <input placeholder="Catégorie ou note" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="p-2 border rounded" />
          </div>
          <button onClick={() => { setFilterStart(''); setFilterEnd(''); setFilterCategory(''); setSearchQuery(''); setQuickFilter('all'); setPage(1); }} className="ml-2 px-2 py-1 bg-gray-100 border rounded text-sm">Effacer tous les filtres</button>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={handlePrint} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm shadow hover:bg-indigo-700 flex items-center space-x-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block"><path d="M6 9V2h12v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="6" y="13" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>Imprimer</span>
          </button>
          {/* Export Excel button removed as per user request */}
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-4">Analyse des Finances</h3>
          
          {/* Diagrammes circulaires */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Répartition Entrées vs Sorties */}
            <div className="text-center">
              <h4 className="text-xs font-medium text-gray-600 mb-2">Répartition Générale</h4>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Entrées', value: totals.entrees, color: '#10b981' },
                        { name: 'Sorties', value: totals.sorties, color: '#ef4444' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip formatter={(value: any) => `${Number(value).toLocaleString('fr-FR')} FCFA`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Répartition par catégories (Entrées) */}
            <div className="text-center">
              <h4 className="text-xs font-medium text-gray-600 mb-2">Entrées par Catégorie</h4>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={(() => {
                        const categoryMap: Record<string, number> = {};
                        combinedEntries.filter(e => e.type === 'Entree').forEach(e => {
                          const cat = e.category || 'Autre';
                          categoryMap[cat] = (categoryMap[cat] || 0) + Number(e.amount || 0);
                        });
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];
                        return Object.keys(categoryMap).map((cat, index) => ({
                          name: cat.length > 15 ? cat.substring(0, 15) + '...' : cat,
                          value: categoryMap[cat],
                          color: colors[index % colors.length]
                        }));
                      })()}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {(() => {
                        const categoryMap: Record<string, number> = {};
                        combinedEntries.filter(e => e.type === 'Entree').forEach(e => {
                          const cat = e.category || 'Autre';
                          categoryMap[cat] = (categoryMap[cat] || 0) + Number(e.amount || 0);
                        });
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];
                        return Object.keys(categoryMap).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ));
                      })()}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${Number(value).toLocaleString('fr-FR')} FCFA`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Répartition par catégories (Sorties) */}
            <div className="text-center">
              <h4 className="text-xs font-medium text-gray-600 mb-2">Sorties par Catégorie</h4>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={(() => {
                        const categoryMap: Record<string, number> = {};
                        combinedEntries.filter(e => e.type === 'Sortie').forEach(e => {
                          const cat = e.category || 'Autre';
                          categoryMap[cat] = (categoryMap[cat] || 0) + Number(e.amount || 0);
                        });
                        const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#3b82f6', '#10b981'];
                        return Object.keys(categoryMap).map((cat, index) => ({
                          name: cat.length > 15 ? cat.substring(0, 15) + '...' : cat,
                          value: categoryMap[cat],
                          color: colors[index % colors.length]
                        }));
                      })()}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {(() => {
                        const categoryMap: Record<string, number> = {};
                        combinedEntries.filter(e => e.type === 'Sortie').forEach(e => {
                          const cat = e.category || 'Autre';
                          categoryMap[cat] = (categoryMap[cat] || 0) + Number(e.amount || 0);
                        });
                        const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#3b82f6', '#10b981'];
                        return Object.keys(categoryMap).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ));
                      })()}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${Number(value).toLocaleString('fr-FR')} FCFA`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Résumé financier */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totals.entrees.toLocaleString('fr-FR')}</div>
              <div className="text-xs text-gray-500">Total Entrées (FCFA)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{totals.sorties.toLocaleString('fr-FR')}</div>
              <div className="text-xs text-gray-500">Total Sorties (FCFA)</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${totals.solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totals.solde.toLocaleString('fr-FR')}
              </div>
              <div className="text-xs text-gray-500">Solde (FCFA)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totals.count}</div>
              <div className="text-xs text-gray-500">Nombre d'écritures</div>
            </div>
          </div>

          {filteredEntries.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">Aucune écriture pour la période sélectionnée — ajoutez une écriture ou changez les filtres.</div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="text-xs text-gray-600">Date</label>
            <input type="date" value={form.date?.slice(0,10)} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
          </div>
          <div>
            <label className="text-xs text-gray-600">Type</label>
            <select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value as any }))} className="mt-1 p-2 border rounded w-full">
              <option value="Entree">Entrée</option>
              <option value="Sortie">Sortie</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">Catégorie</label>
            <input value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
          </div>
          <div>
            <label className="text-xs text-gray-600">Montant</label>
            <input type="number" value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: Number(e.target.value) }))} className="mt-1 p-2 border rounded w-full" />
          </div>
          <div className="md:col-span-6 flex space-x-2">
            <input placeholder="Note (optionnel)" value={form.note} onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
            <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded">Ajouter</button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        {filteredEntries.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-gray-500">Aucune écriture</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => { setSortBy('date'); setSortOrder(sortBy === 'date' && sortOrder === 'desc' ? 'asc' : 'desc'); }}>
                    Date {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => { setSortBy('category'); setSortOrder(sortBy === 'category' && sortOrder === 'desc' ? 'asc' : 'desc'); }}>
                    Catégorie {sortBy === 'category' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => { setSortBy('amount'); setSortOrder(sortBy === 'amount' && sortOrder === 'desc' ? 'asc' : 'desc'); }}>
                    Montant {sortBy === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Note</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginated.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(e.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{e.type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {e.category ? (
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${String(e.category).toLowerCase().includes('inscription') ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                          {e.category}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold">
                      <span className={e.type === 'Entree' ? 'text-green-700' : 'text-red-600'}>
                        {e.type === 'Entree' ? '+' : '-'}{Number(e.amount).toLocaleString('fr-FR')} FCFA
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{e.note || ''}</td>
                    <td className="px-4 py-3 text-sm text-center space-x-1">
                      {(() => {
                        const isPayment = String(e.id || '').startsWith('pai_');
                        if (isPayment) {
                          return (
                            <>
                              <button disabled title="Cette ligne provient d'un paiement; modifiez-le depuis l'écran Paiements" className="px-2 py-1 bg-yellow-300 text-white rounded text-xs opacity-60 cursor-not-allowed">Éditer</button>
                              <button disabled title="Cette ligne provient d'un paiement; suppression non autorisée depuis la comptabilité" className="px-2 py-1 bg-red-300 text-white rounded text-xs opacity-60 cursor-not-allowed">Supprimer</button>
                            </>
                          );
                        }
                        return (
                          <>
                            <button onClick={() => handleEditClick(e.id)} className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:brightness-95">Éditer</button>
                            <button onClick={() => handleDelete(e.id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:brightness-95">Supprimer</button>
                          </>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">Page {page} / {pageCount} — {filteredEntries.length} résultats</div>
          <div className="space-x-2">
            <button disabled={page<=1} onClick={() => setPage(p => Math.max(1,p-1))} className="px-2 py-1 border rounded">Préc</button>
            <button disabled={page>=pageCount} onClick={() => setPage(p => Math.min(pageCount,p+1))} className="px-2 py-1 border rounded">Suiv</button>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="border p-1 rounded">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        {showEditModal && editEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">
            <div className="bg-white rounded shadow p-4 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-2">Éditer écriture</h3>
              <div className="grid grid-cols-1 gap-2">
                <label className="text-xs">Date</label>
                <input type="date" value={editEntry.date?.slice(0,10)} onChange={e => setEditEntry(prev => prev ? { ...prev, date: e.target.value } : prev)} className="p-2 border rounded" />
                <label className="text-xs">Type</label>
                <select value={editEntry.type} onChange={e => setEditEntry(prev => prev ? { ...prev, type: e.target.value as any } : prev)} className="p-2 border rounded">
                  <option value="Entree">Entrée</option>
                  <option value="Sortie">Sortie</option>
                </select>
                <label className="text-xs">Catégorie</label>
                <input value={editEntry.category} onChange={e => setEditEntry(prev => prev ? { ...prev, category: e.target.value } : prev)} className="p-2 border rounded" />
                <label className="text-xs">Montant</label>
                <input type="number" value={String(editEntry.amount || 0)} onChange={e => setEditEntry(prev => prev ? { ...prev, amount: Number(e.target.value) } : prev)} className="p-2 border rounded" />
                <label className="text-xs">Note</label>
                <input value={editEntry.note || ''} onChange={e => setEditEntry(prev => prev ? { ...prev, note: e.target.value } : prev)} className="p-2 border rounded" />
              </div>
              <div className="mt-3 flex justify-end space-x-2">
                <button onClick={() => { setShowEditModal(false); setEditEntry(null); }} className="px-3 py-1 border rounded">Annuler</button>
                <button onClick={() => handleUpdate(editEntry)} className="px-3 py-1 bg-green-600 text-white rounded">Enregistrer</button>
              </div>
            </div>
          </div>
        )}
        {/* Hidden print container used by handlePrint */}
        <div id="print-area" style={{ position: 'absolute', left: '-9999px', top: '0', width: '0', height: '0', overflow: 'hidden' }} />
      </div>
    </div>
  );
}
