#!/usr/bin/env python3
"""Builds the Google Play graphics from what the app and the website already have.

    python3 store/play/graphics/build.py

Outputs, all committed so a release does not depend on this script running:

    icon-512.png          512 x 512, no transparency
    feature-graphic.png   1024 x 500, no transparency
    phone-01.png ...      1080 x 1920, eight screens

Dependencies: macOS `sips` for the icon resize, and Playwright + Chromium for the
composed images. Playwright is already used by the audit scripts; if it is not
installed globally, install it with `npm i -g playwright && npx playwright
install chromium`. This is a local prep step, not part of CI.

The phone screens share `docs/screenshots/` with the website. Re-capture those
from a current build before uploading; this script only pads and frames them.
"""

from __future__ import annotations

import html
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
SHOTS = ROOT / "docs" / "screenshots"
ICON = ROOT / "opas-mobile" / "assets" / "icon.png"

PAPER = "#f2ede2"
INK = "#211e16"
PINE = "#35503f"
OCHRE = "#916219"
MUTED = "#4c473c"

# (source file, eyebrow, caption, sub-caption)
PHONE_PAGES = [
    ("home.png", "One place", "Every letter, together.", "Filed by sender, searchable, out of the drawer."),
    ("scan.png", "Scan", "Photograph the letter.", "Paper, a photo or a PDF. Opas reads it."),
    ("scan-result.png", "Understand", "Know what it says.", "A plain-language explanation, not a wall of official text."),
    ("document-dates.png", "Dates", "Never miss a deadline.", "Every date pulled out, with a reminder before it passes."),
    ("draft-reply.png", "Reply", "Answer in Finnish.", "A draft you can check, edit and send."),
    ("folders.png", "Keep", "Everything filed.", "Kela, Vero, Migri: find last spring's letter in seconds."),
    ("search.png", "Search", "Ask the archive.", "Search letters and explanations in your own words."),
    ("alerts.png", "Remind", "Before it's too late.", "A quiet nudge a few days before the date."),
]


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    result = subprocess.run(cmd, capture_output=True, text=True, **kwargs)
    if result.returncode != 0:
        sys.exit(f"{' '.join(cmd)}\n{result.stdout}\n{result.stderr}")
    return result


def size(path: Path) -> tuple[int, int]:
    out = run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)]).stdout
    values = {}
    for line in out.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            values[key.strip()] = value.strip()
    return int(values["pixelWidth"]), int(values["pixelHeight"])


def file_uri(path: Path) -> str:
    return "file://" + quote(str(path))


def render(html_text: str, out: Path, width: int, height: int, work: Path) -> None:
    page = work / f"{out.stem}.html"
    page.write_text(html_text, encoding="utf-8")
    node = shutil.which("node")
    if not node:
        sys.exit("node not found: install Node.js and Playwright")
    env = {"NODE_PATH": run(["npm", "root", "-g"]).stdout.strip()}
    run([node, str(HERE / "render.mjs"), str(page), str(out), str(width), str(height)], env=env)
    print(f"wrote {out.relative_to(ROOT)} ({width}x{height})")


def phone_html(src: Path, eyebrow: str, caption: str, sub: str) -> str:
    w, h = size(src)
    frame_h = 1432
    frame_w = round(frame_h * w / h)
    return f"""<!doctype html>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; }}
  body {{
    background: {PAPER};
    color: {INK};
    font-family: 'Instrument Sans', -apple-system, 'Helvetica Neue', Arial, sans-serif;
    display: flex; flex-direction: column; align-items: center;
    padding: 104px 72px 0;
    position: relative;
  }}
  body::before {{
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(900px 500px at 50% -8%, rgba(53,80,63,.10), transparent 70%),
      radial-gradient(700px 420px at 105% 108%, rgba(145,98,25,.08), transparent 70%);
  }}
  header {{ position: relative; text-align: center; width: 100%; }}
  .eyebrow {{
    margin: 0; color: {PINE}; font-size: 24px; font-weight: 600;
    letter-spacing: .20em; text-transform: uppercase;
  }}
  h1 {{
    margin: 16px 0 0; font-family: 'Newsreader', Georgia, 'Times New Roman', serif;
    font-size: 78px; line-height: 1.0; font-weight: 500; letter-spacing: -.025em;
  }}
  .sub {{
    margin: 18px auto 0; max-width: 760px; color: {MUTED};
    font-size: 28px; line-height: 1.35;
  }}
  .phone {{
    position: relative; margin-top: 52px;
    width: {frame_w}px; height: {frame_h}px;
    border-radius: 54px; padding: 12px; background: {INK};
    box-shadow: 0 46px 90px rgba(33,30,22,.28), 0 8px 22px rgba(33,30,22,.20);
  }}
  .phone img {{
    display: block; width: 100%; height: 100%;
    border-radius: 42px; object-fit: cover;
  }}
  .mark {{
    margin-top: 30px; color: {MUTED}; font-size: 24px; letter-spacing: .02em;
  }}
  .mark strong {{ color: {PINE}; font-weight: 600; }}
</style>
<header>
  <p class="eyebrow">{html.escape(eyebrow)}</p>
  <h1>{html.escape(caption)}</h1>
  <p class="sub">{html.escape(sub)}</p>
</header>
<div class="phone"><img src="{file_uri(src)}" alt=""></div>
<p class="mark"><strong>Opas</strong> · getopas.app</p>
"""


def feature_html() -> str:
    w, h = size(SHOTS / "home.png")
    frame_h = 420
    frame_w = round(frame_h * w / h)
    return f"""<!doctype html>
<meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; width: 1024px; height: 500px; overflow: hidden; }}
  body {{
    background: linear-gradient(118deg, {PAPER} 0%, {PAPER} 52%, #e9e1d1 100%);
    color: {INK}; font-family: 'Instrument Sans', -apple-system, 'Helvetica Neue', Arial, sans-serif;
    display: grid; grid-template-columns: 1fr 300px; gap: 24px;
    padding: 46px 54px; position: relative;
  }}
  body::before {{
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(520px 300px at 8% 100%, rgba(53,80,63,.12), transparent 70%);
  }}
  .copy {{ position: relative; align-self: center; }}
  .brand {{ display: flex; align-items: center; gap: 16px; }}
  .brand img {{ width: 64px; height: 64px; border-radius: 16px; }}
  .brand b {{
    font-family: 'Newsreader', Georgia, serif; font-size: 40px; font-weight: 500; letter-spacing: -.02em;
  }}
  h1 {{
    margin: 24px 0 0; font-family: 'Newsreader', Georgia, 'Times New Roman', serif;
    font-size: 54px; line-height: 1.02; font-weight: 500; letter-spacing: -.025em; max-width: 650px;
  }}
  p {{ margin: 16px 0 0; color: {MUTED}; font-size: 21px; line-height: 1.35; max-width: 620px; }}
  .senders {{ margin-top: 20px; color: {PINE}; font-size: 16px; font-weight: 600; letter-spacing: .08em; }}
  .phone {{
    position: relative; align-self: center; justify-self: end;
    width: {frame_w}px; height: {frame_h}px; border-radius: 30px; padding: 7px;
    background: {INK}; box-shadow: 0 26px 50px rgba(33,30,22,.26);
    transform: rotate(-3deg);
  }}
  .phone img {{ display: block; width: 100%; height: 100%; border-radius: 24px; object-fit: cover; }}
</style>
<div class="copy">
  <div class="brand">
    <img src="{file_uri(ICON)}" alt="">
    <b>Opas</b>
  </div>
  <h1>Every Finnish letter, in a language you actually read.</h1>
  <p>Scan a letter. See what it says, what to do, and by when.</p>
  <div class="senders">KELA · VERO · MIGRI · DVV · TE-PALVELUT</div>
</div>
<div class="phone"><img src="{file_uri(SHOTS / 'home.png')}" alt=""></div>
"""


def main() -> None:
    if not shutil.which("sips"):
        sys.exit("sips not found: this script expects macOS")
    for path in (SHOTS, ICON):
        if not path.exists():
            sys.exit(f"missing {path}")

    HERE.mkdir(parents=True, exist_ok=True)

    # Play requires a 512x512 32-bit PNG with no alpha. The source icon is
    # already opaque, so a plain resize keeps it within the rule.
    icon_out = HERE / "icon-512.png"
    run(["sips", "-z", "512", "512", str(ICON), "--out", str(icon_out)])
    alpha = run(["sips", "-g", "hasAlpha", str(icon_out)]).stdout
    if "hasAlpha: yes" in alpha:
        sys.exit("icon-512.png has an alpha channel; flatten it before upload")
    print(f"wrote {icon_out.relative_to(ROOT)} (512x512)")

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        render(feature_html(), HERE / "feature-graphic.png", 1024, 500, work)

        for index, (name, eyebrow, caption, sub) in enumerate(PHONE_PAGES, start=1):
            src = SHOTS / name
            if not src.exists():
                sys.exit(f"missing screenshot {src}; re-capture docs/screenshots/")
            out = HERE / f"phone-{index:02d}.png"
            render(phone_html(src, eyebrow, caption, sub), out, 1080, 1920, work)

    print(f"\n{len(PHONE_PAGES)} screens + icon + feature graphic in {HERE.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
