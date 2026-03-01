# Contributing to EDU Offer Hub

This project stores all offers in [`data/offers.json`](data/offers.json).

## 1) Before Adding an Offer
- Confirm the offer is genuinely student-focused (EDU verification, enrollment verification, or clear student program).
- Use the official company landing page for the offer.
- Check for duplicates by company + offer type.
- Avoid tracking/referral links.

## 2) Local Preview
Run the site locally (required because data is loaded via `fetch`):

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/`.

## 3) File to Edit
- [`data/offers.json`](data/offers.json)

## 4) Required Offer Fields
Each object inside `offers[]` must include:
- `id` (unique, lowercase kebab-case)
- `companyName`
- `logoIcon` (Iconify id or empty string)
- `area`
- `offerType`
- `pricingModel`
- `discountValue` (`number` or `null`)
- `discountUnit`
- `valueText`
- `shortDescription`
- `eligibilityNotes`
- `officialUrl` (`http://` or `https://`; prefer `https://`)
- `addedDate` (`YYYY-MM-DD`)

Optional:
- `cardLabel` (example: `"newly added"`)

## 5) Allowed Enum Values
`area`:
- `cs`
- `creative`
- `notetaking`
- `productivity`
- `shopping`
- `travel`
- `financial`
- `gaming`
- `stationery`
- `other`

`offerType`:
- `deal`
- `discount`
- `offer`

`pricingModel`:
- `free`
- `discount`

`discountUnit`:
- `percent`
- `usd`
- `none`

## 6) Metadata Updates
When you add, remove, or significantly revise offers, update `metadata`:
- `metadata.lastUpdated` to today (`YYYY-MM-DD`)
- `metadata.version` (recommended patch bump, example `1.1.0` -> `1.1.1`)
- `metadata.source` if curation source changed

## 7) Validation Behavior
The app validates each entry at runtime (`scripts/data.js`). Invalid entries are skipped, not rendered.

Common reasons an entry is skipped:
- Missing required fields
- Invalid enum values
- Invalid date format
- Invalid URL format

## 8) Offer Writing Guidelines
- Keep `shortDescription` concise and factual.
- Keep `eligibilityNotes` explicit about verification requirements.
- Use neutral language; do not promise terms that might expire.
- If discount value is unknown, set:
  - `discountValue: null`
  - `discountUnit: "none"`

## 9) ID Rules
- Lowercase kebab-case only
- Stable over time (do not rename ids unless necessary)
- Unique across entire dataset

Examples:
- `github-student-developer-pack`
- `microsoft-365-education`
- `adobe-creative-cloud-student-discount`

## 10) Example Entry
```json
{
  "id": "example-company-student-offer",
  "companyName": "Example Company",
  "logoIcon": "simple-icons:example",
  "area": "productivity",
  "offerType": "offer",
  "pricingModel": "free",
  "discountValue": null,
  "discountUnit": "none",
  "valueText": "Free student plan",
  "shortDescription": "Brief summary of the student benefit.",
  "eligibilityNotes": "Student verification required with school account.",
  "officialUrl": "https://www.example.com/students",
  "addedDate": "2026-02-28",
  "cardLabel": "newly added"
}
```

## 11) Final Checklist
- JSON is valid (no trailing commas)
- Enums match allowed values
- Date format is `YYYY-MM-DD`
- URL opens and points to official source
- Entry appears correctly in:
  - filters
  - sorting
  - card rendering
