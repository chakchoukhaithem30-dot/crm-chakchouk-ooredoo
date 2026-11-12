import { html, useState, useMemo, useRef } from '../utils/html.js';
import { Icon } from './Icons.js';
import {
  formatCurrency,
  formatDateFR,
  daysUntil,
  getRenewalUrgency,
} from '../utils/formatters.js';
import {
  CLIENT_CATEGORIES,
  CLIENT_SIZES,
  CLIENT_SECTORS,
} from '../data/seedData.js';
import {
  parseSpreadsheetFile,
  downloadTemplateXLSX,
  getDemoImportDataset,
  exportRowsToCSV,
} from '../utils/excelImport.js';

function ImportDropzone({
  title,
  subtitle,
  icon,
  type,
  onParsedFile,
  onSimulate,
  onError,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const processFile = async (file) => {
    if (!file) return;
    try {
      const parsed = await parseSpreadsheetFile(file);
      onParsedFile({ type, ...parsed, isSimulation: false });
    } catch (err) {
      onError(err.message || 'Impossible de lire ce fichier.');
    }
  };

  return html`
    <div
      onDragOver=${(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave=${() => setIsDragging(false)}
      onDrop=${(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer?.files?.[0];
        processFile(file);
      }}
      className=${`rounded-2xl border-2 border-dashed p-5 transition-all bg-white ${
        isDragging
          ? 'border-brand-600 bg-brand-50/60 shadow-md'
          : 'border-slate-300 hover:border-brand-400'
      }`}
    >
      <input
        ref=${inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange=${(e) => {
          const file = e.target.files?.[0];
          processFile(file);
          e.target.value = '';
        }}
      />
      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <${Icon} name=${icon} size=${22} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900">${title}</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">${subtitle}</p>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick=${() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <${Icon} name="Upload" size=${14} />
              <span>Importer .XLSX / .CSV</span>
            </button>
            <button
              type="button"
              onClick=${() => onSimulate(type)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <${Icon} name="Sparkles" size=${14} className="text-brand-600" />
              <span>Simuler l’import</span>
            </button>
            <button
              type="button"
              onClick=${() => downloadTemplateXLSX(type)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            >
              <${Icon} name="Download" size=${13} />
              <span>Modèle</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function PortfolioView({
  clients,
  onSelectClient,
  onCreateClient,
  onOpenImportModal,
  importBanner,
  onClearImportBanner,
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sizeFilter, setSizeFilter] = useState('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [groupBy, setGroupBy] = useState('none'); // 'none' | 'category' | 'size' | 'sector'
  const [errorMsg, setErrorMsg] = useState('');

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
      if (sizeFilter !== 'ALL' && c.size !== sizeFilter) return false;
      if (sectorFilter !== 'ALL' && c.sector !== sectorFilter) return false;
      if (!q) return true;
      return (
        (c.companyName || '').toLowerCase().includes(q) ||
        (c.decisionMaker || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q)
      );
    });
  }, [clients, search, categoryFilter, sizeFilter, sectorFilter]);

  const groupedData = useMemo(() => {
    if (groupBy === 'none') {
      return [{ groupName: null, items: filteredClients }];
    }
    const map = new Map();
    for (const c of filteredClients) {
      const key = c[groupBy] || 'Non renseigné';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    return Array.from(map.entries()).map(([groupName, items]) => ({ groupName, items }));
  }, [filteredClients, groupBy]);

  const totalFilteredMrc = useMemo(
    () => filteredClients.reduce((acc, c) => acc + (Number(c.mrc) || 0), 0),
    [filteredClients]
  );

  const handleSimulate = (type) => {
    setErrorMsg('');
    const demo = getDemoImportDataset(type, clients);
    onOpenImportModal({ type, ...demo, isSimulation: true });
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Raison Sociale',
      'Catégorie',
      'Taille',
      'Secteur',
      'Vis-à-vis',
      'Email',
      'Téléphone',
      'Ville',
      'Services Actifs',
      'MRC (DT)',
      'Date Échéance',
      'Statut Renouvellement',
    ];
    const rows = filteredClients.map((c) => [
      c.id,
      c.companyName,
      c.category,
      c.size,
      c.sector,
      c.decisionMaker,
      c.email,
      c.phone,
      c.city,
      (c.services || []).join(' | '),
      c.mrc,
      c.renewalDate,
      c.renewalStatus,
    ]);
    exportRowsToCSV('Portefeuille_Clients_Telco.csv', headers, rows);
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'VIP':
        return 'bg-brand-600 text-white';
      case 'Grand Compte':
        return 'bg-brand-50 text-brand-700 border border-brand-200';
      case 'Stratégique':
        return 'bg-slate-900 text-white';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return html`
    <div className="space-y-6">
      <!-- En-tête -->
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Portefeuille Clients</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestion des Grands Comptes, segmentation et importation de vos bases Excel/CSV
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick=${handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-semibold shadow-xs transition-colors"
          >
            <${Icon} name="Download" size=${16} />
            <span>Exporter CSV</span>
          </button>
          <button
            type="button"
            onClick=${onCreateClient}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm shadow-brand-600/20 transition-colors"
          >
            <${Icon} name="UserPlus" size=${17} />
            <span>Nouveau Client</span>
          </button>
        </div>
      </div>

      <!-- Zones d'importation des deux bases -->
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <${ImportDropzone}
          title="Importer Base Clients (Client Database)"
          subtitle="Glissez un fichier .xlsx ou .csv avec vos comptes, vis-à-vis, emails et services actifs."
          icon="Database"
          type="clients"
          onParsedFile=${(payload) => {
            setErrorMsg('');
            onOpenImportModal(payload);
          }}
          onSimulate=${handleSimulate}
          onError=${setErrorMsg}
        />
        <${ImportDropzone}
          title="Importer Base Dates d’Échéance (Renewal Dates)"
          subtitle="Synchronise automatiquement les dates de fin de contrat et d’anniversaire avec vos comptes."
          icon="CalendarClock"
          type="renewals"
          onParsedFile=${(payload) => {
            setErrorMsg('');
            onOpenImportModal(payload);
          }}
          onSimulate=${handleSimulate}
          onError=${setErrorMsg}
        />
      </div>

      ${errorMsg &&
      html`
        <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-200 text-xs font-semibold text-brand-700 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <${Icon} name="AlertTriangle" size=${16} />
            ${errorMsg}
          </span>
          <button type="button" onClick=${() => setErrorMsg('')} className="hover:underline">Fermer</button>
        </div>
      `}

      ${importBanner &&
      html`
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <${Icon} name="CheckCircle2" size=${16} className="text-emerald-600" />
            ${importBanner}
          </span>
          <button type="button" onClick=${onClearImportBanner} className="hover:underline">OK</button>
        </div>
      `}

      <!-- Barre de filtres & regroupement -->
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <${Icon} name="Search" size=${16} />
            </div>
            <input
              type="text"
              value=${search}
              onInput=${(e) => setSearch(e.target.value)}
              placeholder="Rechercher entreprise, vis-à-vis, email, tél..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <select
            value=${categoryFilter}
            onChange=${(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">Toutes catégories</option>
            ${CLIENT_CATEGORIES.map((c) => html`<option key=${c} value=${c}>${c}</option>`)}
          </select>

          <select
            value=${sizeFilter}
            onChange=${(e) => setSizeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">Toutes tailles</option>
            ${CLIENT_SIZES.map((s) => html`<option key=${s} value=${s}>${s}</option>`)}
          </select>

          <select
            value=${sectorFilter}
            onChange=${(e) => setSectorFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">Tous secteurs</option>
            ${CLIENT_SECTORS.map((s) => html`<option key=${s} value=${s}>${s}</option>`)}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-semibold">Grouper par :</span>
            ${[
              { id: 'none', label: 'Aucun' },
              { id: 'category', label: 'Catégorie' },
              { id: 'size', label: 'Taille' },
              { id: 'sector', label: 'Secteur' },
            ].map((g) => html`
              <button
                key=${g.id}
                type="button"
                onClick=${() => setGroupBy(g.id)}
                className=${`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  groupBy === g.id
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ${g.label}
              </button>
            `)}
          </div>
          <div className="text-slate-500 font-medium tabular-nums">
            <strong className="text-slate-900">${filteredClients.length}</strong> compte${filteredClients.length > 1 ? 's' : ''} · Parc filtré : <strong className="text-brand-600">${formatCurrency(totalFilteredMrc)}/mois</strong>
          </div>
        </div>
      </div>

      <!-- Tableau Portefeuille Clients -->
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Entreprise & Catégorie</th>
                <th className="py-3.5 px-4">Vis-à-vis & Contact</th>
                <th className="py-3.5 px-4">Secteur / Taille</th>
                <th className="py-3.5 px-4">Services Actifs</th>
                <th className="py-3.5 px-4 text-right">MRC</th>
                <th className="py-3.5 px-4">Échéance Contrat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              ${filteredClients.length === 0
                ? html`
                    <tr>
                      <td colspan="6" className="py-12 text-center text-slate-400">
                        <${Icon} name="SearchX" size=${32} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-600">Aucun compte trouvé</p>
                        <p className="text-xs mt-1">Ajustez vos filtres ou importez une base clients.</p>
                      </td>
                    </tr>
                  `
                : groupedData.map((group) => html`
                    <${window.React.Fragment} key=${group.groupName || 'all'}>
                      ${group.groupName &&
                      html`
                        <tr className="bg-brand-50/70 border-y border-brand-100">
                          <td colspan="6" className="py-2.5 px-4">
                            <div className="flex items-center justify-between text-xs font-bold text-brand-800">
                              <span>${group.groupName} (${group.items.length} compte${group.items.length > 1 ? 's' : ''})</span>
                              <span className="tabular-nums">
                                Sous-total MRC : ${formatCurrency(group.items.reduce((a, b) => a + (Number(b.mrc) || 0), 0))}
                              </span>
                            </div>
                          </td>
                        </tr>
                      `}
                      ${group.items.map((client) => {
                        const days = daysUntil(client.renewalDate);
                        const urgency = getRenewalUrgency(days);
                        return html`
                          <tr
                            key=${client.id}
                            onClick=${() => onSelectClient(client)}
                            className="hover:bg-brand-50/35 cursor-pointer transition-colors group"
                          >
                            <td className="py-3.5 px-4 align-top">
                              <div className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                                ${client.companyName}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className=${`px-2 py-0.5 rounded-full text-[10px] font-bold ${getCategoryBadge(client.category)}`}>
                                  ${client.category}
                                </span>
                                <span className="text-[11px] text-slate-400 tabular-nums">${client.id}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 align-top">
                              <div className="font-semibold text-slate-800 text-xs">${client.decisionMaker || '—'}</div>
                              <div className="text-xs text-slate-500 mt-0.5">${client.email || '—'}</div>
                              <div className="text-xs text-slate-500 tabular-nums">${client.phone || '—'}</div>
                            </td>

                            <td className="py-3.5 px-4 align-top">
                              <div className="text-xs font-semibold text-slate-700">${client.sector}</div>
                              <div className="text-xs text-slate-500 mt-0.5">${client.size}</div>
                            </td>

                            <td className="py-3.5 px-4 align-top max-w-[240px]">
                              <div className="flex flex-wrap gap-1">
                                ${(client.services || []).slice(0, 2).map((svc) => html`
                                  <span
                                    key=${svc}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium truncate max-w-[210px]"
                                  >
                                    ${svc}
                                  </span>
                                `)}
                                ${(client.services || []).length > 2 &&
                                html`<span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[11px] font-bold">
                                  +${client.services.length - 2}
                                </span>`}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 align-top text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                              ${formatCurrency(client.mrc)}
                            </td>

                            <td className="py-3.5 px-4 align-top whitespace-nowrap">
                              <div className="text-xs font-semibold text-slate-800">${formatDateFR(client.renewalDate)}</div>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className=${`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${urgency.badgeClass}`}>
                                  ${client.renewalStatus === 'Renouvelé' ? 'Renouvelé ✓' : urgency.label}
                                </span>
                              </div>
                            </td>
                          </tr>
                        `;
                      })}
                    </${window.React.Fragment}>
                  `)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

