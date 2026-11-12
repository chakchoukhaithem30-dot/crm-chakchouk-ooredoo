import { html, useState } from '../utils/html.js';
import { Icon } from './Icons.js';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  resetPassword,
  translateAuthError,
} from '../utils/firebaseAuth.js';

export function LoginView() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else if (mode === 'register') {
        await registerWithEmail(fullName, email, password);
      } else {
        await resetPassword(email);
        setInfo('Email de réinitialisation envoyé. Vérifiez votre boîte de réception.');
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return html`
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <!-- En-tête Ooredoo Business -->
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-7 text-white text-center">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white text-brand-600 shadow-md">
            <span className="font-black tracking-tight text-base lowercase leading-none">ooredoo</span>
            <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Business</span>
          </div>
          <h1 className="text-xl font-extrabold mt-4 tracking-tight">CRM Grands Comptes B2B</h1>
          <p className="text-xs text-white/85 mt-1">
            ${mode === 'login'
              ? 'Connectez-vous à votre espace commercial'
              : mode === 'register'
                ? 'Créer votre accès Chargé de Grands Comptes'
                : 'Réinitialiser votre mot de passe'}
          </p>
        </div>

        <div className="p-7 space-y-5">
          ${mode !== 'reset' &&
          html`
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 text-xs font-bold">
              <button
                type="button"
                onClick=${() => { setMode('login'); setError(''); setInfo(''); }}
                className=${`py-2 rounded-lg transition-colors ${mode === 'login' ? 'bg-white text-brand-600 shadow-xs' : 'text-slate-600'}`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick=${() => { setMode('register'); setError(''); setInfo(''); }}
                className=${`py-2 rounded-lg transition-colors ${mode === 'register' ? 'bg-white text-brand-600 shadow-xs' : 'text-slate-600'}`}
              >
                Créer un compte
              </button>
            </div>
          `}

          ${error &&
          html`
            <div className="p-3 rounded-xl bg-brand-50 border border-brand-200 text-xs font-semibold text-brand-700 flex items-center gap-2">
              <${Icon} name="AlertCircle" size=${16} />
              <span>${error}</span>
            </div>
          `}

          ${info &&
          html`
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-center gap-2">
              <${Icon} name="CheckCircle2" size=${16} />
              <span>${info}</span>
            </div>
          `}

          <form onSubmit=${handleSubmit} className="space-y-4">
            ${mode === 'register' &&
            html`
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom & Prénom *</label>
                <input
                  type="text"
                  required
                  value=${fullName}
                  onInput=${(e) => setFullName(e.target.value)}
                  placeholder="Ex: Haithem Chakchouk"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            `}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse Email *</label>
              <input
                type="email"
                required
                value=${email}
                onInput=${(e) => setEmail(e.target.value)}
                placeholder="nom@entreprise.tn"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            ${mode !== 'reset' &&
            html`
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Mot de passe *</label>
                  ${mode === 'login' &&
                  html`
                    <button
                      type="button"
                      onClick=${() => { setMode('reset'); setError(''); setInfo(''); }}
                      className="text-[11px] font-semibold text-brand-600 hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  `}
                </div>
                <input
                  type="password"
                  required
                  minLength="6"
                  value=${password}
                  onInput=${(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            `}

            <button
              type="submit"
              disabled=${loading}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-bold shadow-sm transition-colors"
            >
              ${loading
                ? 'Chargement...'
                : mode === 'login'
                  ? 'Se connecter'
                  : mode === 'register'
                    ? 'Créer mon compte'
                    : 'Envoyer le lien de réinitialisation'}
            </button>
          </form>

          ${mode === 'reset'
            ? html`
                <button
                  type="button"
                  onClick=${() => { setMode('login'); setError(''); setInfo(''); }}
                  className="w-full text-center text-xs font-semibold text-slate-600 hover:text-brand-600"
                >
                  ← Retour à la connexion
                </button>
              `
            : html`
                <div>
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="shrink mx-3 text-[11px] font-semibold uppercase text-slate-400">ou</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>
                  <button
                    type="button"
                    disabled=${loading}
                    onClick=${handleGoogle}
                    className="mt-2 w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 9.6-4.8 9.6-7.3 0-.5-.1-.9-.1-1.3H12z"/>
                    </svg>
                    <span>Continuer avec Google</span>
                  </button>
                </div>
              `}
        </div>
      </div>
    </div>
  `;
}
