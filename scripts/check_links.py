"""Check that every course, video, certification and project link the app shows still opens.

Usage:
    python scripts/check_links.py

Checks the links a student can click: `url` in learning_resources.csv, courses.csv and
certifications.csv, and `guide_url` in projects.csv. A YouTube video or playlist counts as
working only if YouTube's oEmbed still finds it, because the page of a removed video still
answers HTTP 200. Some sites refuse scripts (HTTP 401, 403, 429); those are listed as
"blocked" to open by hand, not counted as broken.

Exits with status 1 and prints each broken link if any link is broken. Needs internet.
"""

import csv
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# (table, id column, link column) for every link the app shows to a student
LINKS = [
    ("learning_resources.csv", "resource_id", "url"),
    ("courses.csv", "course_id", "url"),
    ("certifications.csv", "cert_id", "url"),
    ("projects.csv", "project_id", "guide_url"),
]

BLOCKED = {401, 403, 429}  # the site refuses scripts; a person can usually open it
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36",
           "Accept-Language": "en"}
TIMEOUT = 30


def collect(data_dir: Path = DATA_DIR) -> dict[str, list[str]]:
    """Each link once, with the rows that use it, e.g. {url: ["courses.csv C02"]}."""
    links = {}
    for table, id_col, url_col in LINKS:
        with (data_dir / table).open(encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                if row.get(url_col):
                    links.setdefault(row[url_col], []).append(f"{table} {row[id_col]}")
    return links


def fetch(url: str) -> int:
    """HTTP status of a GET (redirects followed). Many sites refuse HEAD, so this reads one byte."""
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            r.read(1)
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def is_youtube(url: str) -> bool:
    host = urllib.parse.urlparse(url).netloc.lower()
    return host.endswith("youtube.com") or host == "youtu.be"


def check(url: str, get=fetch) -> tuple[str, str]:
    """("ok" | "blocked" | "broken", detail). A failed request is tried once more."""
    target = ("https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(url, safe="")
              if is_youtube(url) else url)
    for attempt in range(2):
        try:
            status = get(target)
            break
        except Exception as e:  # timeout, DNS, TLS: may be a passing network problem
            if attempt:
                return "broken", f"{type(e).__name__}: {e}"
    if 200 <= status < 300:
        return "ok", str(status)
    if status in BLOCKED:
        return "blocked", f"HTTP {status}"
    if is_youtube(url) and status in (400, 404):
        return "broken", f"HTTP {status} from YouTube oEmbed (video removed or private)"
    return "broken", f"HTTP {status}"


def check_all(links: dict[str, list[str]], get=fetch, workers: int = 16) -> dict[str, tuple[str, str]]:
    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = pool.map(lambda u: check(u, get), links)
        return dict(zip(links, results))


def main() -> int:
    links = collect()
    print(f"Checking {len(links)} links...")
    results = check_all(links)
    for kind in ("broken", "blocked"):
        bad = [(u, d) for u, (k, d) in results.items() if k == kind]
        if bad:
            title = "Broken" if kind == "broken" else "Blocked for scripts (open by hand)"
            print(f"\n{title}: {len(bad)}")
            for url, detail in bad:
                print(f"  - {', '.join(links[url])}: {url} ({detail})")
    ok = sum(k == "ok" for k, _ in results.values())
    broken = sum(k == "broken" for k, _ in results.values())
    print(f"\n{ok} ok, {len(results) - ok - broken} blocked, {broken} broken.")
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
