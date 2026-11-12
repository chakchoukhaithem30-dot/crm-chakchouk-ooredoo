import { html, useState, useMemo, useEffect } from '../utils/html.js';
import { Icon } from './Icons.js';
import { formatDateFR, daysUntil } from '../utils/formatters.js';
import { EMAIL_TEMPLATES, CLIENT_CATEGORIES, CLIENT_SECTORS } from '../data/seedData.js';

function applyMergeTags(text, client) {
  if (!client) return text || '';
  const contactName = (client.decisionMaker || '').split('—')[0].trim() || 'Madame, Monsieur';
  const mainService = (client.services || [])[0] || 'Solutions Télécom B2B';
  const renewalStr = client.renewalDate ? formatDateFR(client.renewalDate) : 'prochainement';
  return (text || '')
    .replace(/\{\{vis_a_vis\}\}/g, contactName)
    .replace(/\{\{entreprise\}\}/g, client.companyName || '')
    .replace(/\{\{date_echeance\}\}/g, renewalStr)
    .replace(/\{\{service\}\}/g, mainService);
}

function buildMailtoHref(email, subject, body) {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  return `mailto:${encodeURIComponent(email || '')}?${params.toString().replace(/\+/g, '%20')}`;
}

export function ProspectionView({
  clients,
  emails,
  preselectedDraft,
  onClearPreselectedDraft,
  onSendEmails,
}) {
  const [subTab, setSubTab] = useState('inbox'); // 'inbox' | 'campaign'
  const [mailFilter, setMailFilter] = useState('all'); // 'all' | 'entrant' | 'sortant'
  const [mailSearch, setMailSearch] = useState('');
  const [selectedEmailId, setSelectedEmailId] = useState(emails[0]?.id || null);

  // Réponse rapide / Composer individuel
  const [replyOpen, setReplyOpen] = useState(false);
  const [singleDraft, setSingleDraft] = useState({
    clientId: clients[0]?.id || '',
    subject: '',
    body: '',
  });

  // État Mass Mailing
  const [selectedIds, setSelectedIds] = useState(() =>
    clients.slice(0, 4).map((c) => c.id)
  );
  const [contactFilterCat, setContactFilterCat] = useState('ALL');
  const [contactFilterSector, setContactFilterSector] = useState('ALL');
  const [onlyUrgent, setOnlyUrgent] = useState(false);

  const [campaignName, setCampaignName] = useState('Campagne Prospection B2B — Q4');
  const [templateId, setTemplateId] = useState(EMAIL_TEMPLATES[0].id);
  const [tplSubject, setTplSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [tplBody, setTplBody] = useState(EMAIL_TEMPLATES[0].body);
  const [previewClientId, setPreviewClientId] = useState('');
  const [sendingState, setSendingState] = useState({ active: false, progress: 0, log: [] });

  // Gestion pré-remplissage depuis le Dashboard ou Fiche Client
  useEffect(() => {
    if (preselectedDraft && preselectedDraft.client) {
      const tpl = EMAIL_TEMPLATES.find((t) => t.id === preselectedDraft.templateId) || EMAIL_TEMPLATES[0];
      setSubTab('campaign');
      setSelectedIds([preselectedDraft.client.id]);
      setPreviewClientId(preselectedDraft.client.id);
      setTemplateId(tpl.id);
      setTplSubject(tpl.subject);
      setTplBody(tpl.body);
      setSendingState({ active: false, progress: 0, log: [] });
      onClearPreselectedDraft();
    }
  }, [preselectedDraft]);

  const filteredEmails = useMemo(() => {
    const q = mailSearch.trim().toLowerCase();
    return emails
      .filter((em) => {
        if (mailFilter !== 'all' && em.direction !== mailFilter) return false;
        if (!q) return true;
        return (
          (em.clientName || '').toLowerCase().includes(q) ||
          (em.recipientName || '').toLowerCase().includes(q) ||
          (em.subject || '').toLowerCase().includes(q) ||
          (em.body || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [emails, mailFilter, mailSearch]);

  const selectedEmail = useMemo(
    () => filteredEmails.find((e) => e.id === selectedEmailId) || filteredEmails[0] || null,
    [filteredEmails, selectedEmailId]
  );

  // Contacts filtrables pour le Mass Mailing
  const filteredContacts = useMemo(() => {
    return clients.filter((c) => {
      if (contactFilterCat !== 'ALL' && c.category !== contactFilterCat) return false;
      if (contactFilterSector !== 'ALL' && c.sector !== contactFilterSector) return false;
      if (onlyUrgent) {
        const d = daysUntil(c.renewalDate);
        if (d === null || d > 60 || c.renewalStatus === 'Renouvelé') return false;
      }
      return true;
    });
  }, [clients, contactFilterCat, contactFilterSector, onlyUrgent]);

  const selectedClients = useMemo(
    () => clients.filter((c) => selectedIds.includes(c.id)),
    [clients, selectedIds]
  );

  const previewClient = useMemo(() => {
    return (
      selectedClients.find((c) => c.id === previewClientId) ||
      selectedClients[0] ||
      clients[0] ||
      null
    );
  }, [selectedClients, previewClientId, clients]);

  const handleSelectTemplate = (id) => {
    setTemplateId(id);
    const tpl = EMAIL_TEMPLATES.find((t) => t.id === id);
    if (tpl) {
      setTplSubject(tpl.subject);
      setTplBody(tpl.body);
    }
  };

  const toggleContact = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllFiltered = () => {
    const visibleIds = filteredContacts.map((c) => c.id);
    const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allChecked) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const insertMergeTag = (tag) => {
    setTplBody((prev) => `${prev}${prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' '}${tag}`);
  };

  const handleSimulateCampaign = () => {
    if (selectedClients.length === 0) return;
    setSendingState({ active: true, progress: 10, log: [] });

    const nowIso = new Date().toISOString();
    const generatedEmails = selectedClients.map((c, idx) => ({
      id: `EML-${Date.now()}-${idx}`,
      direction: 'sortant',
      clientId: c.id,
      clientName: c.companyName,
      recipientName: (c.decisionMaker || '').split('—')[0].trim() || c.companyName,
      recipientEmail: c.email,
      subject: applyMergeTags(tplSubject, c),
      body: applyMergeTags(tplBody, c),
      date: nowIso,
      campaignName: campaignName.trim() || 'Campagne Prospection',
      status: 'Simulé · Envoyé',
    }));

    setTimeout(() => {
      setSendingState({ active: true, progress: 65, log: [] });
    }, 220);

    setTimeout(() => {
      onSendEmails(generatedEmails);
      setSendingState({
        active: false,
        progress: 100,
        log: generatedEmails,
      });
    }, 550);
  };

  const handleSendSingleEmail = (e) => {
    e.preventDefault();
    const clientObj = clients.find((c) => c.id === singleDraft.clientId);
    if (!clientObj || !singleDraft.subject.trim()) return;
    const newMail = {
      id: `EML-${Date.now()}`,
      direction: 'sortant',
      clientId: clientObj.id,
      clientName: clientObj.companyName,
      recipientName: (clientObj.decisionMaker || '').split('—')[0].trim() || clientObj.companyName,
      recipientEmail: clientObj.email,
      subject: singleDraft.subject.trim(),
      body: singleDraft.body.trim(),
      date: new Date().toISOString(),
      campaignName: null,
      status: 'Envoyé',
    };
    onSendEmails([newMail]);
    setSelectedEmailId(newMail.id);
    setReplyOpen(false);
    setSingleDraft({ clientId: clientObj.id, subject: '', body: '' });
  };

  return html`
    <div className="space-y-6">
      <!-- En-tête & Onglets -->
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Prospection & Hub Email</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Centralisez vos échanges B2B et lancez des campagnes d’emailing ciblées
          </p>
        </div>
        <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200 shadow-xs self-start">
          <button
            type="button"
            onClick=${() => setSubTab('inbox')}
            className=${`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              subTab === 'inbox' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <${Icon} name="Inbox" size=${15} />
            <span>Messagerie (${emails.length})</span>
          </button>
          <button
            type="button"
            onClick=${() => setSubTab('campaign')}
            className=${`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              subTab === 'campaign' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <${Icon} name="Send" size=${15} />
            <span>Mass Mailing / Campagne</span>
          </button>
        </div>
      </div>

      ${subTab === 'inbox'
        ? html`
            <!-- VUE 1: MESSAGERIE CENTRALISÉE -->
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[540px]">
              <!-- Liste des emails -->
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      ${[
                        { id: 'all', label: 'Tous' },
                        { id: 'entrant', label: 'Reçus' },
                        { id: 'sortant', label: 'Envoyés' },
                      ].map((f) => html`
                        <button
                          key=${f.id}
                          type="button"
                          onClick=${() => setMailFilter(f.id)}
                          className=${`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                            mailFilter === f.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          ${f.label}
                        </button>
                      `)}
                    </div>
                    <button
                      type="button"
                      onClick=${() => {
                        setReplyOpen(true);
                        setSingleDraft({
                          clientId: selectedEmail?.clientId || clients[0]?.id || '',
                          subject: '',
                          body: '',
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold"
                    >
                      <${Icon} name="SquarePen" size=${14} />
                      <span>Écrire</span>
                    </button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                      <${Icon} name="Search" size=${15} />
                    </div>
                    <input
                      type="text"
                      value=${mailSearch}
                      onInput=${(e) => setMailSearch(e.target.value)}
                      placeholder="Filtrer par client, contact ou objet..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[480px]">
                  ${filteredEmails.length === 0
                    ? html`<div className="p-8 text-center text-xs text-slate-400">Aucun message correspondant.</div>`
                    : filteredEmails.map((em) => {
                        const isSelected = selectedEmail?.id === em.id && !replyOpen;
                        return html`
                          <button
                            key=${em.id}
                            type="button"
                            onClick=${() => {
                              setReplyOpen(false);
                              setSelectedEmailId(em.id);
                            }}
                            className=${`w-full text-left p-4 transition-colors ${
                              isSelected ? 'bg-brand-50/70 border-l-4 border-brand-600' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">${em.clientName}</span>
                              <span className=${`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                em.direction === 'entrant'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                ${em.direction === 'entrant' ? 'Reçu' : 'Envoyé'}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-slate-700 mt-1 truncate">${em.subject}</div>
                            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                              <span className="truncate">${em.recipientName}</span>
                              <span className="shrink-0 ml-2">${formatDateFR(em.date)}</span>
                            </div>
                          </button>
                        `;
                      })}
                </div>
              </div>

              <!-- Volet lecture ou rédaction -->
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col">
                ${replyOpen
                  ? html`
                      <form onSubmit=${handleSendSingleEmail} className="space-y-4 flex-1 flex flex-col">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h3 className="text-base font-bold text-slate-900">Nouvel Email B2B</h3>
                          <button
                            type="button"
                            onClick=${() => setReplyOpen(false)}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                          >
                            Annuler
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Destinataire</label>
                          <select
                            value=${singleDraft.clientId}
                            onChange=${(e) => setSingleDraft({ ...singleDraft, clientId: e.target.value })}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            ${clients.map((c) => html`
                              <option key=${c.id} value=${c.id}>
                                ${c.companyName} — ${c.decisionMaker} (${c.email})
                              </option>
                            `)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Objet *</label>
                          <input
                            type="text"
                            required
                            value=${singleDraft.subject}
                            onInput=${(e) => setSingleDraft({ ...singleDraft, subject: e.target.value })}
                            placeholder="Objet de votre message..."
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div className="flex-1 flex flex-col">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Message *</label>
                          <textarea
                            required
                            rows="8"
                            value=${singleDraft.body}
                            onInput=${(e) => setSingleDraft({ ...singleDraft, body: e.target.value })}
                            placeholder="Rédigez votre email..."
                            className="w-full flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          ></textarea>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                          <a
                            href=${buildMailtoHref(
                              clients.find((c) => c.id === singleDraft.clientId)?.email,
                              singleDraft.subject,
                              singleDraft.body
                            )}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <${Icon} name="ExternalLink" size=${14} />
                            <span>Ouvrir dans Outlook / Mail</span>
                          </a>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm"
                          >
                            <${Icon} name="Send" size=${15} />
                            <span>Simuler l’envoi & Archiver</span>
                          </button>
                        </div>
                      </form>
                    `
                  : selectedEmail
                    ? html`
                        <div className="flex-1 flex flex-col">
                          <div className="border-b border-slate-100 pb-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className=${`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                selectedEmail.direction === 'entrant'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-brand-50 text-brand-700'
                              }`}>
                                ${selectedEmail.direction === 'entrant' ? 'Email Reçu' : selectedEmail.status}
                              </span>
                              <span className="text-xs text-slate-400">${formatDateFR(selectedEmail.date)}</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mt-2">${selectedEmail.subject}</h3>
                            <div className="text-xs text-slate-500 mt-1">
                              Compte : <strong className="text-slate-800">${selectedEmail.clientName}</strong> · Contact : ${selectedEmail.recipientName} (${selectedEmail.recipientEmail})
                            </div>
                            ${selectedEmail.campaignName &&
                            html`
                              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-600">
                                <${Icon} name="Megaphone" size=${12} />
                                <span>Campagne : ${selectedEmail.campaignName}</span>
                              </div>
                            `}
                          </div>

                          <div className="py-5 flex-1 whitespace-pre-line text-sm text-slate-700 leading-relaxed">
                            ${selectedEmail.body}
                          </div>

                          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                            <a
                              href=${buildMailtoHref(
                                selectedEmail.recipientEmail,
                                `Re: ${selectedEmail.subject}`,
                                ''
                              )}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <${Icon} name="ExternalLink" size=${14} />
                              <span>Ouvrir dans Outlook</span>
                            </a>
                            <button
                              type="button"
                              onClick=${() => {
                                setSingleDraft({
                                  clientId: selectedEmail.clientId,
                                  subject: `Re: ${selectedEmail.subject}`,
                                  body: `\n\n--- Message précédent ---\n${selectedEmail.body}`,
                                });
                                setReplyOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs"
                            >
                              <${Icon} name="Reply" size=${15} />
                              <span>Répondre</span>
                            </button>
                          </div>
                        </div>
                      `
                    : html`
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                          Sélectionnez un email à gauche pour l’afficher.
                        </div>
                      `}
              </div>
            </div>
          `
        : html`
            <!-- VUE 2: MASS MAILING / PROSPECTION GROUPÉE -->
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <!-- Colonne gauche: Sélection multi-contacts avec cases à cocher -->
              <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">
                      1. Sélectionner les Destinataires
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-600 text-white tabular-nums">
                      ${selectedIds.length} sélectionné${selectedIds.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value=${contactFilterCat}
                      onChange=${(e) => setContactFilterCat(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
                    >
                      <option value="ALL">Toutes catégories</option>
                      ${CLIENT_CATEGORIES.map((c) => html`<option key=${c} value=${c}>${c}</option>`)}
                    </select>
                    <select
                      value=${contactFilterSector}
                      onChange=${(e) => setContactFilterSector(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
                    >
                      <option value="ALL">Tous secteurs</option>
                      ${CLIENT_SECTORS.map((s) => html`<option key=${s} value=${s}>${s}</option>`)}
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked=${onlyUrgent}
                        onChange=${(e) => setOnlyUrgent(e.target.checked)}
                        className="accent-brand-600 rounded"
                      />
                      <span>Échéances ≤ 60 jours uniquement</span>
                    </label>
                    <button
                      type="button"
                      onClick=${toggleAllFiltered}
                      className="font-bold text-brand-600 hover:underline"
                    >
                      Tout cocher / décocher
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[460px]">
                  ${filteredContacts.map((c) => {
                    const checked = selectedIds.includes(c.id);
                    return html`
                      <label
                        key=${c.id}
                        className=${`flex items-start gap-3 p-3.5 cursor-pointer transition-colors ${
                          checked ? 'bg-brand-50/45' : 'hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked=${checked}
                          onChange=${() => toggleContact(c.id)}
                          className="mt-1 w-4 h-4 accent-brand-600 rounded cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">${c.companyName}</span>
                            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              ${c.category}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5 truncate">${c.decisionMaker}</div>
                          <div className="text-[11px] text-slate-400 truncate">${c.email}</div>
                        </div>
                      </label>
                    `;
                  })}
                </div>
              </div>

              <!-- Colonne droite: Éditeur de campagne & Aperçu dynamique -->
              <div className="xl:col-span-7 space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h2 className="text-sm font-bold text-slate-900">
                      2. Modèle de Prospection & Variables Dynamiques
                    </h2>
                    <select
                      value=${templateId}
                      onChange=${(e) => handleSelectTemplate(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      ${EMAIL_TEMPLATES.map((t) => html`<option key=${t.id} value=${t.id}>Modèle : ${t.name}</option>`)}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nom de la campagne</label>
                      <input
                        type="text"
                        value=${campaignName}
                        onInput=${(e) => setCampaignName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Objet de l’email</label>
                      <input
                        type="text"
                        value=${tplSubject}
                        onInput=${(e) => setTplSubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">Corps du message</label>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[11px] text-slate-400 mr-1">Insérer :</span>
                        ${['{{vis_a_vis}}', '{{entreprise}}', '{{date_echeance}}', '{{service}}'].map((tag) => html`
                          <button
                            key=${tag}
                            type="button"
                            onClick=${() => insertMergeTag(tag)}
                            className="px-2 py-0.5 rounded-md bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-mono font-bold transition-colors"
                          >
                            ${tag}
                          </button>
                        `)}
                      </div>
                    </div>
                    <textarea
                      rows="6"
                      value=${tplBody}
                      onInput=${(e) => setTplBody(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500"
                    ></textarea>
                  </div>

                  <!-- Aperçu personnalisé -->
                  ${previewClient &&
                  html`
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Aperçu en direct pour :
                        </span>
                        <select
                          value=${previewClient.id}
                          onChange=${(e) => setPreviewClientId(e.target.value)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                        >
                          ${(selectedClients.length > 0 ? selectedClients : clients).map((c) => html`
                            <option key=${c.id} value=${c.id}>${c.companyName}</option>
                          `)}
                        </select>
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        Objet : ${applyMergeTags(tplSubject, previewClient)}
                      </div>
                      <div className="text-xs text-slate-600 whitespace-pre-line border-t border-slate-200 pt-2">
                        ${applyMergeTags(tplBody, previewClient)}
                      </div>
                    </div>
                  `}

                  <!-- Boutons d'envoi -->
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    ${previewClient &&
                    html`
                      <a
                        href=${buildMailtoHref(
                          previewClient.email,
                          applyMergeTags(tplSubject, previewClient),
                          applyMergeTags(tplBody, previewClient)
                        )}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <${Icon} name="ExternalLink" size=${14} />
                        <span>Ouvrir l’aperçu dans Outlook</span>
                      </a>
                    `}
                    <button
                      type="button"
                      disabled=${selectedClients.length === 0 || sendingState.active}
                      onClick=${handleSimulateCampaign}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-bold shadow-sm transition-colors ml-auto"
                    >
                      <${Icon} name="Send" size=${16} />
                      <span>
                        ${sendingState.active
                          ? 'Envoi en cours...'
                          : `Simuler l’envoi (${selectedClients.length} contact${selectedClients.length > 1 ? 's' : ''})`}
                      </span>
                    </button>
                  </div>

                  ${sendingState.active &&
                  html`
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-600 transition-all duration-300"
                        style=${{ width: `${sendingState.progress}%` }}
                      ></div>
                    </div>
                  `}
                </div>

                <!-- Journal d'envoi de la campagne simulée -->
                ${sendingState.log.length > 0 &&
                html`
                  <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                        <${Icon} name="CheckCircle2" size=${18} />
                        <span>Campagne simulée avec succès (${sendingState.log.length} emails envoyés & archivés)</span>
                      </div>
                      <button
                        type="button"
                        onClick=${() => setSubTab('inbox')}
                        className="text-xs font-bold text-brand-600 hover:underline"
                      >
                        Voir dans la messagerie →
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto border border-slate-100 rounded-xl">
                      ${sendingState.log.map((item) => html`
                        <div key=${item.id} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900">${item.clientName}</span>
                            <span className="text-slate-500 ml-2">${item.recipientEmail}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href=${buildMailtoHref(item.recipientEmail, item.subject, item.body)}
                              className="text-[11px] font-semibold text-brand-600 hover:underline"
                            >
                              mailto
                            </a>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                              Envoyé ✓
                            </span>
                          </div>
                        </div>
                      `)}
                    </div>
                  </div>
                `}
              </div>
            </div>
          `}
    </div>
  `;
}

