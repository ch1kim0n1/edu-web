# EDU Offer Hub

Static website for tracking student offers available to EDU users.

## Stack
- HTML + CSS + vanilla JavaScript modules
- No build step, no framework
- Data source: `data/offers.json`
- Icons: Iconify web component CDN (with fallback icons)

## Current Features
- Offer cards with front/back flip interaction
- Local favorites shortlist (saved in browser localStorage)
- Deal Radar sections:
  - New This Week
  - Most Valuable
  - Hidden Gems
- "Shady deals" toggle (opt-in hidden list)
- Multi-select filters:
  - `offerType`: `deal`, `discount`, `offer`
  - `pricingModel`: `free`, `discount`
  - `area`: `cs`, `creative`, `notetaking`, `productivity`, `shopping`, `travel`, `financial`, `gaming`, `stationery`, `other`
  - `special`: `shady`
- Search suggestions + text search across company/description/eligibility/value
- Sorting options:
  - `newest_desc` (default)
  - `company_asc`
  - `area_asc`
  - `area_desc`
  - `discount_desc`
- Pagination (20 per page by default)
- Dataset status page: `last-updated.html` with metadata, counts, heatmap

## Local Run
Because the app fetches `data/offers.json`, run it through a local HTTP server (not `file://`).

### Option 1: Python
```bash
python -m http.server 8080
```

### Option 2: Node
```bash
npx serve .
```

Open:
- `http://localhost:8080/`
- `http://localhost:8080/last-updated.html`

## Configuration
Edit [`scripts/config.js`](scripts/config.js):
- `DATA_PATH`: default `data/offers.json`
- `PAGE_SIZE`: default `20`
- `CONTRIBUTE_URL`: repo URL used by the Contribute buttons
- Label maps and enum values for areas, offer types, pricing models

## Data and Contribution
- Data file: [`data/offers.json`](data/offers.json)
- Contribution guide: [`CONTRIBUTING.md`](CONTRIBUTING.md)

## Deploy on GitHub Pages
Detailed guide: [`docs/GITHUB_PAGES.md`](docs/GITHUB_PAGES.md)

Quick summary:
1. Push this project to a GitHub repository.
2. In GitHub: `Settings -> Pages`.
3. Under `Build and deployment`, set:
   - Source: `Deploy from a branch`
   - Branch: `main` (or `master`)
   - Folder: `/ (root)`
4. Save and wait for deployment to complete.
5. Your URL will be:
   - `https://<username>.github.io/<repo-name>/` (project repo)
   - `https://<username>.github.io/` (if repo is named `<username>.github.io`)

## Project Structure
- [`index.html`](index.html): main catalog page
- [`last-updated.html`](last-updated.html): dataset status page
- [`styles/site.css`](styles/site.css): UI styles and animation
- [`scripts/config.js`](scripts/config.js): constants and enums
- [`scripts/data.js`](scripts/data.js): fetch + validate + normalize data
- [`scripts/state.js`](scripts/state.js): app state container
- [`scripts/filters.js`](scripts/filters.js): filter/sort/pagination logic
- [`scripts/render.js`](scripts/render.js): DOM rendering helpers
- [`scripts/main.js`](scripts/main.js): main page bootstrap
- [`scripts/last-updated.js`](scripts/last-updated.js): status page bootstrap
- [`data/offers.json`](data/offers.json): offers dataset

## Notes
- Offer terms and eligibility can change; always verify at each official URL.
- Invalid offer entries are skipped at runtime during validation.
