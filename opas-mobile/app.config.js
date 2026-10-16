// Dynamic Expo config.
// - API base URL: production/staging set EXPO_PUBLIC_API_URL to an https:// endpoint.
//   For local development it falls back to app.json's extra.apiBaseUrl — set that to
//   your Mac's LAN IP (e.g. http://192.168.0.14:8080/api/v1) so a physical phone on the
//   same Wi-Fi can reach the backend. localhost only works for the iOS Simulator.
// - App Transport Security: allow cleartext http to localhost and private LAN
//   addresses for development. Arbitrary public cleartext stays blocked, and production
//   talks https via EXPO_PUBLIC_API_URL.
const base = require('./app.json').expo;

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (base.extra && base.extra.apiBaseUrl) ||
  'http://localhost:8080/api/v1';

module.exports = () => ({
  ...base,
  extra: {
    ...(base.extra || {}),
    apiBaseUrl,
  },
  ios: {
    ...(base.ios || {}),
    infoPlist: {
      ...((base.ios && base.ios.infoPlist) || {}),
      NSAppTransportSecurity: {
        // Permits http to localhost + private LAN addresses (dev). Public cleartext is
        // still blocked; production uses an https EXPO_PUBLIC_API_URL.
        NSAllowsLocalNetworking: true,
      },
    },
  },
});
