import { toISODate } from './formatters.js';

export const CLIENT_FIELD_DEFS = [
  { key: 'companyName', label: 'Raison Sociale / Entreprise', required: true, aliases: ['entreprise', 'raison sociale', 'societe', 'company', 'client', 'nom entreprise', 'compte'] },
  { key: 'decisionMaker', label: 'Décideur / Vis-à-vis', required: false, aliases: ['vis-a-vis', 'vis a vis', 'decideur', 'contact', 'interlocuteur', 'responsable'] },
  { key: 'email', label: 'Adresse Email', required: false, aliases: ['email', 'mail', 'courriel', 'e-mail'] },
  { key: 'phone', label: 'Téléphone', required: false, aliases: ['telephone', 'tel', 'tél', 'mobile', 'phone', 'gsm'] },
  { key: 'category', label: 'Catégorie', required: false, aliases: ['categorie', 'catégorie', 'tier', 'segment'] },
  { key: 'size', label: 'Taille', required: false, aliases: ['taille', 'size', 'effectif'] },
  { key: 'sector', label: 'Secteur', required: false, aliases: ['secteur', 'sector', 'activite', 'industrie'] },
  { key: 'services', label: 'Services Actifs', required: false, aliases: ['services', 'service', 'offres', 'produits'] },
  { key: 'mrc', label: 'MRC (DT/mois)', required: false, aliases: ['mrc', 'revenu', 'montant', 'mensuel', 'ca'] },
  { key: 'city', label: 'Ville / Gouvernorat', required: false, aliases: ['ville', 'city', 'gouvernorat', 'adresse'] },
];

export const RENEWAL_FIELD_DEFS = [
  { key: 'companyName', label: 'Raison Sociale / Entreprise', required: true, aliases: ['entreprise', 'raison sociale', 'societe', 'company', 'client', 'compte'] },
  { key: 'id', label: 'ID Client (optionnel)', required: false, aliases: ['id', 'code client', 'id client', 'ref'] },
  { key: 'renewalDate', label: 'Date d’échéance / Renouvellement', required: true, aliases: ['echeance', 'échéance', 'renouvellement', 'date fin', 'fin contrat', 'expiration', 'renewal'] },
  { key: 'contractStartDate', label: 'Date Anniversaire / Début contrat', required: false, aliases: ['anniversaire', 'debut', 'début', 'signature', 'date debut'] },
  { key: 'renewalStatus', label: 'Statut Renouvellement', required: false, aliases: ['statut', 'status', 'etat'] },
];

function normalizeHeader(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function normalizeExcelCell(val, isDateField = false) {
  if (val === undefined || val === null) return '';
  if (val instanceof Date) {
    return toISODate(val);
  }
  if (isDateField && typeof val === 'number' && window.XLSX?.SSF?.parse_date_code) {
    const parsed = window.XLSX.SSF.parse_date_code(val);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  if (isDateField) {
    const iso = toISODate(String(val));
    return iso || String(val).trim();
  }
  return String(val).trim();
}

export async function parseSpreadsheetFile(file) {
  const XLSX = window.XLSX;
  if (!XLSX) {
    throw new Error('La librairie SheetJS (XLSX) est indisponible.');
  }
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Le fichier ne contient aucune feuille.');
  }
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (!rows.length) {
    throw new Error('Le fichier importé est vide.');
  }
  const headers = Object.keys(rows[0]);
  return { fileName: file.name, headers, rows };
}

export function autoMapHeaders(headers, fieldDefs) {
  const mapping = {};
  const normalizedHeaders = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));

  for (const field of fieldDefs) {
    const match = normalizedHeaders.find((h) =>
      field.aliases.some((alias) => h.norm === normalizeHeader(alias) || h.norm.includes(normalizeHeader(alias)))
    );
    mapping[field.key] = match ? match.raw : '';
  }
  return mapping;
}

export function downloadTemplateXLSX(type) {
  const XLSX = window.XLSX;
  if (!XLSX) return;

  let data = [];
  let filename = '';
  if (type === 'clients') {
    filename = 'Modele_Base_Clients_Telco.xlsx';
    data = [
      {
        'Raison Sociale': 'Tunisie Câbles & Réseaux',
        'Vis-à-vis': 'Walid Ben Salah — DSI',
        'Email': 'w.bensalah@tcr-tunisie.tn',
        'Téléphone': '+216 71 992 100',
        'Catégorie': 'Grand Compte',
        'Taille': 'Grande Entreprise',
        'Secteur': 'Industrie',
        'Services': 'Fibre Optique Dédiée (LS/FO); Flotte Mobile Corporate 5G',
        'MRC': 8200,
        'Ville': 'Tunis',
      },
      {
        'Raison Sociale': 'Assurances El Amen',
        'Vis-à-vis': 'Meriem Chaouch — Directrice Achats',
        'Email': 'm.chaouch@elamen-assur.tn',
        'Téléphone': '+216 71 234 890',
        'Catégorie': 'VIP',
        'Taille': 'Grande Entreprise',
        'Secteur': 'Banque & Finance',
        'Services': 'SD-WAN / MPLS Multi-sites; Trunk SIP / VoIP Entreprise',
        'MRC': 13400,
        'Ville': 'Les Berges du Lac',
      },
    ];
  } else {
    filename = 'Modele_Base_Dates_Echeance.xlsx';
    const d1 = new Date();
    d1.setDate(d1.getDate() + 19);
    const d2 = new Date();
    d2.setDate(d2.getDate() + 38);
    data = [
      {
        'ID Client': 'CLI-1002',
        'Raison Sociale': 'Groupe Poulina Industries',
        'Date Echéance': toISODate(d1),
        'Date Anniversaire': '2023-11-18',
        'Statut': 'À contacter',
      },
      {
        'ID Client': 'CLI-1005',
        'Raison Sociale': 'Hôtels Jasmin & Thalasso',
        'Date Echéance': toISODate(d2),
        'Date Anniversaire': '2024-12-20',
        'Statut': 'Offre envoyée',
      },
    ];
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Données');
  XLSX.writeFile(wb, filename);
}

export function exportRowsToCSV(filename, headers, rows) {
  const escape = (val) => {
    const s = String(val ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };
  const lines = [
    headers.map(escape).join(';'),
    ...rows.map((r) => r.map(escape).join(';')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getDemoImportDataset(type, existingClients = []) {
  if (type === 'clients') {
    const rows = [
      {
        'Raison Sociale': 'Tunisie Valeurs & Capital',
        'Vis-à-vis': 'Rami Ferchichi — Responsable IT',
        'Email': 'r.ferchichi@tunisievaleurs.tn',
        'Téléphone': '+216 71 149 500',
        'Catégorie': 'VIP',
        'Taille': 'ETI',
        'Secteur': 'Banque & Finance',
        'Services': 'Fibre Optique Dédiée (LS/FO); Cloud Souverain & Backup',
        'MRC': 9500,
        'Ville': 'Tunis',
      },
      {
        'Raison Sociale': 'Sotrapil Logistique Sud',
        'Vis-à-vis': 'Faten Boukhris — Directrice Opérations',
        'Email': 'f.boukhris@sotrapil-sud.tn',
        'Téléphone': '+216 74 410 220',
        'Catégorie': 'Grand Compte',
        'Taille': 'Grande Entreprise',
        'Secteur': 'Transport & Logistique',
        'Services': 'IoT / M2M Connectivité; Flotte Mobile Corporate 5G',
        'MRC': 7300,
        'Ville': 'Sfax',
      },
      {
        'Raison Sociale': 'BioTech Méditerranée',
        'Vis-à-vis': 'Sami Haddad — Gérant Technique',
        'Email': 's.haddad@biotech-med.tn',
        'Téléphone': '+216 73 360 880',
        'Catégorie': 'Stratégique',
        'Taille': 'PME',
        'Secteur': 'Santé',
        'Services': 'Trunk SIP / VoIP Entreprise; Fibre Optique Dédiée (LS/FO)',
        'MRC': 4100,
        'Ville': 'Monastir',
      },
    ];
    return {
      fileName: 'Demo_Base_Clients_Tunis_2026.xlsx',
      headers: Object.keys(rows[0]),
      rows,
    };
  }

  const dUrgent = new Date();
  dUrgent.setDate(dUrgent.getDate() + 9);
  const dMid = new Date();
  dMid.setDate(dMid.getDate() + 24);
  const dLater = new Date();
  dLater.setDate(dLater.getDate() + 49);

  const c1 = existingClients[1]?.companyName || 'Groupe Poulina Industries';
  const c2 = existingClients[4]?.companyName || 'Hôtels Jasmin & Thalasso';
  const c3 = existingClients[6]?.companyName || 'Société Méditerranéenne de Câblage';

  const rows = [
    {
      'ID Client': existingClients[1]?.id || 'CLI-1002',
      'Raison Sociale': c1,
      'Date Echéance': toISODate(dUrgent),
      'Date Anniversaire': '2024-11-21',
      'Statut': 'À contacter',
    },
    {
      'ID Client': existingClients[4]?.id || 'CLI-1005',
      'Raison Sociale': c2,
      'Date Echéance': toISODate(dMid),
      'Date Anniversaire': '2023-12-06',
      'Statut': 'Offre envoyée',
    },
    {
      'ID Client': existingClients[6]?.id || 'CLI-1007',
      'Raison Sociale': c3,
      'Date Echéance': toISODate(dLater),
      'Date Anniversaire': '2022-12-30',
      'Statut': 'À contacter',
    },
  ];
  return {
    fileName: 'Demo_Base_Echeances_Contrats.xlsx',
    headers: Object.keys(rows[0]),
    rows,
  };
}

