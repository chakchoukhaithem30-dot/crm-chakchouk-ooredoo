import { html } from '../utils/html.js';
import { Icon } from './Icons.js';

export function Sidebar({
  activeTab,
  onSelectTab,
  pendingRenewalsCount,
  urgentRenewalsCount,
  unreadEmailsCount,
  managerName,
  managerRole,
  isOpenMobile,
  onCloseMobile,
  onResetDemo,
}) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Tableau de Bord',
      icon: 'LayoutDashboard',
      badge: urgentRenewalsCount > 0 ? `${urgentRenewalsCount} urgent${urgentRenewalsCount > 1 ? 's' : ''}` : null,
      badgeTone: 'urgent',
    },
    {
      id: 'portfolio',
      label: 'Portefeuille Clients',
      icon: 'Building2',
      badge: pendingRenewalsCount > 0 ? String(pendingRenewalsCount) : null,
      badgeTone: 'neutral',
    },
    {
      id: 'sales',
      label: 'Mes Réalisations',
      icon: 'TrendingUp',
      badge: null,
    },
    {
      id: 'prospection',
      label: 'Prospection & Emails',
      icon: 'Mail',
      badge: unreadEmailsCount > 0 ? String(unreadEmailsCount) : null,
      badgeTone: 'neutral',
    },
  ];

  const handleNav = (id) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return html`
    <div>
      ${isOpenMobile &&
      html`<div
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        onClick=${onCloseMobile}
      ></div>`}

      <aside
        className=${`no-print fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-brand-600 via-brand-600 to-brand-800 text-white flex flex-col shadow-2xl transition-transform duration-200 ease-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <!-- En-tête Marque Opérateur -->
        <div className="px-6 py-5 border-b border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-brand-600 flex items-center justify-center shadow-md">
              <${Icon} name="Radio" size=${22} strokeWidth=${2.4} />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight leading-none">TelcoPro B2B</div>
              <div className="text-[11px] font-medium text-white/80 uppercase tracking-wider mt-1">
                Grands Comptes
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick=${onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/15 text-white"
            aria-label="Fermer le menu"
          >
            <${Icon} name="X" size=${20} />
          </button>
        </div>

        <!-- Navigation -->
        <nav className="flex-1 px-3.5 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/65">
            Pilotage Commercial
          </div>
          ${navItems.map((item) => {
            const isActive = activeTab === item.id;
            return html`
              <button
                key=${item.id}
                type="button"
                onClick=${() => handleNav(item.id)}
                className=${`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-brand-600 shadow-lg shadow-brand-900/20'
                    : 'text-white/90 hover:bg-white/12 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <${Icon}
                    name=${item.icon}
                    size=${19}
                    className=${isActive ? 'text-brand-600' : 'text-white/85'}
                  />
                  <span>${item.label}</span>
                </span>
                ${item.badge &&
                html`<span
                  className=${`px-2 py-0.5 text-[11px] font-bold rounded-full tabular-nums ${
                    isActive
                      ? item.badgeTone === 'urgent'
                        ? 'bg-brand-600 text-white'
                        : 'bg-brand-50 text-brand-700 border border-brand-200'
                      : item.badgeTone === 'urgent'
                        ? 'bg-white text-brand-600 animate-pulse'
                        : 'bg-white/20 text-white'
                  }`}
                >
                  ${item.badge}
                </span>`}
              </button>
            `;
          })}
        </nav>

        <!-- Alerte rapide échéances dans la sidebar -->
        ${pendingRenewalsCount > 0 &&
        html`
          <div className="mx-3.5 mb-4 p-3.5 rounded-xl bg-white/12 border border-white/20 backdrop-blur-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white">
              <${Icon} name="BellRing" size=${15} />
              <span>Alerte Contrats</span>
            </div>
            <p className="text-xs text-white/90 mt-1.5 leading-relaxed">
              <strong className="tabular-nums">${pendingRenewalsCount}</strong> contrat${pendingRenewalsCount > 1 ? 's' : ''} à renouveler dans votre fenêtre d’alerte.
            </p>
            <button
              type="button"
              onClick=${() => handleNav('dashboard')}
              className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-white text-brand-700 hover:bg-brand-50 text-xs font-bold transition-colors"
            >
              Voir les échéances
            </button>
          </div>
        `}

        <!-- Profil Chargé de Grands Comptes -->
        <div className="p-4 border-t border-white/15 bg-brand-900/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-sm font-bold">
              ${(managerName || 'HC')
                .split(' ')
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">${managerName}</div>
              <div className="text-[11px] text-white/75 truncate">${managerRole}</div>
            </div>
            <button
              type="button"
              onClick=${onResetDemo}
              title="Réinitialiser les données de démonstration"
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
            >
              <${Icon} name="RotateCcw" size=${15} />
            </button>
          </div>
        </div>
      </aside>
    </div>
  `;
}

