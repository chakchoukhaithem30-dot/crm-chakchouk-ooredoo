import { createInitialSeedData } from '../data/seedData.js';

const STORAGE_KEY = 'telcopro_b2b_crm_v1';

export function loadCRMState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createInitialSeedData();
      saveCRMState(seed);
      return seed;
    }
    const parsed = JSON.parse(raw);
    const fallback = createInitialSeedData();
    return {
      clients: Array.isArray(parsed.clients) ? parsed.clients : fallback.clients,
      sales: Array.isArray(parsed.sales) ? parsed.sales : fallback.sales,
      emails: Array.isArray(parsed.emails) ? parsed.emails : fallback.emails,
      settings: { ...fallback.settings, ...(parsed.settings || {}) },
    };
  } catch (e) {
    console.warn('Erreur lecture localStorage, chargement des données initiales:', e);
    return createInitialSeedData();
  }
}

export function saveCRMState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Erreur sauvegarde localStorage:', e);
  }
}

export function resetCRMState() {
  const seed = createInitialSeedData();
  saveCRMState(seed);
  return seed;
}

