#!/usr/bin/env python3
"""Fill in (or check) the app-link verification files that getopas.app must serve.

Both stores verify that a link on getopas.app belongs to the app before they let a
link open it directly. The files live in two places on purpose:

  opas-infra/web/.well-known/   the source of truth, next to the infra docs
  docs/.well-known/             what GitHub Pages actually publishes

Run this after you have the values from Apple and Google. It copies the infra
templates into docs/ and replaces the placeholders.

    python3 scripts/wellknown.py --apple-team-id ABCDE12345
    python3 scripts/wellknown.py --android-sha256 AA:BB:CC:...

Pass both to do both at once. Use --check (no arguments needed) to see whether the
published files still contain placeholders, for example before a release.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "opas-infra" / "web" / ".well-known"
DST = ROOT / "docs" / ".well-known"

APPLE = "apple-app-site-association"
ANDROID = "assetlinks.json"

APPLE_PLACEHOLDER = "APPLE_TEAM_ID"
ANDROID_PLACEHOLDER = "PLAY_APP_SIGNING_SHA256_FINGERPRINT"

TEAM_ID_RE = re.compile(r"^[A-Z0-9]{10}$")
SHA256_RE = re.compile(r"^([0-9A-F]{2}:){31}[0-9A-F]{2}$")


def read(path: Path) -> str:
    if not path.exists():
        sys.exit(f"missing {path.relative_to(ROOT)}: run from a full checkout")
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)}")


def check() -> int:
    problems = []
    apple = read(DST / APPLE)
    android = read(DST / ANDROID)
    if APPLE_PLACEHOLDER in apple:
        problems.append(f"{APPLE} still has {APPLE_PLACEHOLDER}")
    if ANDROID_PLACEHOLDER in android:
        problems.append(f"{ANDROID} still has {ANDROID_PLACEHOLDER}")

    # The stores parse these as JSON. A stray comma here means verification silently fails.
    for name, text in ((APPLE, apple), (ANDROID, android)):
        try:
            json.loads(text)
        except json.JSONDecodeError as exc:
            problems.append(f"{name} is not valid JSON: {exc}")

    if problems:
        for p in problems:
            print(f"FAIL {p}")
        print("\nApp links will not verify until both placeholders are replaced.")
        return 1
    print("OK both app-link files look like real values")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apple-team-id", help="10-character Apple Developer Team ID")
    parser.add_argument("--android-sha256", help="Play App Signing SHA-256, colon separated")
    parser.add_argument("--check", action="store_true", help="only report whether the published files are real")
    args = parser.parse_args()

    if args.check or not (args.apple_team_id or args.android_sha256):
        return check()

    if args.apple_team_id:
        team = args.apple_team_id.strip().upper()
        if not TEAM_ID_RE.match(team):
            sys.exit("Apple Team ID must be 10 characters, letters and digits only")
        write(DST / APPLE, read(SRC / APPLE).replace(APPLE_PLACEHOLDER, team))

    if args.android_sha256:
        sha = args.android_sha256.strip().upper()
        if not SHA256_RE.match(sha):
            sys.exit("SHA-256 must be 32 colon-separated hex pairs, for example AA:BB:...:00")
        write(DST / ANDROID, read(SRC / ANDROID).replace(ANDROID_PLACEHOLDER, sha))

    return check()


if __name__ == "__main__":
    raise SystemExit(main())
