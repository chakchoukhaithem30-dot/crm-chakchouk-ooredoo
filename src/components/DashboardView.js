import { html, useMemo, useState } from '../utils/html.js';
import { Icon } from './Icons.js';
import {
  formatCurrency,
  formatDateFR,
  daysUntil,
  getNextAnniversaryInfo,
  getRenewalUrgency,
  getCurrentMonthKey,
} from '../utils/formatters.js';
import { RENEWAL_STATUSES } from '../data/seedData.js';

const MONTH_LABELS = ['Janv', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

export function DashboardView({
  clients,
  sales,
  settings,
  onChangeAlertThreshold,
  onUpdateRenewalStatus,
  onOpenClientModal,
  onQuickEmailClient,
  onNavigate,
}) {
  const [alertFilter, setAlertFilter] = useState('all'); // 'all' | 'renewals' | 'anniversaries'
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState(null);

  const currentMonthKey = getCurrentMonthKey();
  const thresholdDays = settings.alertThresholdDays || 60;

  // Calculs KPI Ventes Mensuelles
  const kpiSales = useMemo(() => {
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const currentSales = sales.filter((s) => (s.date || '').startsWith(currentMonthKey));
    const prevSales = sales.filter((s) => (s.date || '').startsWith(prevMonthKey));

    const currentMrc = currentSales.reduce((acc, s) => acc + (Number(s.mrc) || 0), 0);
    const currentTcv = currentSales.reduce((acc, s) => acc + (Number(s.tcv) || 0), 0);
    const prevMrc = prevSales.reduce((acc, s) => acc + (Number(s.mrc) || 0), 0);
    const target = Number(settings.monthlyTargetMrc) || 40000;
    const attainment = target > 0 ? Math.min(100, Math.round((currentMrc / target) * 100)) : 0;
    const deltaPct = prevMrc > 0 ? Math.round(((currentMrc - prevMrc) / prevMrc) * 100) : null;

    return {
      currentMrc,
      currentTcv,
      dealsCount: currentSales.length,
      prevMrc,
      deltaPct,
      target,
      attainment,
    };
  }, [sales, currentMonthKey, settings.monthlyTargetMrc]);

  // Calculs KPI Comptes Actifs
  const kpiPortfolio = useMemo(() => {
    const total = clients.length;
    const vipCount = clients.filter((c) => c.category === 'VIP' || c.category === 'Grand Compte').length;
    const totalMrc = clients.reduce((acc, c) => acc + (Number(c.mrc) || 0), 0);
    return { total, vipCount, totalMrc };
  }, [clients]);

  // Calculs Renouvellements & Anniversaires
  const alertItems = useMemo(() => {
    const list = [];
    for (const c of clients) {
      const days = daysUntil(c.renewalDate);
      if (days !== null && days <= thresholdDays && c.renewalStatus !== 'Renouvelé') {
        list.push({
          uid: `ren-${c.id}`,
          kind: 'renewal',
          client: c,
          days,
          targetDate: c.renewalDate,
          urgency: getRenewalUrgency(days),
        });
      }
      const anniv = getNextAnniversaryInfo(c.contractStartDate);
      if (anniv && anniv.days <= thresholdDays && anniv.years >= 1) {
        list.push({
          uid: `ann-${c.id}`,
          kind: 'anniversary',
          client: c,
          days: anniv.days,
          targetDate: anniv.date,
          years: anniv.years,
        });
      }
    }
    list.sort((a, b) => a.days - b.days);
    return list;
  }, [clients, thresholdDays]);

  const pendingRenewalsOnly = useMemo(
    () => alertItems.filter((item) => item.kind === 'renewal'),
    [alertItems]
  );

  const displayedAlerts = useMemo(() => {
    if (alertFilter === 'renewals') return alertItems.filter((i) => i.kind === 'renewal');
    if (alertFilter === 'anniversaries') return alertItems.filter((i) => i.kind === 'anniversary');
    return alertItems;
  }, [alertItems, alertFilter]);

  const toContactCount = pendingRenewalsOnly.filter((i) => i.client.renewalStatus === 'À contacter').length;
  const offerSentCount = pendingRenewalsOnly.filter((i) => i.client.renewalStatus === 'Offre envoyée').length;
  const mrcAtRisk = pendingRenewalsOnly.reduce((acc, i) => acc + (Number(i.client.mrc) || 0), 0);

  // Données mensuelles du graphique État des ventes (année en cours)
  const monthlyChartData = useMemo(() => {
    const year = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const buckets = MONTH_LABELS.map((label, idx) => ({
      monthIndex: idx,
      label,
      monthKey: `${year}-${String(idx + 1).padStart(2, '0')}`,
      mrc: 0,
      tcv: 0,
      count: 0,
      isCurrent: idx === currentMonth,
    }));

    for (const sale of sales) {
      if (!sale.date) continue;
      const [y, m] = sale.date.split('-').map(Number);
      if (y === year && m >= 1 && m <= 12) {
        const b = buckets[m - 1];
        b.mrc += Number(sale.mrc) || 0;
        b.tcv += Number(sale.tcv) || 0;
        b.count += 1;
      }
    }
    return buckets;
  }, [sales]);

  const maxChartValue = useMemo(() => {
    const maxSale = Math.max(...monthlyChartData.map((b) => b.mrc), 0);
    const target = Number(settings.monthlyTargetMrc) || 40000;
    return Math.max(maxSale, target, 10000) * 1.15;
  }, [monthlyChartData, settings.monthlyTargetMrc]);

  const targetPctY = useMemo(() => {
    const target = Number(settings.monthlyTargetMrc) || 40000;
    return Math.min(95, Math.max(5, (target / maxChartValue) * 100));
  }, [maxChartValue, settings.monthlyTargetMrc]);

  return html`
    <div className="space-y-6">
      <!-- En-tête de section -->
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tableau de Bord</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Vue exécutive de votre portefeuille Grands Comptes & échéances télécom
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick=${() => onNavigate('sales')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm shadow-brand-600/20 transition-colors"
          >
            <${Icon} name="Plus" size=${17} />
            <span>Saisir une vente</span>
          </button>
          <button
            type="button"
            onClick=${() => onNavigate('portfolio')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-semibold shadow-xs transition-colors"
          >
            <${Icon} name="Upload" size=${16} className="text-brand-600" />
            <span>Importer Bases</span>
          </button>
        </div>
      </div>

      <!-- 3 Cartes KPI principales -->
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <!-- KPI 1: Ventes Mensuelles -->
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-brand-600"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ventes Mensuelles (MRC)
              </span>
              <div className="text-3xl font-extrabold text-slate-900 mt-2 tabular-nums">
                ${formatCurrency(kpiSales.currentMrc)}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <${Icon} name="TrendingUp" size=${22} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              TCV engagé : <strong className="text-slate-800 tabular-nums">${formatCurrency(kpiSales.currentTcv)}</strong>
            </span>
            <span className="font-semibold text-brand-600 tabular-nums">
              ${kpiSales.dealsCount} deal${kpiSales.dealsCount > 1 ? 's' : ''}
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
              <span>Objectif : ${formatCurrency(kpiSales.target)}</span>
              <span className="font-bold text-slate-800 tabular-nums">${kpiSales.attainment}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 rounded-full transition-all duration-500"
                style=${{ width: `${kpiSales.attainment}%` }}
              ></div>
            </div>
          </div>
        </div>

        <!-- KPI 2: Comptes Actifs -->
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Comptes Actifs
              </span>
              <div className="text-3xl font-extrabold text-slate-900 mt-2 tabular-nums">
                ${kpiPortfolio.total}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <${Icon} name="Building2" size=${22} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-semibold">
              <${Icon} name="Award" size=${13} />
              ${kpiPortfolio.vipCount} VIP & Grands Comptes
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Parc MRC récurrent</span>
            <span className="font-bold text-slate-900 tabular-nums">${formatCurrency(kpiPortfolio.totalMrc)} / mois</span>
          </div>
        </div>

        <!-- KPI 3: Renouvellements en Attente -->
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Renouvellements en Attente
              </span>
              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-3xl font-extrabold text-brand-600 tabular-nums">
                  ${pendingRenewalsOnly.length}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  sous ${thresholdDays} jours
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <${Icon} name="BellRing" size=${22} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-semibold tabular-nums">
              ${toContactCount} À contacter
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold tabular-nums">
              ${offerSentCount} Offre envoyée
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">MRC à sécuriser</span>
            <span className="font-bold text-brand-600 tabular-nums">${formatCurrency(mrcAtRisk)} / mois</span>
          </div>
        </div>
      </div>

      <!-- Grille principale : Graphique État des ventes + Widget Renouvellements & Anniversaires -->
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <!-- Graphique en barres : État des ventes -->
        <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">État des ventes ${new Date().getFullYear()}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Réalisations mensuelles en MRC (DT) comparées à votre objectif mensuel
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-brand-600 inline-block"></span>
                MRC signé
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-slate-400 inline-block"></span>
                Objectif (${formatCurrency(settings.monthlyTargetMrc)})
              </span>
            </div>
          </div>

          <div className="relative flex-1 min-h-[280px] flex flex-col justify-end pt-6">
            <!-- Ligne objectif -->
            <div
              className="absolute left-10 right-2 border-t-2 border-dashed border-slate-300 pointer-events-none z-10 flex justify-end"
              style=${{ bottom: `calc(${targetPctY * 0.78}% + 32px)` }}
            >
              <span className=" -mt-5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 tabular-nums">
                Cible ${formatCurrency(settings.monthlyTargetMrc)}
              </span>
            </div>

            <!-- Barres -->
            <div className="grid grid-cols-12 gap-1.5 sm:gap-2.5 items-end h-56 pl-2 pr-2 border-b border-slate-200 pb-1">
              ${monthlyChartData.map((b, idx) => {
                const heightPct = b.mrc > 0 ? Math.max(6, Math.round((b.mrc / maxChartValue) * 100)) : 2;
                const isHovered = hoveredMonthIdx === idx;
                return html`
                  <div
                    key=${b.monthKey}
                    className="relative flex flex-col items-center justify-end h-full group cursor-pointer"
                    onMouseEnter=${() => setHoveredMonthIdx(idx)}
                    onMouseLeave=${() => setHoveredMonthIdx(null)}
                  >
                    ${isHovered &&
                    html`
                      <div className="absolute -top-16 z-30 w-40 bg-slate-900 text-white text-[11px] rounded-xl p-2.5 shadow-xl pointer-events-none">
                        <div className="font-bold text-white">${b.label} ${new Date().getFullYear()}</div>
                        <div className="text-brand-300 font-bold tabular-nums mt-0.5">${formatCurrency(b.mrc)} MRC</div>
                        <div className="text-slate-300 tabular-nums">${b.count} deal${b.count > 1 ? 's' : ''} · TCV ${formatCurrency(b.tcv)}</div>
                      </div>
                    `}
                    <div className="w-full flex items-end justify-center h-full px-0.5">
                      <div
                        className=${`w-full max-w-[34px] rounded-t-lg transition-all duration-300 ${
                          b.mrc === 0
                            ? 'bg-slate-100'
                            : b.isCurrent
                              ? 'bg-brand-600 ring-2 ring-brand-200 shadow-md shadow-brand-600/20'
                              : isHovered
                                ? 'bg-brand-500'
                                : 'bg-brand-600/80 hover:bg-brand-600'
                        }`}
                        style=${{ height: `${heightPct}%` }}
                      ></div>
                    </div>
                  </div>
                `;
              })}
            </div>
            <div className="grid grid-cols-12 gap-1.5 sm:gap-2.5 px-2 pt-2">
              ${monthlyChartData.map((b) => html`
                <div
                  key=${`lbl-${b.monthKey}`}
                  className=${`text-center text-[11px] font-semibold ${
                    b.isCurrent ? 'text-brand-600 font-bold' : 'text-slate-500'
                  }`}
                >
                  ${b.label}
                </div>
              `)}
            </div>
          </div>
        </div>

        <!-- Widget : Renouvellements & Anniversaires à Venir -->
        <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Renouvellements & Anniversaires</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-600 text-white tabular-nums">
                  ${displayedAlerts.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Lecture en temps réel depuis la base d’échéances
              </p>
            </div>

            <!-- Seuil d'alerte configurable -->
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start">
              ${[30, 60, 90].map((daysOpt) => html`
                <button
                  key=${daysOpt}
                  type="button"
                  onClick=${() => onChangeAlertThreshold(daysOpt)}
                  className=${`px-2.5 py-1 rounded-lg text-xs font-bold transition-all tabular-nums ${
                    thresholdDays === daysOpt
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ${daysOpt}j
                </button>
              `)}
            </div>
          </div>

          <!-- Filtres rapides type d'alerte -->
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            ${[
              { id: 'all', label: `Tout (${alertItems.length})` },
              { id: 'renewals', label: `Échéances (${pendingRenewalsOnly.length})` },
              { id: 'anniversaries', label: `Anniversaires (${alertItems.length - pendingRenewalsOnly.length})` },
            ].map((tab) => html`
              <button
                key=${tab.id}
                type="button"
                onClick=${() => setAlertFilter(tab.id)}
                className=${`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  alertFilter === tab.id
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                ${tab.label}
              </button>
            `)}
          </div>

          <!-- Liste des alertes -->
          <div className="flex-1 space-y-3 max-h-[340px] overflow-y-auto pr-1">
            ${displayedAlerts.length === 0
              ? html`
                  <div className="py-10 text-center text-slate-400">
                    <${Icon} name="CheckCircle2" size=${36} className="mx-auto text-emerald-500 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">Aucune alerte sous ${thresholdDays} jours</p>
                    <p className="text-xs mt-1">Tous les contrats de cette fenêtre sont à jour.</p>
                  </div>
                `
              : displayedAlerts.map((item) => {
                  const isRenewal = item.kind === 'renewal';
                  return html`
                    <div
                      key=${item.uid}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-brand-200 hover:bg-brand-50/20 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick=${() => onOpenClientModal(item.client)}
                            className="text-sm font-bold text-slate-900 hover:text-brand-600 text-left truncate block max-w-full"
                          >
                            ${item.client.companyName}
                          </button>
                          <div className="text-xs text-slate-500 mt-0.5 truncate">
                            ${item.client.decisionMaker} · <span className="font-semibold text-slate-700 tabular-nums">${formatCurrency(item.client.mrc)}/mois</span>
                          </div>
                        </div>
                        ${isRenewal
                          ? html`<span className=${`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${item.urgency.badgeClass}`}>
                              ${item.urgency.label}
                            </span>`
                          : html`<span className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-brand-700 border border-rose-200 tabular-nums">
                              Anniv. ${item.years} an${item.years > 1 ? 's' : ''} · J-${item.days}
                            </span>`}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <${Icon} name="Calendar" size=${13} className="text-slate-400" />
                          <span>${isRenewal ? 'Échéance :' : 'Anniversaire :'} <strong className="text-slate-700">${formatDateFR(item.targetDate)}</strong></span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          ${isRenewal &&
                          html`
                            <select
                              value=${item.client.renewalStatus || 'À contacter'}
                              onChange=${(e) => onUpdateRenewalStatus(item.client.id, e.target.value)}
                              className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            >
                              ${RENEWAL_STATUSES.map((st) => html`<option key=${st} value=${st}>${st}</option>`)}
                            </select>
                          `}
                          <button
                            type="button"
                            onClick=${() => onQuickEmailClient(item.client, isRenewal ? 'tpl-renewal' : 'tpl-anniversary')}
                            title="Préparer un email de relance"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-600 text-brand-700 hover:text-white text-[11px] font-bold transition-colors"
                          >
                            <${Icon} name="Send" size=${12} />
                            <span>Relancer</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  `;
                })}
          </div>
        </div>
      </div>
    </div>
  `;
}

