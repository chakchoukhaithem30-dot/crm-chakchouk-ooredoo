import { html, useState, useEffect } from '../utils/html.js';
import { Icon } from './Icons.js';
import { formatCurrency, formatDateFR, daysUntil, getRenewalUrgency } from '../utils/formatters.js';
import {
  TELECOM_SERVICES,
  CLIENT_CATEGORIES,
  CLIENT_SIZES,
  CLIENT_SECTORS,
  RENEWAL_STATUSES,
} from '../data/seedData.js';

export function ClientDetailModal({
  client,
  isNew,
  sales = [],
  emails = [],
  onClose,
  onSaveClient,
  onDeleteClient,
  onQuickEmailClient,
}) {
  const [editing, setEditing] = useState(Boolean(isNew));
  const [form, setForm] = useState(() =>
    client
      ? { ...client, services: [...(client.services || [])] }
      : {
          id: `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
          companyName: '',
          category: 'Grand Compte',
          size: 'Grande Entreprise',
          sector: 'IT & Services',
          decisionMaker: '',
          email: '',
          phone: '+216 ',
          city: 'Tunis',
          services: ['Fibre Optique Dédiée (LS/FO)'],
          mrc: 0,
          contractStartDate: '',
          renewalDate: '',
          renewalStatus: 'À contacter',
          notes: '',
        }
  );

  useEffect(() => {
    if (client) {
      setForm({ ...client, services: [...(client.services || [])] });
      setEditing(Boolean(isNew));
    }
  }, [client, isNew]);

  if (!client && !isNew) return null;

  const clientSales = sales.filter((s) => s.clientId === form.id);
  const clientEmails = emails.filter((e) => e.clientId === form.id);
  const days = daysUntil(form.renewalDate);
  const urgency = getRenewalUrgency(days);

  const toggleService = (svc) => {
    setForm((prev) => {
      const exists = prev.services.includes(svc);
      return {
        ...prev,
        services: exists ? prev.services.filter((s) => s !== svc) : [...prev.services, svc],
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) return;
    onSaveClient({
      ...form,
      mrc: Number(form.mrc) || 0,
    });
  };

  return html`
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <!-- En-tête modal -->
        <div className="px-6 py-4 bg-gradient-to-r from-brand-600 to-brand-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <${Icon} name="Building2" size=${20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold truncate">
                ${isNew ? 'Nouveau Compte Client' : form.companyName}
              </h3>
              <div className="text-xs text-white/80 flex items-center gap-2">
                <span className="tabular-nums">${form.id}</span>
                ${!isNew && html`<span>·</span><span>${form.category} · ${form.sector}</span>`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            ${!isNew && !editing &&
            html`
              <button
                type="button"
                onClick=${() => setEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors"
              >
                <${Icon} name="Pencil" size=${14} />
                <span>Modifier</span>
              </button>
            `}
            <button
              type="button"
              onClick=${onClose}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
              aria-label="Fermer"
            >
              <${Icon} name="X" size=${20} />
            </button>
          </div>
        </div>

        <!-- Contenu -->
        <div className="p-6 overflow-y-auto space-y-6">
          ${editing
            ? html`
                <form id="client-edit-form" onSubmit=${handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Raison Sociale *
                      </label>
                      <input
                        type="text"
                        required
                        value=${form.companyName}
                        onInput=${(e) => setForm({ ...form, companyName: e.target.value })}
                        placeholder="Ex: Groupe Industriel du Nord"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Décideur / Vis-à-vis
                      </label>
                      <input
                        type="text"
                        value=${form.decisionMaker}
                        onInput=${(e) => setForm({ ...form, decisionMaker: e.target.value })}
                        placeholder="Nom & Fonction"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Adresse Email
                      </label>
                      <input
                        type="email"
                        value=${form.email}
                        onInput=${(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="contact@entreprise.tn"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Numéro de Téléphone
                      </label>
                      <input
                        type="text"
                        value=${form.phone}
                        onInput=${(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+216 71 000 000"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Ville / Gouvernorat
                      </label>
                      <input
                        type="text"
                        value=${form.city}
                        onInput=${(e) => setForm({ ...form, city: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie</label>
                      <select
                        value=${form.category}
                        onChange=${(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        ${CLIENT_CATEGORIES.map((c) => html`<option key=${c} value=${c}>${c}</option>`)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Taille</label>
                      <select
                        value=${form.size}
                        onChange=${(e) => setForm({ ...form, size: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        ${CLIENT_SIZES.map((s) => html`<option key=${s} value=${s}>${s}</option>`)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Secteur</label>
                      <select
                        value=${form.sector}
                        onChange=${(e) => setForm({ ...form, sector: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        ${CLIENT_SECTORS.map((s) => html`<option key=${s} value=${s}>${s}</option>`)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        MRC Mensuel (DT)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value=${form.mrc}
                        onInput=${(e) => setForm({ ...form, mrc: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date d’échéance contrat
                      </label>
                      <input
                        type="date"
                        value=${form.renewalDate || ''}
                        onChange=${(e) => setForm({ ...form, renewalDate: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date anniversaire / Début
                      </label>
                      <input
                        type="date"
                        value=${form.contractStartDate || ''}
                        onChange=${(e) => setForm({ ...form, contractStartDate: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Statut Renouvellement
                      </label>
                      <select
                        value=${form.renewalStatus || 'À contacter'}
                        onChange=${(e) => setForm({ ...form, renewalStatus: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        ${RENEWAL_STATUSES.map((st) => html`<option key=${st} value=${st}>${st}</option>`)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Services Télécom Actifs
                    </label>
                    <div className="flex flex-wrap gap-2">
                      ${TELECOM_SERVICES.map((svc) => {
                        const checked = form.services.includes(svc);
                        return html`
                          <button
                            key=${svc}
                            type="button"
                            onClick=${() => toggleService(svc)}
                            className=${`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                              checked
                                ? 'bg-brand-600 text-white border-brand-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                            }`}
                          >
                            ${checked ? '✓ ' : '+ '}${svc}
                          </button>
                        `;
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notes compte</label>
                    <textarea
                      rows="2"
                      value=${form.notes || ''}
                      onInput=${(e) => setForm({ ...form, notes: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    ></textarea>
                  </div>
                </form>
              `
            : html`
                <!-- Vue lecture Fiche Client -->
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Décideur / Vis-à-vis
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-2">
                      <${Icon} name="UserCheck" size=${16} className="text-brand-600" />
                      <span>${form.decisionMaker || 'Non renseigné'}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                      <${Icon} name="MapPin" size=${14} className="text-slate-400" />
                      <span>${form.city || 'Tunisie'} · ${form.size}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Coordonnées Directes
                    </div>
                    <a
                      href=${form.email ? `mailto:${form.email}` : '#'}
                      className="text-sm font-semibold text-brand-600 hover:underline flex items-center gap-2"
                    >
                      <${Icon} name="Mail" size=${15} />
                      <span>${form.email || 'Aucun email'}</span>
                    </a>
                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-2 tabular-nums">
                      <${Icon} name="Phone" size=${15} className="text-slate-500" />
                      <span>${form.phone || 'Aucun téléphone'}</span>
                    </div>
                  </div>
                </div>

                <!-- Services Actifs -->
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                    Services Télécom Actifs
                  </div>
                  <div className="flex flex-wrap gap-2">
                    ${(form.services || []).length === 0
                      ? html`<span className="text-xs text-slate-400 italic">Aucun service renseigné</span>`
                      : form.services.map((svc) => html`
                          <span
                            key=${svc}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold"
                          >
                            <${Icon} name="Wifi" size=${13} />
                            ${svc}
                          </span>
                        `)}
                  </div>
                </div>

                <!-- Contrat & Renouvellement -->
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-slate-200 bg-white">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">MRC Actuel</div>
                    <div className="text-lg font-extrabold text-slate-900 mt-0.5 tabular-nums">
                      ${formatCurrency(form.mrc)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Échéance Contrat</div>
                    <div className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-2">
                      <span>${formatDateFR(form.renewalDate)}</span>
                    </div>
                    <span className=${`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${urgency.badgeClass}`}>
                      ${urgency.label}
                    </span>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Anniversaire / Statut</div>
                    <div className="text-sm font-semibold text-slate-700 mt-1">${formatDateFR(form.contractStartDate)}</div>
                    <div className="text-xs font-bold text-brand-600 mt-0.5">${form.renewalStatus || 'À contacter'}</div>
                  </div>
                </div>

                ${form.notes &&
                html`
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-slate-700">
                    <strong className="text-slate-900">Notes Grands Comptes :</strong> ${form.notes}
                  </div>
                `}

                <!-- Historique rapide deals & emails -->
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2">
                      Réalisations liées (${clientSales.length})
                    </div>
                    ${clientSales.length === 0
                      ? html`<p className="text-xs text-slate-400">Aucune vente enregistrée pour ce compte.</p>`
                      : html`<div className="space-y-1.5">
                          ${clientSales.slice(0, 3).map((s) => html`
                            <div key=${s.id} className="text-xs p-2 rounded-lg bg-slate-50 flex justify-between">
                              <span className="truncate font-medium text-slate-700">${s.service}</span>
                              <span className="font-bold text-brand-600 tabular-nums shrink-0 ml-2">${formatCurrency(s.mrc)}/m</span>
                            </div>
                          `)}
                        </div>`}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2">
                      Derniers échanges (${clientEmails.length})
                    </div>
                    ${clientEmails.length === 0
                      ? html`<p className="text-xs text-slate-400">Aucun email archivé pour ce contact.</p>`
                      : html`<div className="space-y-1.5">
                          ${clientEmails.slice(0, 3).map((em) => html`
                            <div key=${em.id} className="text-xs p-2 rounded-lg bg-slate-50 truncate">
                              <span className="font-bold text-slate-700">${em.direction === 'entrant' ? '↙' : '↗'} ${em.subject}</span>
                            </div>
                          `)}
                        </div>`}
                  </div>
                </div>
              `}
        </div>

        <!-- Pied modal -->
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            ${!isNew && !editing &&
            html`
              <button
                type="button"
                onClick=${() => onDeleteClient(form.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <${Icon} name="Trash2" size=${15} />
                <span>Supprimer</span>
              </button>
            `}
          </div>
          <div className="flex items-center gap-2.5">
            ${editing
              ? html`
                  <button
                    type="button"
                    onClick=${() => (isNew ? onClose() : setEditing(false))}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    form="client-edit-form"
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm"
                  >
                    ${isNew ? 'Créer le compte' : 'Enregistrer'}
                  </button>
                `
              : html`
                  <button
                    type="button"
                    onClick=${() => {
                      onClose();
                      onQuickEmailClient(form, 'tpl-renewal');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm"
                  >
                    <${Icon} name="Mail" size=${16} />
                    <span>Contacter par Email</span>
                  </button>
                  <button
                    type="button"
                    onClick=${onClose}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
                  >
                    Fermer
                  </button>
                `}
          </div>
        </div>
      </div>
    </div>
  `;
}

