#!/usr/bin/env python3
"""
Weekly offer-verification script.

Reads data/offers.json, checks every officialUrl with an HTTP request,
removes offers whose URLs are definitively gone (404 / 410), updates
link-check-report.json, bumps metadata.lastUpdated when anything changes,
and writes both files back to disk.

Exit codes
----------
0  – completed (changes may or may not have been written)
1  – unrecoverable error (e.g. offers.json is unreadable / malformed)
"""

import json
import os
import sys
import time
from datetime import date, timezone, datetime
from urllib.parse import urlparse

try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError:
    print("ERROR: 'requests' is not installed.  Run: pip install requests", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Paths (relative to repo root, which is the working directory)
# ---------------------------------------------------------------------------
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFERS_PATH = os.path.join(REPO_ROOT, "data", "offers.json")
REPORT_PATH = os.path.join(REPO_ROOT, "link-check-report.json")

# ---------------------------------------------------------------------------
# HTTP settings
# ---------------------------------------------------------------------------
REQUEST_TIMEOUT = 12          # seconds per request
DELAY_BETWEEN_REQUESTS = 1.2  # seconds – be polite to servers
MAX_REDIRECTS = 8

# Status codes that indicate the offer URL still exists but blocks bots.
# We classify these as "restricted" rather than broken.
RESTRICTED_CODES = {401, 403, 406, 429}

# Status codes that definitively mean the resource is gone.
BROKEN_CODES = {404, 410}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; edu-hub-bot/1.0; "
        "+https://github.com/ch1kim0n1/edu-web)"
    ),
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def _build_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=2,
        backoff_factor=1,
        status_forcelist=[500, 502, 503, 504],
        allowed_methods=["HEAD", "GET"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.max_redirects = MAX_REDIRECTS
    return session


def _classify(status: int, final_url: str) -> str:
    """Return 'working' | 'restricted' | 'broken'."""
    if status in RESTRICTED_CODES:
        return "restricted"
    if status in BROKEN_CODES:
        return "broken"
    if 200 <= status < 400:
        return "working"
    # 5xx or unexpected – treat as restricted so we don't delete the offer.
    return "restricted"


def check_url(session: requests.Session, url: str) -> dict:
    """
    Probe *url* and return a result dict with keys:
    url, classification, status, finalUrl, error (optional).
    """
    result: dict = {"url": url, "classification": "timeout", "status": None, "finalUrl": url}
    try:
        # Try HEAD first (cheaper); fall back to GET if server returns 405.
        resp = session.head(
            url,
            headers=HEADERS,
            timeout=REQUEST_TIMEOUT,
            allow_redirects=True,
        )
        if resp.status_code == 405:
            resp = session.get(
                url,
                headers=HEADERS,
                timeout=REQUEST_TIMEOUT,
                allow_redirects=True,
                stream=True,
            )

        result["status"] = resp.status_code
        result["finalUrl"] = resp.url
        result["classification"] = _classify(resp.status_code, resp.url)
    except requests.exceptions.TooManyRedirects:
        result["classification"] = "restricted"
        result["error"] = "too many redirects"
    except requests.exceptions.Timeout:
        result["classification"] = "timeout"
        result["error"] = "timeout"
    except requests.exceptions.ConnectionError as exc:
        result["classification"] = "timeout"
        result["error"] = str(exc)[:120]
    except requests.exceptions.RequestException as exc:
        result["classification"] = "restricted"
        result["error"] = str(exc)[:120]
    return result


def load_json(path: str) -> dict | list:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def write_json(path: str, data: dict | list) -> None:
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def today_iso() -> str:
    return date.today().isoformat()


def main() -> int:
    # ------------------------------------------------------------------
    # 1. Load offers.json
    # ------------------------------------------------------------------
    try:
        payload = load_json(OFFERS_PATH)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: cannot read {OFFERS_PATH}: {exc}", file=sys.stderr)
        return 1

    if not isinstance(payload, dict) or not isinstance(payload.get("offers"), list):
        print("ERROR: unexpected offers.json structure.", file=sys.stderr)
        return 1

    original_offers = payload["offers"]
    print(f"Loaded {len(original_offers)} offers from {OFFERS_PATH}")

    # ------------------------------------------------------------------
    # 2. Build a URL → [companyName, …] map so duplicates are coalesced
    # ------------------------------------------------------------------
    url_to_companies: dict[str, list[str]] = {}
    for offer in original_offers:
        url = offer.get("officialUrl", "").strip()
        if not url:
            continue
        url_to_companies.setdefault(url, [])
        name = offer.get("companyName", "").strip()
        if name and name not in url_to_companies[url]:
            url_to_companies[url].append(name)

    unique_urls = list(url_to_companies)
    print(f"Checking {len(unique_urls)} unique URLs …")

    # ------------------------------------------------------------------
    # 3. Probe every URL
    # ------------------------------------------------------------------
    session = _build_session()
    url_results: dict[str, dict] = {}

    for idx, url in enumerate(unique_urls, 1):
        result = check_url(session, url)
        url_results[url] = result
        cls = result["classification"]
        status = result.get("status") or result.get("error", "n/a")
        print(f"  [{idx}/{len(unique_urls)}] {cls:10s} {status!s:4}  {url}")
        time.sleep(DELAY_BETWEEN_REQUESTS)

    # ------------------------------------------------------------------
    # 4. Identify broken offers to remove
    # ------------------------------------------------------------------
    broken_urls = {url for url, r in url_results.items() if r["classification"] == "broken"}

    surviving_offers = []
    removed_offers = []

    for offer in original_offers:
        url = offer.get("officialUrl", "").strip()
        if url in broken_urls:
            removed_offers.append(offer)
        else:
            surviving_offers.append(offer)

    print(
        f"\nResults: "
        f"{sum(1 for r in url_results.values() if r['classification'] == 'working')} working, "
        f"{sum(1 for r in url_results.values() if r['classification'] == 'restricted')} restricted, "
        f"{len(broken_urls)} broken URLs, "
        f"{sum(1 for r in url_results.values() if r['classification'] == 'timeout')} timeout"
    )

    if removed_offers:
        print(f"Removing {len(removed_offers)} offer(s) with broken URLs:")
        for o in removed_offers:
            print(f"  - {o.get('companyName')} ({o.get('id')}): {o.get('officialUrl')}")
    else:
        print("No broken offers found; nothing removed.")

    # ------------------------------------------------------------------
    # 5. Write updated offers.json (only if something changed)
    # ------------------------------------------------------------------
    changed = bool(removed_offers)

    if changed:
        payload["offers"] = surviving_offers
        if isinstance(payload.get("metadata"), dict):
            payload["metadata"]["lastUpdated"] = today_iso()
        write_json(OFFERS_PATH, payload)
        print(f"Updated {OFFERS_PATH} ({len(surviving_offers)} offers remaining)")
    else:
        # Still bump lastUpdated so the dataset status page reflects that
        # a verification run happened even when no offers were removed.
        if isinstance(payload.get("metadata"), dict):
            payload["metadata"]["lastUpdated"] = today_iso()
            write_json(OFFERS_PATH, payload)
            print(f"Bumped metadata.lastUpdated to {today_iso()} in {OFFERS_PATH}")

    # ------------------------------------------------------------------
    # 6. Write link-check-report.json
    # ------------------------------------------------------------------
    results_list = []
    for url, r in url_results.items():
        entry: dict = {
            "url": url,
            "classification": r["classification"],
            "status": r.get("status"),
            "finalUrl": r.get("finalUrl", url),
            "companies": url_to_companies.get(url, []),
        }
        if "error" in r:
            entry["error"] = r["error"]
        results_list.append(entry)

    # Sort for stable diffs: broken first, then by URL.
    order = {"broken": 0, "timeout": 1, "restricted": 2, "working": 3}
    results_list.sort(key=lambda x: (order.get(x["classification"], 9), x["url"]))

    summary = {
        "total": len(results_list),
        "working": sum(1 for r in results_list if r["classification"] == "working"),
        "restricted": sum(1 for r in results_list if r["classification"] == "restricted"),
        "broken": sum(1 for r in results_list if r["classification"] == "broken"),
        "timeout": sum(1 for r in results_list if r["classification"] == "timeout"),
    }

    report = {
        "generatedAt": datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "summary": summary,
        "results": results_list,
    }

    write_json(REPORT_PATH, report)
    print(f"Wrote {REPORT_PATH} — {summary}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
