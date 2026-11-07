// Dynamic Expo config.
// - API base URL: production/staging set EXPO_PUBLIC_API_BASE_URL to an https:// endpoint
//   (this is the var eas.json injects per build profile). EXPO_PUBLIC_API_URL is still
//   honored as a legacy fallback. For local development it falls back to app.json's
//   extra.apiBaseUrl — set that to your Mac's LAN IP (e.g. http://192.168.0.14:8080/api/v1)
//   so a physical phone on the same Wi-Fi can reach the backend. localhost only works for
//   the iOS Simulator.
// - App Transport Security: only a build pointed at an http:// backend (local dev) may
//   reach localhost and LAN addresses in cleartext. Store builds talk https, and App
//   Review flags NSAllowsLocalNetworking in a release that has no use for it.

// Expo passes app.json's contents in as `config`; extend it rather than re-reading the file.
module.exports = ({ config: base }) => {
  const apiBaseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    (base.extra && base.extra.apiBaseUrl) ||
    'http://localhost:8080/api/v1';

  const localDev = apiBaseUrl.startsWith('http://');

  return {
  ...base,
  extra: {
    ...(base.extra || {}),
    apiBaseUrl,
  },
  ios: {
    ...(base.ios || {}),
    infoPlist: {
      ...((base.ios && base.ios.infoPlist) || {}),
      ...(localDev ? { NSAppTransportSecurity: { NSAllowsLocalNetworking: true } } : {}),
    },
  },
};
};
