#!/usr/bin/env python3
"""Checks the getopas.app pages before GitHub Pages publishes them.

GitHub Pages serves `docs/` on `main` with no build step, so a broken tag, a
missing tag or a dead internal link goes straight to production. This script
is that build step, run by .github/workflows/docs-ci.yml.

    python3 scripts/check_docs.py          # from the repository root

It uses only the standard library: the workflow needs no pip install. The one
thing it does not verify is whether the app-link files hold real IDs yet, since
that waits on the paid Apple and Play accounts; it reports those as warnings.
"""

from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
SITE = "https://getopas.app"

VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}

# HTML allows leaving these open; a browser closes them implicitly. Treating them
# as always-optional keeps the checker strict about div/section/main and quiet
# about the shorthand every page uses.
OPTIONAL_END = {"p", "li", "dt", "dd", "tr", "td", "th", "thead", "tbody", "tfoot", "option"}

# A start tag that implicitly closes the element on top of the stack. Keyed by the
# tag being opened, valued by the open elements it may be closing.
_P_CLOSERS = {
    "address", "article", "aside", "blockquote", "div", "dl", "fieldset", "footer",
    "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "main", "nav", "ol",
    "p", "pre", "section", "table", "ul",
}
AUTO_CLOSE = {tag: {"p"} for tag in _P_CLOSERS}
AUTO_CLOSE.update({
    "li": {"li", "p"},
    "dt": {"dt", "dd", "p"},
    "dd": {"dt", "dd", "p"},
    "tr": {"tr", "td", "th"},
    "td": {"td", "th"},
    "th": {"td", "th"},
    "option": {"option"},
})

REQUIRED_META = ("description", "theme-color")
REQUIRED_OG = ("og:title", "og:description", "og:url", "og:type")

errors: list[str] = []
warnings: list[str] = []


class TagBalance(HTMLParser):
    def __init__(self, rel: str) -> None:
        super().__init__(convert_charrefs=True)
        self.rel = rel
        self.stack: list[tuple[str, int]] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in VOID:
            return
        closes = AUTO_CLOSE.get(tag)
        if closes and self.stack and self.stack[-1][0] in closes:
            self.stack.pop()
        self.stack.append((tag, self.getpos()[0]))

    def handle_startendtag(self, tag: str, attrs) -> None:
        pass

    def handle_endtag(self, tag: str) -> None:
        if tag in VOID:
            return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                # Anything still open above this tag was never closed. Browsers
                # recover, but the markup is wrong, so fail unless HTML allows the
                # omission.
                for open_tag, line in self.stack[i + 1:]:
                    if open_tag not in OPTIONAL_END:
                        errors.append(
                            f"{self.rel}: <{open_tag}> opened at line {line} is closed "
                            f"implicitly by </{tag}> at line {self.getpos()[0]}"
                        )
                del self.stack[i:]
                return
        errors.append(f"{self.rel}: closing </{tag}> at line {self.getpos()[0]} has no opening tag")

    def finish(self) -> None:
        self.close()
        for tag, line in self.stack:
            if tag not in OPTIONAL_END:
                errors.append(f"{self.rel}: <{tag}> opened at line {line} is never closed")


class Collector(HTMLParser):
    """Collects the tags the checks below look at."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.h1 = 0
        self.title = ""
        self.in_title = False
        self.meta: dict[str, str] = {}
        self.canonical: str | None = None
        self.html_lang: str | None = None
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        a = {k: (v or "") for k, v in attrs}
        if tag == "html":
            self.html_lang = a.get("lang")
        elif tag == "h1":
            self.h1 += 1
        elif tag == "title":
            self.in_title = True
        elif tag == "meta":
            if "charset" in a:
                self.meta["charset"] = a["charset"]
            elif a.get("name"):
                self.meta[a["name"]] = a.get("content", "")
            elif a.get("property"):
                self.meta[a["property"]] = a.get("content", "")
        elif tag == "link" and a.get("rel") == "canonical":
            self.canonical = a.get("href")
        if "href" in a:
            self.hrefs.append(a["href"])
        if tag in ("img", "script", "source") and a.get("src"):
            self.hrefs.append(a["src"])

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title += data


def expected_url(rel: str) -> str:
    if rel == "index.html":
        return f"{SITE}/"
    if rel.endswith("/index.html"):
        return f"{SITE}/{rel[:-len('index.html')]}"
    return f"{SITE}/{rel}"


def resolves(path: str) -> bool:
    """Does this site path exist in docs/ the way GitHub Pages would serve it?"""
    clean = path.split("#", 1)[0].split("?", 1)[0]
    if not clean.startswith("/"):
        return True  # relative paths are not used by this site
    if clean.endswith("/"):
        return (DOCS / clean.lstrip("/") / "index.html").exists()
    target = DOCS / clean.lstrip("/")
    return target.exists() or target.with_suffix(".html").exists() or (target / "index.html").exists()


def check_page(path: Path) -> None:
    rel = path.relative_to(DOCS).as_posix()
    text = path.read_text(encoding="utf-8")

    balance = TagBalance(rel)
    balance.feed(text)
    balance.finish()

    c = Collector()
    c.feed(text)

    if not c.html_lang:
        errors.append(f"{rel}: <html> has no lang")
    if not c.title.strip():
        errors.append(f"{rel}: empty <title>")
    if c.h1 != 1:
        errors.append(f"{rel}: expected exactly one <h1>, found {c.h1}")
    for name in REQUIRED_META:
        if not c.meta.get(name):
            errors.append(f"{rel}: missing <meta name=\"{name}\">")
    for prop in REQUIRED_OG:
        if not c.meta.get(prop):
            errors.append(f"{rel}: missing <meta property=\"{prop}\">")
    if c.meta.get("twitter:card") != "summary_large_image":
        errors.append(f"{rel}: missing twitter:card=summary_large_image")
    if "charset" not in c.meta:
        errors.append(f"{rel}: missing <meta charset>")

    if rel == "404.html":
        # Served for every unknown path; its canonical is the home page on purpose.
        pass
    elif not c.canonical:
        errors.append(f"{rel}: missing <link rel=\"canonical\">")
    elif c.canonical != expected_url(rel) and "noindex" not in c.meta.get("robots", ""):
        errors.append(f"{rel}: canonical is {c.canonical}, expected {expected_url(rel)}")

    for href in c.hrefs:
        if href.startswith(("http://", "https://", "mailto:", "tel:", "#", "data:", "opas:")):
            continue
        if not resolves(href):
            errors.append(f"{rel}: link to {href} does not exist in docs/")


def check_sitemap(pages: list[Path]) -> None:
    sitemap = DOCS / "sitemap.xml"
    if not sitemap.exists():
        errors.append("sitemap.xml is missing")
        return
    locs = re.findall(r"<loc>\s*([^<]+?)\s*</loc>", sitemap.read_text(encoding="utf-8"))
    if not locs:
        errors.append("sitemap.xml lists no URLs")
        return

    for loc in locs:
        parsed = urlparse(loc)
        if parsed.netloc != "getopas.app":
            errors.append(f"sitemap.xml: {loc} is not on getopas.app")
            continue
        if not resolves(parsed.path or "/"):
            errors.append(f"sitemap.xml: {loc} does not exist in docs/")

    listed = {urlparse(loc).path or "/" for loc in locs}
    for page in pages:
        rel = page.relative_to(DOCS).as_posix()
        if rel == "404.html" or rel.startswith("subscription/"):
            continue  # the 404 page and checkout returns are noindex
        path = "/" if rel == "index.html" else f"/{rel[:-len('index.html')]}"
        if path not in listed:
            errors.append(f"sitemap.xml is missing {path}")


def check_robots() -> None:
    robots = DOCS / "robots.txt"
    if not robots.exists():
        errors.append("robots.txt is missing")
        return
    text = robots.read_text(encoding="utf-8")
    if "Sitemap: https://getopas.app/sitemap.xml" not in text:
        errors.append("robots.txt does not point at https://getopas.app/sitemap.xml")
    if "Disallow: /d/" not in text:
        errors.append("robots.txt does not disallow /d/ (personal letter links)")


def check_well_known() -> None:
    for name in ("apple-app-site-association", "assetlinks.json"):
        path = DOCS / ".well-known" / name
        if not path.exists():
            errors.append(f".well-known/{name} is missing")
            continue
        try:
            body = path.read_text(encoding="utf-8")
            json.loads(body)
        except json.JSONDecodeError as exc:
            errors.append(f".well-known/{name} is not valid JSON: {exc}")
            continue
        if "APPLE_TEAM_ID" in body or "PLAY_APP_SIGNING_SHA256_FINGERPRINT" in body:
            warnings.append(
                f".well-known/{name} still has placeholders; app links will not verify "
                "until scripts/wellknown.py fills in the store IDs"
            )


def check_static_files() -> None:
    cname = DOCS / "CNAME"
    if not cname.exists() or cname.read_text(encoding="utf-8").strip() != "getopas.app":
        errors.append("docs/CNAME must contain getopas.app")
    if not (DOCS / ".nojekyll").exists():
        errors.append("docs/.nojekyll is missing; dot-folders such as .well-known would 404")
    if not (DOCS / "og-image.png").exists():
        errors.append("docs/og-image.png is missing; og:image would 404")


def main() -> int:
    if not DOCS.is_dir():
        sys.exit("docs/ not found: run this from a full checkout")

    pages = sorted(DOCS.rglob("*.html"))
    if not pages:
        sys.exit("no HTML pages found in docs/")

    for page in pages:
        check_page(page)

    check_sitemap(pages)
    check_robots()
    check_well_known()
    check_static_files()

    for warning in warnings:
        print(f"WARN {warning}")
    for error in errors:
        print(f"FAIL {error}")

    print(f"\nchecked {len(pages)} pages, {len(warnings)} warnings, {len(errors)} errors")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
