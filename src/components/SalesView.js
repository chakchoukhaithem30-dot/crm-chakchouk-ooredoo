import { html, useState, useMemo } from '../utils/html.js';
import { Icon } from './Icons.js';
import {
  formatCurrency,
  formatDateFR,
  formatMonthYearFR,
  getCurrentMonthKey,
  toISODate,
} from '../utils/formatters.js';
import { TELECOM_SERVICES } from '../data/seedData.js';
import { exportRowsToCSV } from '../utils/excelImport.js';

function EndOfMonthReportModal({ monthKey, sales, settings, onClose }) {
  if (!monthKey) return null;

  const monthSales = useMemo(
    () =>
      sales
        .filter((s) => (s.date || '').startsWith(monthKey))
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [sales, monthKey]
  );

  const totalMrc = monthSales.reduce((acc, s) => acc + (Number(s.mrc) || 0), 0);
  const totalTcv = monthSales.reduce((acc, s) => acc + (Number(s.tcv) || 0), 0);
  const avgMrc = monthSales.length > 0 ? Math.round(totalMrc / monthSales.length) : 0;
  const target = Number(settings.monthlyTargetMrc) || 40000;
  const attainment = target > 0 ? Math.round((totalMrc / target) * 100) : 0;

  const byService = useMemo(() => {
    const map = new Map();
    for (const s of monthSales) {
      const k = s.service || 'Autre';
      const cur = map.get(k) || { service: k, mrc: 0, tcv: 0, count: 0 };
      cur.mrc += Number(s.mrc) || 0;
      cur.tcv += Number(s.tcv) || 0;
      cur.count += 1;
      map.set(k, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.mrc - a.mrc);
  }, [monthSales]);

  const handleExportReportCSV = () => {
    const headers = ['ID Deal', 'Date', 'Client', 'Service Télécom', 'Type', 'MRC (DT)', 'Durée (mois)', 'TCV (DT)', 'Notes'];
    const rows = monthSales.map((s) => [
      s.id,
      s.date,
      s.clientName,
      s.service,
      s.type,
      s.mrc,
      s.durationMonths,
      s.tcv,
      s.notes || '',
    ]);
    exportRowsToCSV(`Rapport_Ventes_${monthKey}.csv`, headers, rows);
  };

  return html`
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="print-only-area bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <!-- Barre actions (cachée à l'impression) -->
        <div className="no-print px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <${Icon} name="FileText" size=${20} className="text-brand-400" />
            <span className="font-bold text-sm">Aperçu — Rapport de Fin de Mois</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick=${handleExportReportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors"
            >
              <${Icon} name="Download" size=${14} />
              <span>Exporter CSV</span>
            </button>
            <button
              type="button"
              onClick=${() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-bold transition-colors"
            >
              <${Icon} name="Printer" size=${14} />
              <span>Imprimer / PDF</span>
            </button>
            <button
              type="button"
              onClick=${onClose}
              className="p-1.5 rounded-lg hover:bg-white/15"
              aria-label="Fermer"
            >
              <${Icon} name="X" size=${18} />
            </button>
          </div>
        </div>

        <!-- Corps imprimable du rapport -->
        <div className="p-8 overflow-y-auto space-y-6 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b-2 border-brand-600 pb-5">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-widest text-brand-600">
                TelcoPro B2B · Direction Grands Comptes
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                Rapport Mensuel des Réalisations
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Période : <strong className="text-slate-900">${formatMonthYearFR(monthKey)}</strong>
              </p>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5">
              <div className="font-bold text-slate-900 text-sm">${settings.managerName}</div>
              <div>${settings.managerRole}</div>
              <div>Édité le ${formatDateFR(toISODate(new Date()))}</div>
            </div>
          </div>

          <!-- KPI Synthèse -->
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-brand-50 border border-brand-200">
              <div className="text-[11px] font-bold uppercase text-brand-700">MRC Signé</div>
              <div className="text-xl font-extrabold text-brand-700 mt-1 tabular-nums">${formatCurrency(totalMrc)}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-bold uppercase text-slate-500">TCV Engagé</div>
              <div className="text-xl font-extrabold text-slate-900 mt-1 tabular-nums">${formatCurrency(totalTcv)}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-bold uppercase text-slate-500">Contrats Clôturés</div>
              <div className="text-xl font-extrabold text-slate-900 mt-1 tabular-nums">${monthSales.length}</div>
              <div className="text-[11px] text-slate-500 tabular-nums">Moy. ${formatCurrency(avgMrc)}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-bold uppercase text-slate-500">Atteinte Objectif</div>
              <div className="text-xl font-extrabold text-slate-900 mt-1 tabular-nums">${attainment}%</div>
              <div className="text-[11px] text-slate-500 tabular-nums">Cible ${formatCurrency(target)}</div>
            </div>
          </div>

          <!-- Ventilation par service -->
          ${byService.length > 0 &&
          html`
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Répartition par Ligne de Service Télécom
              </h3>
              <div className="space-y-2.5">
                ${byService.map((item) => {
                  const share = totalMrc > 0 ? Math.round((item.mrc / totalMrc) * 100) : 0;
                  return html`
                    <div key=${item.service} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">${item.service} (${item.count})</span>
                        <span className="font-bold text-slate-900 tabular-nums">
                          ${formatCurrency(item.mrc)}/mois · ${share}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-brand-600 rounded-full" style=${{ width: `${share}%` }}></div>
                      </div>
                    </div>
                  `;
                })}
              </div>
            </div>
          `}

          <!-- Détail des deals clôturés -->
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Détail des Affaires Clôturées (${monthSales.length})
            </h3>
            ${monthSales.length === 0
              ? html`<p className="text-sm text-slate-500 italic py-4">Aucune réalisation enregistrée sur cette période.</p>`
              : html`
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Client</th>
                          <th className="py-2.5 px-3">Service</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3 text-right">MRC</th>
                          <th className="py-2.5 px-3 text-right">Durée</th>
                          <th className="py-2.5 px-3 text-right">TCV Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        ${monthSales.map((s) => html`
                          <tr key=${s.id}>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">${formatDateFR(s.date)}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">${s.clientName}</td>
                            <td className="py-2.5 px-3 text-slate-700">${s.service}</td>
                            <td className="py-2.5 px-3 text-slate-600">${s.type}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-brand-700 tabular-nums">${formatCurrency(s.mrc)}</td>
                            <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">${s.durationMonths} mois</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">${formatCurrency(s.tcv)}</td>
                          </tr>
                        `)}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t-2 border-slate-200 font-extrabold text-slate-900">
                          <td colspan="4" className="py-3 px-3 text-right uppercase text-[11px]">Total Période</td>
                          <td className="py-3 px-3 text-right text-brand-600 tabular-nums">${formatCurrency(totalMrc)}</td>
                          <td className="py-3 px-3"></td>
                          <td className="py-3 px-3 text-right tabular-nums">${formatCurrency(totalTcv)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                `}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function SalesView({
  clients,
  sales,
  settings,
  onAddSale,
  onDeleteSale,
  onUpdateTarget,
}) {
  const currentMonthKey = getCurrentMonthKey();
  const [periodFilter, setPeriodFilter] = useState('month'); // 'week' | 'month' | 'custom_month' | 'all'
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [reportMonth, setReportMonth] = useState(null);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState(settings.monthlyTargetMrc || 40000);

  const [form, setForm] = useState({
    clientId: clients[0]?.id || '',
    service: TELECOM_SERVICES[0],
    type: 'Nouvelle Vente',
    date: toISODate(new Date()),
    mrc: '',
    durationMonths: 24,
    notes: '',
  });

  const computedTcv = useMemo(() => {
    return (Number(form.mrc) || 0) * (Number(form.durationMonths) || 12);
  }, [form.mrc, form.durationMonths]);

  const filteredSales = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const weekAgoIso = toISODate(weekAgo);

    return sales
      .filter((s) => {
        if (periodFilter === 'week') return (s.date || '') >= weekAgoIso;
        if (periodFilter === 'month') return (s.date || '').startsWith(currentMonthKey);
        if (periodFilter === 'custom_month') return (s.date || '').startsWith(selectedMonth);
        return true;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [sales, periodFilter, currentMonthKey, selectedMonth]);

  const totals = useMemo(() => {
    const mrc = filteredSales.reduce((acc, s) => acc + (Number(s.mrc) || 0), 0);
    const tcv = filteredSales.reduce((acc, s) => acc + (Number(s.tcv) || 0), 0);
    return { mrc, tcv, count: filteredSales.length };
  }, [filteredSales]);

  const currentMonthMrc = useMemo(
    () =>
      sales
        .filter((s) => (s.date || '').startsWith(currentMonthKey))
        .reduce((acc, s) => acc + (Number(s.mrc) || 0), 0),
    [sales, currentMonthKey]
  );

  const targetVal = Number(settings.monthlyTargetMrc) || 40000;
  const targetPct = Math.min(100, Math.round((currentMonthMrc / targetVal) * 100));

  const handleSubmit = (e) => {
    e.preventDefault();
    const mrcVal = Number(form.mrc);
    if (!form.clientId || !mrcVal || mrcVal <= 0) return;
    const clientObj = clients.find((c) => c.id === form.clientId);
    onAddSale({
      id: `VNT-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: form.clientId,
      clientName: clientObj ? clientObj.companyName : form.clientId,
      service: form.service,
      type: form.type,
      date: form.date || toISODate(new Date()),
      mrc: mrcVal,
      durationMonths: Number(form.durationMonths) || 24,
      tcv: mrcVal * (Number(form.durationMonths) || 24),
      notes: form.notes.trim(),
    });
    setForm((prev) => ({ ...prev, mrc: '', notes: '' }));
  };

  const activeReportMonth = periodFilter === 'custom_month' ? selectedMonth : currentMonthKey;

  return html`
    <div className="space-y-6">
      <!-- En-tête -->
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mes Réalisations</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Suivi quotidien & hebdomadaire des ventes B2B (MRC & Valeur Totale Contrat)
          </p>
        </div>
        <button
          type="button"
          onClick=${() => setReportMonth(activeReportMonth)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm shadow-brand-600/20 transition-colors self-start"
        >
          <${Icon} name="FileBarChart2" size=${18} />
          <span>Générer Rapport de Fin de Mois</span>
        </button>
      </div>

      <!-- Barre Objectif du mois en cours -->
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Progression Objectif — ${formatMonthYearFR(currentMonthKey)}
            </div>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="text-2xl font-extrabold text-brand-600 tabular-nums">
                ${formatCurrency(currentMonthMrc)}
              </span>
              <span className="text-sm text-slate-500 tabular-nums">
                / ${formatCurrency(targetVal)} (${targetPct}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            ${editingTarget
              ? html`
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value=${targetDraft}
                    onInput=${(e) => setTargetDraft(e.target.value)}
                    className="w-32 px-3 py-1.5 rounded-xl border border-slate-300 text-sm font-bold tabular-nums"
                  />
                  <button
                    type="button"
                    onClick=${() => {
                      onUpdateTarget(Number(targetDraft) || 40000);
                      setEditingTarget(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-bold"
                  >
                    Valider
                  </button>
                `
              : html`
                  <button
                    type="button"
                    onClick=${() => {
                      setTargetDraft(targetVal);
                      setEditingTarget(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <${Icon} name="SlidersHorizontal" size=${14} />
                    <span>Ajuster l’objectif</span>
                  </button>
                `}
          </div>
        </div>
        <div className="mt-3 w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-500"
            style=${{ width: `${targetPct}%` }}
          ></div>
        </div>
      </div>

      <!-- Grille Formulaire + Historique -->
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <!-- Formulaire de saisie rapide -->
        <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs h-fit">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <${Icon} name="PlusCircle" size=${20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Enregistrer une Vente</h2>
              <p className="text-xs text-slate-500">Saisie directe d’affaire clôturée</p>
            </div>
          </div>

          <form onSubmit=${handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Compte Client *</label>
              <select
                required
                value=${form.clientId}
                onChange=${(e) => setForm({ ...form, clientId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                ${clients.map((c) => html`<option key=${c.id} value=${c.id}>${c.companyName}</option>`)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Service Vendu *</label>
              <select
                value=${form.service}
                onChange=${(e) => setForm({ ...form, service: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                ${TELECOM_SERVICES.map((s) => html`<option key=${s} value=${s}>${s}</option>`)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type d’acte</label>
                <select
                  value=${form.type}
                  onChange=${(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Nouvelle Vente">Nouvelle Vente</option>
                  <option value="Upsell / Extension">Upsell / Extension</option>
                  <option value="Renouvellement">Renouvellement</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date signature</label>
                <input
                  type="date"
                  required
                  value=${form.date}
                  onChange=${(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Montant MRC (DT) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Ex: 4500"
                  value=${form.mrc}
                  onInput=${(e) => setForm({ ...form, mrc: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Engagement</label>
                <select
                  value=${form.durationMonths}
                  onChange=${(e) => setForm({ ...form, durationMonths: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value=${12}>12 mois</option>
                  <option value=${24}>24 mois</option>
                  <option value=${36}>36 mois</option>
                </select>
              </div>
            </div>

            <!-- Aperçu TCV calculé -->
            <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-between">
              <span className="text-xs font-bold text-brand-800">Valeur Totale Contrat (TCV)</span>
              <span className="text-base font-extrabold text-brand-700 tabular-nums">
                ${formatCurrency(computedTcv)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Commentaire / Détails</label>
              <input
                type="text"
                placeholder="Ex: 100 lignes + fibre redondée"
                value=${form.notes}
                onInput=${(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <${Icon} name="CheckCircle2" size=${17} />
              <span>Valider la Réalisation</span>
            </button>
          </form>
        </div>

        <!-- Journal des réalisations -->
        <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              ${[
                { id: 'week', label: '7 derniers jours' },
                { id: 'month', label: 'Mois en cours' },
                { id: 'custom_month', label: 'Par mois' },
                { id: 'all', label: 'Historique complet' },
              ].map((p) => html`
                <button
                  key=${p.id}
                  type="button"
                  onClick=${() => setPeriodFilter(p.id)}
                  className=${`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    periodFilter === p.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ${p.label}
                </button>
              `)}
              ${periodFilter === 'custom_month' &&
              html`
                <input
                  type="month"
                  value=${selectedMonth}
                  onChange=${(e) => setSelectedMonth(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              `}
            </div>

            <div className="text-xs font-semibold text-slate-600 tabular-nums">
              <strong className="text-slate-900">${totals.count}</strong> deal${totals.count > 1 ? 's' : ''} · MRC : <strong className="text-brand-600">${formatCurrency(totals.mrc)}</strong> · TCV : <strong className="text-slate-900">${formatCurrency(totals.tcv)}</strong>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Client & Notes</th>
                  <th className="py-3 px-4">Service & Type</th>
                  <th className="py-3 px-4 text-right">MRC</th>
                  <th className="py-3 px-4 text-right">TCV</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                ${filteredSales.length === 0
                  ? html`
                      <tr>
                        <td colspan="6" className="py-12 text-center text-slate-400">
                          <${Icon} name="Inbox" size=${32} className="mx-auto mb-2 text-slate-300" />
                          <p className="text-sm font-semibold text-slate-600">Aucune vente sur cette période</p>
                        </td>
                      </tr>
                    `
                  : filteredSales.map((s) => html`
                      <tr key=${s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                          ${formatDateFR(s.date)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">${s.clientName}</div>
                          ${s.notes && html`<div className="text-xs text-slate-500 mt-0.5">${s.notes}</div>`}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-semibold text-slate-800">${s.service}</div>
                          <span className=${`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.type === 'Nouvelle Vente'
                              ? 'bg-brand-50 text-brand-700'
                              : s.type === 'Upsell / Extension'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}>
                            ${s.type} · ${s.durationMonths}m
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-brand-600 tabular-nums whitespace-nowrap">
                          ${formatCurrency(s.mrc)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-800 tabular-nums whitespace-nowrap">
                          ${formatCurrency(s.tcv)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick=${() => onDeleteSale(s.id)}
                            title="Supprimer cette ligne"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          >
                            <${Icon} name="Trash2" size=${15} />
                          </button>
                        </td>
                      </tr>
                    `)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      ${reportMonth &&
      html`
        <${EndOfMonthReportModal}
          monthKey=${reportMonth}
          sales=${sales}
          settings=${settings}
          onClose=${() => setReportMonth(null)}
        />
      `}
    </div>
  `;
}

