// Public pages the app links to. They live in the repo's docs/ folder, served by GitHub
// Pages at getopas.app, so they work without the app (Google requires the deletion page to).
const WEB = 'https://getopas.app';

export const LINKS = {
  privacy: `${WEB}/privacy/`,
  terms: `${WEB}/terms/`,
  deleteAccount: `${WEB}/delete-account/`,
  support: `${WEB}/support/`,
};

// Opas is independent; these are the authorities' own sites, linked wherever we say so.
export const OFFICIAL_SITES = [
  { name: 'Kela', url: 'https://www.kela.fi' },
  { name: 'Vero', url: 'https://www.vero.fi' },
  { name: 'Migri', url: 'https://migri.fi' },
];
