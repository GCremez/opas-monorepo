# Play Store submission pack

Everything needed to publish Opas on Google Play, written now so that the only
remaining input is the paid Play Console account.

| File | What is in it |
|---|---|
| `listing.md` | App name, short and full description in English, Finnish and Swedish; category, contact details, graphics spec |
| `data-safety.md` | The Data safety form answered against what the app actually does, with the code or policy that justifies each answer |
| `content-rating.md` | IARC questionnaire answers and the rating they produce |
| `release-checklist.md` | Account choice, build steps, closed testing clock, store setup, post-approval steps |
| `graphics/` | Store icon and feature graphic, plus a script that composes phone screenshots from `docs/screenshots/` |

## Read this first: the account type changes the calendar

| | Personal account | Organization account (Salau Distributions) |
|---|---|---|
| Cost | $25 once | $25 once |
| Identity | Legal name and address shown on Play | Organization name, address and phone shown on Play |
| D-U-N-S number | Not needed | **Required.** Free from Dun & Bradstreet, can take up to 30 days |
| New-account testing rule | **Closed test with 12 testers opted in for 14 continuous days** before you can apply for production | Does not apply |
| Device verification | New personal accounts must verify an Android device | Not required |
| Best when | You want to start the closed test today | The company already has a D-U-N-S number |

Check first whether Salau Distributions already has a D-U-N-S number
(<https://service.dnb.com>). Finnish companies often do, because banks and credit
agencies use them. If it has one, the organization account skips both the
D-U-N-S wait and the 14-day tester clock. If it does not, the personal account
plus a closed test started this week is faster than waiting up to 30 days for a
D-U-N-S number.

Either way, the clock only starts when the account exists. That is why the Play
Console purchase is the urgent one, not Apple.

## Order of operations

1. **Anthropic API key and spend limit.** Nothing in the app works until Claude
   answers; see `docs/launch-plan.md` §4. Bedrock is deferred.
2. **Play Console account.** Decide the account type above, pay the $25, finish
   identity verification.
3. **Build the first AAB** with EAS and upload it to a closed test. Do not wait
   for every feature; the 14-day clock (personal account) runs on a real build.
4. **Fill the App content forms** using `data-safety.md` and
   `content-rating.md`, and paste the listing from `listing.md`.
5. **Recruit testers.** Twelve real people, opted in continuously for 14 days.
   Friends, family, colleagues, the early-test mailing list.
6. **Apply for production access** (personal accounts only) with what the closed
   test taught you.
7. **After approval:** copy the Play App Signing SHA-256 into
   `scripts/wellknown.py` so `/d/<id>` links open the app instead of the browser.
8. **Staged rollout:** 10% → 50% → 100%, watching Android vitals and crash-free
   sessions.

## Gaps to close before production (not before closed testing)

These are code or policy items that Play review will look for, and that are not
done yet:

- **In-app reporting of AI output.** Play's AI-Generated Content policy requires
  a way to report offensive AI-generated content without leaving the app. The
  planned "Something's wrong" button (P1-5) is that control; it does not exist
  yet. Closed testing is fine without it, production review is not.
- **Working demo account for reviewers.** The app requires login and email
  verification, so create a verified account with a known password and put the
  credentials in Play Console → App access. Do not rely on the reviewer
  registering and reading a code from the server log.
- **Screenshots from a current build.** `docs/screenshots/` is the source used
  by the website and by `graphics/`, and it can lag the app. Re-capture before
  upload; the composition script makes that a one-command refresh.
- **Billing is off.** The listing must not promise Premium or a subscription
  while `CAN_PURCHASE` is false on Android. The copy in `listing.md` does not.
