// Dynamic Expo config. The API base URL is chosen per environment from an env var
// instead of a hardcoded address baked into the bundle, and App Transport Security is
// enforced so a release build cannot talk to the API over cleartext HTTP — only
// localhost is exempted, for local development.
const base = require('./app.json').expo;

// Production/staging builds MUST set EXPO_PUBLIC_API_URL to an https:// endpoint.
// The default is a localhost dev URL, never a shipped value.
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

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
        NSAllowsArbitraryLoads: false,
        NSExceptionDomains: {
          localhost: {
            NSExceptionAllowsInsecureHTTPLoads: true,
            NSIncludesSubdomains: true,
          },
        },
      },
    },
  },
});
