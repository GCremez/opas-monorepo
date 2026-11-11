# getopas.app web files

Files the website at `https://getopas.app` must serve so that links in Opas emails
(`https://getopas.app/d/<id>`) open the app instead of the browser.

GitHub Pages publishes the `docs/` folder on `main`, so the published copies live in
`docs/.well-known/` (the `.nojekyll` file in `docs/` is what allows a dot-folder to be
served at all). The files here are the blank templates.

| File | Served at | Replace before deploying |
|---|---|---|
| `.well-known/apple-app-site-association` | `https://getopas.app/.well-known/apple-app-site-association` | `APPLE_TEAM_ID`: your 10-character Team ID (Apple Developer → Membership) |
| `.well-known/assetlinks.json` | `https://getopas.app/.well-known/assetlinks.json` | `PLAY_APP_SIGNING_SHA256_FINGERPRINT`: Play Console → Test and release → App integrity → App signing key certificate (SHA-256) |

Both must be served over HTTPS with `Content-Type: application/json`, with no redirect.
The Apple file has no file extension on purpose.

**Do not edit `docs/.well-known/` by hand.** Fill both in with:

```sh
python3 scripts/wellknown.py --apple-team-id ABCDE12345 --android-sha256 AA:BB:...:00
python3 scripts/wellknown.py --check   # exit 1 while a placeholder is left
```

Both IDs need a paid developer account, so until Apple and Play are set up the files
still contain placeholders and a tapped email link falls back to `/d/<id>`, which the
404 page turns into an "Open in Opas" screen.

The site also needs these pages, because the backend and app link to them:

- `/privacy/`: privacy policy (required by both app stores)
- `/support/`: help and contact
- `/subscription/success/` and `/subscription/cancel/`: where Stripe Checkout returns people
- `/d/<id>`: fallback for people without the app installed (rendered by `docs/404.html`)
