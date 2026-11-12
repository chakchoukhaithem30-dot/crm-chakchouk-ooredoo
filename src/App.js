import { html, useState, useEffect, useMemo } from './utils/html.js';
import { loadCRMState, saveCRMState, resetCRMState } from './utils/storage.js';
import { daysUntil } from './utils/formatters.js';
import { Sidebar } from './components/Sidebar.js';
import { DashboardView } from './components/DashboardView.js';
import { PortfolioView } from './components/PortfolioView.js';
import { SalesView } from './components/SalesView.js';
import { ProspectionView } from './components/ProspectionView.js';
import { ClientDetailModal } from './components/ClientDetailModal.js';
import { ImportMappingModal } from './components/ImportMappingModal.js';
import { Icon } from './components/Icons.js';

export function App() {
  const [state, setState] = useState(() => loadCRMState());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modales & états transverses
  const [modalClient, setModalClient] = useState(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [importPayload, setImportPayload] = useState(null);
  const [importBanner, setImportBanner] = useState('');
  const [preselectedEmailDraft, setPreselectedEmailDraft] = useState(null);

  useEffect(() => {
    saveCRMState(state);
  }, [state]);

  // Compteurs d'alertes renouvellement pour la sidebar & badges
  const { pendingRenewalsCount, urgentRenewalsCount } = useMemo(() => {
    const threshold = state.settings.alertThresholdDays || 60;
    let pending = 0;
    let urgent = 0;
    for (const c of state.clients) {
      if (c.renewalStatus === 'Renouvelé') continue;
      const d = daysUntil(c.renewalDate);
      if (d !== null && d <= threshold) {
        pending += 1;
        if (d <= 30) urgent += 1;
      }
    }
    return { pendingRenewalsCount: pending, urgentRenewalsCount: urgent };
  }, [state.clients, state.settings.alertThresholdDays]);

  const unreadEmailsCount = useMemo(
    () => state.emails.filter((e) => e.direction === 'entrant').length,
    [state.emails]
  );

  // Handlers
  const handleChangeAlertThreshold = (days) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, alertThresholdDays: days },
    }));
  };

  const handleUpdateTarget = (newTarget) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, monthlyTargetMrc: newTarget },
    }));
  };

  const handleUpdateRenewalStatus = (clientId, status) => {
    setState((prev) => ({
      ...prev,
      clients: prev.clients.map((c) => (c.id === clientId ? { ...c, renewalStatus: status } : c)),
    }));
  };

  const handleSaveClient = (savedClient) => {
    setState((prev) => {
      const exists = prev.clients.some((c) => c.id === savedClient.id);
      const nextClients = exists
        ? prev.clients.map((c) => (c.id === savedClient.id ? savedClient : c))
        : [savedClient, ...prev.clients];
      return { ...prev, clients: nextClients };
    });
    setModalClient(null);
    setIsCreatingClient(false);
  };

  const handleDeleteClient = (clientId) => {
    setState((prev) => ({
      ...prev,
      clients: prev.clients.filter((c) => c.id !== clientId),
    }));
    setModalClient(null);
  };

  const handleConfirmImport = ({ type, rows, mergeMode }) => {
    if (type === 'clients') {
      let added = 0;
      let updated = 0;
      setState((prev) => {
        const base = mergeMode === 'replace' ? [] : [...prev.clients];
        for (const r of rows) {
          const name = (r.companyName || '').trim();
          if (!name) continue;
          const servicesArr = (r.services || '')
            .split(/[;,|]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          const idx = base.findIndex(
            (c) => (c.companyName || '').toLowerCase() === name.toLowerCase()
          );
          if (idx >= 0) {
            base[idx] = {
              ...base[idx],
              decisionMaker: r.decisionMaker || base[idx].decisionMaker,
              email: r.email || base[idx].email,
              phone: r.phone || base[idx].phone,
              category: r.category || base[idx].category,
              size: r.size || base[idx].size,
              sector: r.sector || base[idx].sector,
              city: r.city || base[idx].city,
              mrc: Number(r.mrc) || base[idx].mrc,
              services: servicesArr.length > 0 ? servicesArr : base[idx].services,
            };
            updated += 1;
          } else {
            base.unshift({
              id: `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
              companyName: name,
              decisionMaker: r.decisionMaker || 'Contact à qualifier',
              email: r.email || '',
              phone: r.phone || '+216 ',
              category: r.category || 'Grand Compte',
              size: r.size || 'ETI',
              sector: r.sector || 'IT & Services',
              city: r.city || 'Tunis',
              services: servicesArr.length > 0 ? servicesArr : ['Fibre Optique Dédiée (LS/FO)'],
              mrc: Number(r.mrc) || 0,
              contractStartDate: '',
              renewalDate: '',
              renewalStatus: 'À contacter',
              notes: 'Importé depuis fichier Base Clients.',
            });
            added += 1;
          }
        }
        return { ...prev, clients: base };
      });
      setImportBanner(
        `Base Clients importée avec succès : ${added} nouveau${added > 1 ? 'x' : ''} compte${added > 1 ? 's' : ''}, ${updated} mis à jour.`
      );
    } else {
      let matched = 0;
      let unmatched = 0;
      setState((prev) => {
        const nextClients = [...prev.clients];
        for (const r of rows) {
          const idClean = (r.id || '').trim().toLowerCase();
          const nameClean = (r.companyName || '').trim().toLowerCase();
          const idx = nextClients.findIndex(
            (c) =>
              (idClean && (c.id || '').toLowerCase() === idClean) ||
              (nameClean && (c.companyName || '').toLowerCase() === nameClean)
          );
          if (idx >= 0) {
            nextClients[idx] = {
              ...nextClients[idx],
              renewalDate: r.renewalDate || nextClients[idx].renewalDate,
              contractStartDate: r.contractStartDate || nextClients[idx].contractStartDate,
              renewalStatus: r.renewalStatus || nextClients[idx].renewalStatus || 'À contacter',
            };
            matched += 1;
          } else {
            unmatched += 1;
          }
        }
        return { ...prev, clients: nextClients };
      });
      setImportBanner(
        `Base Dates d’Échéance synchronisée : ${matched} contrat${matched > 1 ? 's' : ''} mis à jour${
          unmatched > 0 ? ` (${unmatched} ligne(s) sans correspondance)` : ''
        }.`
      );
    }
    setImportPayload(null);
  };

  const handleAddSale = (newSale) => {
    setState((prev) => ({
      ...prev,
      sales: [newSale, ...prev.sales],
    }));
  };

  const handleDeleteSale = (saleId) => {
    setState((prev) => ({
      ...prev,
      sales: prev.sales.filter((s) => s.id !== saleId),
    }));
  };

  const handleSendEmails = (newEmails) => {
    setState((prev) => ({
      ...prev,
      emails: [...newEmails, ...prev.emails],
    }));
  };

  const handleQuickEmailClient = (client, templateId) => {
    setPreselectedEmailDraft({ client, templateId });
    setActiveTab('prospection');
  };

  const handleResetDemo = () => {
    const fresh = resetCRMState();
    setState(fresh);
    setImportBanner('Données de démonstration réinitialisées.');
  };

  return html`
    <div className="min-h-screen bg-slate-50 flex">
      <${Sidebar}
        activeTab=${activeTab}
        onSelectTab=${setActiveTab}
        pendingRenewalsCount=${pendingRenewalsCount}
        urgentRenewalsCount=${urgentRenewalsCount}
        unreadEmailsCount=${unreadEmailsCount}
        managerName=${state.settings.managerName}
        managerRole=${state.settings.managerRole}
        isOpenMobile=${mobileMenuOpen}
        onCloseMobile=${() => setMobileMenuOpen(false)}
        onResetDemo=${handleResetDemo}
      />

      <!-- Contenu principal -->
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <!-- Barre supérieure mobile / tablette -->
        <header className="no-print lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick=${() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-brand-600 text-white"
              aria-label="Ouvrir le menu"
            >
              <${Icon} name="Menu" size=${18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-brand-600 text-white font-black text-xs lowercase tracking-tight">ooredoo</span>
              <span className="font-extrabold text-slate-900 text-sm">Business CRM</span>
            </div>
          </div>
          ${pendingRenewalsCount > 0 &&
          html`
            <button
              type="button"
              onClick=${() => setActiveTab('dashboard')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold tabular-nums"
            >
              <${Icon} name="BellRing" size=${13} />
              <span>${pendingRenewalsCount}</span>
            </button>
          `}
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          ${activeTab === 'dashboard' &&
          html`
            <${DashboardView}
              clients=${state.clients}
              sales=${state.sales}
              settings=${state.settings}
              onChangeAlertThreshold=${handleChangeAlertThreshold}
              onUpdateRenewalStatus=${handleUpdateRenewalStatus}
              onOpenClientModal=${(client) => {
                setIsCreatingClient(false);
                setModalClient(client);
              }}
              onQuickEmailClient=${handleQuickEmailClient}
              onNavigate=${setActiveTab}
            />
          `}

          ${activeTab === 'portfolio' &&
          html`
            <${PortfolioView}
              clients=${state.clients}
              onSelectClient=${(client) => {
                setIsCreatingClient(false);
                setModalClient(client);
              }}
              onCreateClient=${() => {
                setIsCreatingClient(true);
                setModalClient(null);
              }}
              onOpenImportModal=${setImportPayload}
              importBanner=${importBanner}
              onClearImportBanner=${() => setImportBanner('')}
            />
          `}

          ${activeTab === 'sales' &&
          html`
            <${SalesView}
              clients=${state.clients}
              sales=${state.sales}
              settings=${state.settings}
              onAddSale=${handleAddSale}
              onDeleteSale=${handleDeleteSale}
              onUpdateTarget=${handleUpdateTarget}
            />
          `}

          ${activeTab === 'prospection' &&
          html`
            <${ProspectionView}
              clients=${state.clients}
              emails=${state.emails}
              preselectedDraft=${preselectedEmailDraft}
              onClearPreselectedDraft=${() => setPreselectedEmailDraft(null)}
              onSendEmails=${handleSendEmails}
            />
          `}
        </main>
      </div>

      ${(modalClient || isCreatingClient) &&
      html`
        <${ClientDetailModal}
          client=${modalClient}
          isNew=${isCreatingClient}
          sales=${state.sales}
          emails=${state.emails}
          onClose=${() => {
            setModalClient(null);
            setIsCreatingClient(false);
          }}
          onSaveClient=${handleSaveClient}
          onDeleteClient=${handleDeleteClient}
          onQuickEmailClient=${handleQuickEmailClient}
        />
      `}

      ${importPayload &&
      html`
        <${ImportMappingModal}
          importPayload=${importPayload}
          onClose=${() => setImportPayload(null)}
          onConfirmImport=${handleConfirmImport}
        />
      `}
    </div>
  `;
}

