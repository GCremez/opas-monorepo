/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'OpasWidget',
  deploymentTarget: '17.0',
  // Shared with the app: it writes the next deadline here, the widget reads it.
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
