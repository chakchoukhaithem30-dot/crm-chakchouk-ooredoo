import { html, useState, useMemo } from '../utils/html.js';
import { Icon } from './Icons.js';
import {
  CLIENT_FIELD_DEFS,
  RENEWAL_FIELD_DEFS,
  autoMapHeaders,
  normalizeExcelCell,
} from '../utils/excelImport.js';

export function ImportMappingModal({ importPayload, onClose, onConfirmImport }) {
  if (!importPayload) return null;

  const { type, fileName, headers, rows, isSimulation } = importPayload;
  const fieldDefs = type === 'clients' ? CLIENT_FIELD_DEFS : RENEWAL_FIELD_DEFS;

  const [mapping, setMapping] = useState(() => autoMapHeaders(headers, fieldDefs));
  const [mergeMode, setMergeMode] = useState('merge'); // 'merge' | 'replace' (pour clients)

  const previewRows = useMemo(() => {
    return rows.slice(0, 3).map((row) => {
      const mapped = {};
      for (const f of fieldDefs) {
        const colName = mapping[f.key];
        const isDate = f.key === 'renewalDate' || f.key === 'contractStartDate';
        mapped[f.key] = colName ? normalizeExcelCell(row[colName], isDate) : '';
      }
      return mapped;
    });
  }, [rows, mapping, fieldDefs]);

  const missingRequired = fieldDefs.filter((f) => f.required && !mapping[f.key]);

  const handleConfirm = () => {
    if (missingRequired.length > 0) return;
    const normalizedRows = rows.map((row) => {
      const out = {};
      for (const f of fieldDefs) {
        const colName = mapping[f.key];
        const isDate = f.key === 'renewalDate' || f.key === 'contractStartDate';
        out[f.key] = colName ? normalizeExcelCell(row[colName], isDate) : '';
      }
      return out;
    });
    onConfirmImport({ type, rows: normalizedRows, mergeMode });
  };

  return html`
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <!-- En-tête -->
        <div className="px-6 py-4 bg-gradient-to-r from-brand-600 to-brand-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <${Icon} name="FileSpreadsheet" size=${20} />
            </div>
            <div>
              <h3 className="text-base font-bold">
                ${type === 'clients' ? 'Import Base Clients' : 'Import Base Dates d’Échéance'}
                ${isSimulation ? ' (Simulation)' : ''}
              </h3>
              <p className="text-xs text-white/85">
                Fichier : <strong>${fileName}</strong> · ${rows.length} ligne${rows.length > 1 ? 's' : ''} détectée${rows.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick=${onClose}
            className="p-1.5 rounded-lg hover:bg-white/15"
          >
            <${Icon} name="X" size=${20} />
          </button>
        </div>

        <!-- Corps -->
        <div className="p-6 overflow-y-auto space-y-5">
          ${type === 'clients' &&
          html`
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Mode d’importation :</span>
              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="mergeMode"
                  checked=${mergeMode === 'merge'}
                  onChange=${() => setMergeMode('merge')}
                  className="accent-brand-600"
                />
                <span>Fusionner / Mettre à jour les clients existants</span>
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="mergeMode"
                  checked=${mergeMode === 'replace'}
                  onChange=${() => setMergeMode('replace')}
                  className="accent-brand-600"
                />
                <span>Remplacer tout le portefeuille</span>
              </label>
            </div>
          `}

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Correspondance des colonnes détectées
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              ${fieldDefs.map((f) => html`
                <div key=${f.key} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ${f.label} ${f.required && html`<span className="text-brand-600">*</span>`}
                  </label>
                  <select
                    value=${mapping[f.key] || ''}
                    onChange=${(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                    className=${`w-full px-3 py-1.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                      f.required && !mapping[f.key] ? 'border-brand-500 bg-brand-50/40' : 'border-slate-300'
                    }`}
                  >
                    <option value="">— Ignorer cette colonne —</option>
                    ${headers.map((h) => html`<option key=${h} value=${h}>${h}</option>`)}
                  </select>
                </div>
              `)}
            </div>
          </div>

          <!-- Aperçu des 3 premières lignes -->
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Aperçu des données mappées (3 premières lignes)
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold">
                  <tr>
                    ${fieldDefs.slice(0, 5).map((f) => html`
                      <th key=${f.key} className="px-3 py-2 whitespace-nowrap">${f.label}</th>
                    `)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  ${previewRows.map((r, i) => html`
                    <tr key=${i} className="bg-white">
                      ${fieldDefs.slice(0, 5).map((f) => html`
                        <td key=${f.key} className="px-3 py-2 text-slate-700 truncate max-w-[180px]">
                          ${r[f.key] || '—'}
                        </td>
                      `)}
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>
          </div>

          ${missingRequired.length > 0 &&
          html`
            <div className="p-3 rounded-xl bg-brand-50 border border-brand-200 text-xs text-brand-700 font-medium flex items-center gap-2">
              <${Icon} name="AlertCircle" size=${16} />
              <span>Veuillez associer les champs obligatoires : ${missingRequired.map((m) => m.label).join(', ')}</span>
            </div>
          `}
        </div>

        <!-- Pied -->
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick=${onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled=${missingRequired.length > 0}
            onClick=${handleConfirm}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm"
          >
            <${Icon} name="Check" size=${16} />
            <span>Importer ${rows.length} ligne${rows.length > 1 ? 's' : ''}</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

