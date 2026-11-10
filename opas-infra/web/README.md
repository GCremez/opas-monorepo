# getopas.app web files

Files the website at `https://getopas.app` must serve so that links in Opas emails
(`https://getopas.app/d/<id>`) open the app instead of the browser.

| File | Served at | Replace before deploying |
|---|---|---|
| `.well-known/apple-app-site-association` | `https://getopas.app/.well-known/apple-app-site-association` | `APPLE_TEAM_ID`: your 10-character Team ID (Apple Developer → Membership) |
| `.well-known/assetlinks.json` | `https://getopas.app/.well-known/assetlinks.json` | `PLAY_APP_SIGNING_SHA256_FINGERPRINT`: Play Console → Test and release → App integrity → App signing key certificate (SHA-256) |

Both must be served over HTTPS with `Content-Type: application/json`, with no redirect.
The Apple file has no file extension on purpose.

The site also needs these pages, because the backend and app link to them:

- `/privacy`: privacy policy (required by both app stores)
- `/help`: help and contact
- `/subscription/success` and `/subscription/cancel`: where Stripe Checkout returns people
- `/d/<id>`: fallback for people without the app installed (for example, "Open this link on your phone")
