# Release checklist

The order matters: the Play Console account starts the clock, and Bedrock is the
only thing that makes the app useful. Nothing here can be done until the $25 Play
Console account exists.

## 0. Before paying: decide the account type

| | Personal account | Organization account (Salau Distributions) |
|---|---|---|
| Cost | $25 once | $25 once |
| D-U-N-S number | Not needed | **Required**, free from Dun & Bradstreet, up to 30 days |
| New-account testing | Closed test, **12 testers opted in for 14 continuous days** | Not required |
| Device verification | Verify an Android device | Not required |
| Name on Play | Your legal name and address | Organization name, address and phone |

Check whether Salau Distributions already has a D-U-N-S number at
<https://service.dnb.com> before choosing. If it does, the organization account
is strictly better. If it does not, the personal account plus a closed test
started this week beats waiting a month.

**This is the urgent purchase.** Apple's $99/year can wait: the Android-first
plan does not need it, and TestFlight only matters once an iPhone build exists.

## 1. Unblock the product (AWS, not Play)

- [ ] Bedrock model access in `eu-north-1` for the models in
  `docs/launch-plan.md` P0-3. Today every Anthropic model returns "not available
  for this account". If the AWS account is on the Free plan, upgrade it to Paid
  and request model access again.
- [ ] `POST /decode` returns a real explanation on a test letter. Do not spend
  the 14-day test clock on a build whose core action fails.
- [ ] `https://api.getopas.app/actuator/health` → `UP`.

## 2. Build the first Android App Bundle

```bash
cd opas-mobile
npm ci
npx expo-doctor
npx jest --ci
```

`npx tsc --noEmit` currently fails in four untouched files on
`TextInputInstance` / `ScrollViewInstance` (React Native 0.88 removed those
types). That is a pre-existing typing problem, not a build blocker; do not let it
hide a new error in the files below.

- [ ] Bump `expo.android.versionCode` in `app.json` for every upload. Play
  rejects a duplicate code.
- [ ] Confirm `app.json` still blocks `RECORD_AUDIO`,
  `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM` and `SYSTEM_ALERT_WINDOW`.
- [ ] Check whether `READ_MEDIA_IMAGES` is still needed. The Android photo
  picker (`ImagePicker.launchImageLibraryAsync`) does not need broad library
  access on Android 13+. If the build works without it, remove it from
  `app.json`; otherwise Play asks for the **Photo and video permissions**
  declaration and may reject the broad request.
- [ ] `npx eas-cli@latest build --platform android --profile production`
- [ ] Keep the upload keystore. `eas credentials` shows where it is; losing it
  means a new upload key and a Play support request. With Play App Signing,
  Google holds the app signing key and EAS holds the upload key.
- [ ] Download the `.aab`, not an `.apk`, for Play.

## 3. Create the app in Play Console

- [ ] App name: `Opas` (or the localized name from `listing.md`).
- [ ] Default language: English (United States) or Finnish. The listing has all
  three.
- [ ] App or game: **App**. Free or paid: **Free**.
- [ ] Accept the developer programme policies and the US export declaration.
- [ ] Package name is fixed at `app.getopas`; it cannot be changed after the
  first upload.
- [ ] Enable **Play App Signing** (the default). Do not opt out.
- [ ] Upload the first `.aab` to **Internal testing**, not production. Internal
  testing allows up to 100 testers with no 14-day clock and is the fastest way
  to catch a crash on a real device.

## 4. App content forms

All under **Policy → App content**. The answers are written out in the two
companion files.

- [ ] **Privacy policy:** `https://getopas.app/privacy/`
- [ ] **App access:** all features require login. Create a verified demo account
  (`demo@getopas.app` or similar), confirm it can scan a letter, and enter the
  credentials. Reviewers will not read a verification code from a server log.
- [ ] **Ads:** No.
- [ ] **Content rating:** questionnaire in `content-rating.md` → PEGI 3 /
  Everyone.
- [ ] **Target audience:** 18+, or 13+ if a band is required. Never under 13.
- [ ] **News app:** No.
- [ ] **COVID-19 apps:** No.
- [ ] **Data safety:** `data-safety.md`.
- [ ] **Government app:** No. Keep the independence disclaimer in the listing.
- [ ] **Financial features:** No.
- [ ] **Health apps:** No. Opas is a document utility, not a medical or fitness
  app, even though a letter can contain health information.
- [ ] **AI-generated content:** Yes. The explanations come from Claude. This
  triggers the reporting requirement described in §7.

## 5. Store listing

- [ ] Paste the title, short description and full description from `listing.md`
  for English, Finnish and Swedish.
- [ ] Upload the graphics from `graphics/` (regenerate with
  `python3 store/play/graphics/build.py`).
- [ ] **Re-capture screenshots from the current build.** `docs/screenshots/` is
  shared with the website and can lag the app. The build script pads them to
  1080×1920 but cannot fix a stale screen.
- [ ] Contact email `hello@getopas.app`, website `https://getopas.app/`.
- [ ] Countries: Finland first. Add Sweden, Estonia and the rest of the EEA once
  the first release is stable; the letters are Finnish, but people move.
- [ ] Do not promise Premium, a subscription or a price in the listing. Billing
  is off on Android (`CAN_PURCHASE`).

## 6. Closed testing (personal accounts: the 14-day clock)

Do this the day the account is verified, even if the build is still rough.

- [ ] Create a **Closed testing** track and upload the `.aab`.
- [ ] Add testers by email list or Google Group. A Google Group is easier to
  keep at 12+ than 12 separate addresses.
- [ ] Send testers the opt-in URL. **They must accept the invite and install from
  Play.** Sideloading does not count.
- [ ] Recruit 15, not 12. One dropout resets the count for that person, and the
  requirement is 12 *continuously opted in for 14 days*.
- [ ] Keep the track and the build available for the whole 14 days. Ending the
  test or removing the build pauses the clock.
- [ ] Ask testers to use it on a real letter, and to leave the app installed.
- [ ] Collect feedback in one place. The production-access form asks what the
  test taught you and what you changed.

Organization accounts can skip the 14-day wait but should still run a closed
test; it is the cheapest crash test available.

## 7. Production access (personal accounts only)

- [ ] **My app is ready for production** in the Closed testing track.
- [ ] Answer the questionnaire honestly: who tested, for how long, what they
  did, what broke, what changed. "12 friends installed it" is a weak answer;
  "15 testers scanned 60 real letters over 14 days, fixed the Android 13 photo
  permission crash and the empty-archive state" is a strong one.
- [ ] Expect a decision in a few days. A rejection is usually about the test
  being too small or too short; fix and reapply.

## 8. Production review blockers

Fix these before the production rollout, not before closed testing:

- [ ] **Report offensive AI output.** Play's AI-Generated Content policy
  requires an in-app control. The planned "Something's wrong" button (P1-5)
  does not exist. Add at least a mailto/report sheet that sends the document ID
  and a reason, with no letter text, and record it server-side.
- [ ] **Demo account still valid.** It must survive the review window.
- [ ] **No dead ends.** Every screen reachable without a letter, without a
  network and with an expired session has a way back. The 404/letter page and
  the empty states are already covered.
- [ ] **Account deletion works end to end.** Play checks the in-app path and the
  web page. Delete a test account and confirm the letters, push token and
  analytics identity are gone.

## 9. After approval

- [ ] Copy the **Play App Signing SHA-256** from Play Console → Test and release
  → Setup → App integrity → App signing key certificate.
- [ ] Fill the app-link files and publish:

  ```bash
  python3 scripts/wellknown.py --android-sha256 AA:BB:CC:...
  python3 scripts/wellknown.py --check
  ```

  Commit and push `docs/.well-known/assetlinks.json`. Pages serves it from
  `main`; the repo's deploy is the release.
- [ ] Verify Google's view of the link:

  ```bash
  curl -s 'https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://getopas.app&relation=delegate_permission/common.handle_all_urls'
  ```

- [ ] On a device with the Play build installed:

  ```bash
  adb shell am start -a android.intent.action.VIEW -d "https://getopas.app/d/<document-id>"
  ```

  It must open Opas, not Chrome. If it opens Chrome, the SHA-256 or the package
  name is wrong, or the page was cached; wait a few minutes and reinstall.
- [ ] Update `docs/launch-plan.md`: tick the store item, record the account
  type, the date the closed test started, and the SHA-256 step.
- [ ] **Staged rollout:** 10% → 50% → 100%, with at least a day at each step.
  Watch Android vitals: crash-free sessions, ANRs, and the review rating.

## 10. Rollback

- [ ] Keep the previous `.aab` and its `versionCode`. Play cannot upload a lower
  code, so a rollback is a new build with a higher code and the old code, not a
  re-upload.
- [ ] Halt the staged rollout first; it stops new installs within minutes.
- [ ] If the backend is the cause, `opas-infra/server/auto-update.sh` deploys
  `main` every five minutes. Revert the commit on `main`; do not edit the server
  by hand, or the next pull overwrites it.
