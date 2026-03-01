import {
  DATA_PATH,
  VALID_AREAS,
  VALID_OFFER_TYPES,
  VALID_PRICING_MODELS,
  VALID_DISCOUNT_UNITS
} from "./config.js";

const REQUIRED_STRING_FIELDS = [
  "id",
  "companyName",
  "area",
  "offerType",
  "pricingModel",
  "discountUnit",
  "valueText",
  "shortDescription",
  "eligibilityNotes",
  "officialUrl",
  "addedDate"
];

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isIsoDate(dateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return false;
  }

  return !Number.isNaN(Date.parse(`${dateValue}T00:00:00Z`));
}

function isHttpUrl(urlValue) {
  try {
    const parsed = new URL(urlValue);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function toNumericOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clampToNonNegative(value) {
  return value < 0 ? 0 : value;
}

function normalizeEnumValue(value) {
  return normalizeString(value).toLowerCase();
}

function normalizeAreaValue(value) {
  const normalized = normalizeEnumValue(value)
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();

  const aliases = {
    "gaming and entertainment": "gaming",
    "office and stationery": "stationery",
    "office stationery": "stationery",
    finance: "financial"
  };

  return aliases[normalized] || normalized;
}

function validateMetadata(rawMetadata) {
  const today = new Date().toISOString().slice(0, 10);
  if (!isObject(rawMetadata)) {
    console.warn("metadata is missing or invalid, using defaults.");
    return {
      lastUpdated: today,
      version: "1.0.0",
      source: "manual-curation"
    };
  }

  const lastUpdated = normalizeString(rawMetadata.lastUpdated);
  const version = normalizeString(rawMetadata.version);
  const source = normalizeString(rawMetadata.source);

  return {
    lastUpdated: isIsoDate(lastUpdated) ? lastUpdated : today,
    version: version || "1.0.0",
    source: source || "manual-curation"
  };
}

function validateOffer(rawOffer, index) {
  if (!isObject(rawOffer)) {
    console.warn(`Skipping entry ${index}: value is not an object.`);
    return null;
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    const value = normalizeString(rawOffer[field]);
    if (!value) {
      console.warn(`Skipping entry ${index}: missing required field "${field}".`);
      return null;
    }
  }

  const offer = {
    id: normalizeString(rawOffer.id),
    companyName: normalizeString(rawOffer.companyName),
    logoIcon: normalizeString(rawOffer.logoIcon),
    cardLabel: normalizeString(rawOffer.cardLabel),
    area: normalizeAreaValue(rawOffer.area),
    offerType: normalizeEnumValue(rawOffer.offerType),
    pricingModel: normalizeEnumValue(rawOffer.pricingModel),
    discountValue: toNumericOrNull(rawOffer.discountValue),
    discountUnit: normalizeEnumValue(rawOffer.discountUnit),
    valueText: normalizeString(rawOffer.valueText),
    shortDescription: normalizeString(rawOffer.shortDescription),
    eligibilityNotes: normalizeString(rawOffer.eligibilityNotes),
    officialUrl: normalizeString(rawOffer.officialUrl),
    addedDate: normalizeString(rawOffer.addedDate)
  };

  if (!VALID_AREAS.includes(offer.area)) {
    console.warn(`Skipping entry ${index}: invalid area "${offer.area}".`);
    return null;
  }

  if (!VALID_OFFER_TYPES.includes(offer.offerType)) {
    console.warn(`Skipping entry ${index}: invalid offerType "${offer.offerType}".`);
    return null;
  }

  if (!VALID_PRICING_MODELS.includes(offer.pricingModel)) {
    console.warn(`Skipping entry ${index}: invalid pricingModel "${offer.pricingModel}".`);
    return null;
  }

  if (!VALID_DISCOUNT_UNITS.includes(offer.discountUnit)) {
    console.warn(`Skipping entry ${index}: invalid discountUnit "${offer.discountUnit}".`);
    return null;
  }

  if (!isHttpUrl(offer.officialUrl)) {
    console.warn(`Skipping entry ${index}: officialUrl is not a valid http(s) URL.`);
    return null;
  }

  if (!isIsoDate(offer.addedDate)) {
    console.warn(`Skipping entry ${index}: addedDate must be YYYY-MM-DD.`);
    return null;
  }

  const addedTimestamp = Date.parse(`${offer.addedDate}T00:00:00Z`);
  const todayTimestamp = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const ageInDays = clampToNonNegative(
    Math.floor((todayTimestamp - addedTimestamp) / (1000 * 60 * 60 * 24))
  );
  const needsRecheck = ageInDays > 90;
  const searchableText = [
    offer.companyName,
    offer.shortDescription,
    offer.eligibilityNotes,
    offer.valueText
  ]
    .join(" ")
    .toLowerCase();

  return {
    ...offer,
    normalizedSortValue: offer.discountValue,
    addedTimestamp,
    ageInDays,
    lastVerifiedDate: offer.addedDate,
    verificationStatus: needsRecheck ? "needs_recheck" : "verified",
    verificationStatusLabel: needsRecheck ? "Needs Recheck" : "Verified",
    searchableText
  };
}

export async function fetchOffersData(dataPath = DATA_PATH) {
  const response = await fetch(dataPath, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${dataPath} (status ${response.status}).`);
  }

  const rawPayload = await response.json();
  if (!isObject(rawPayload) || !Array.isArray(rawPayload.offers)) {
    throw new Error("Invalid JSON structure. Expected { metadata, offers[] }.");
  }

  const metadata = validateMetadata(rawPayload.metadata);
  const offers = rawPayload.offers
    .map((entry, index) => validateOffer(entry, index))
    .filter(Boolean)
    .map((offer) => ({
      ...offer,
      lastVerifiedDate: metadata.lastUpdated
    }));

  return { metadata, offers };
}

function countBy(offers, key, orderedKeys) {
  const counts = {};
  for (const orderedKey of orderedKeys) {
    counts[orderedKey] = 0;
  }

  for (const offer of offers) {
    const fieldValue = offer[key];
    if (Object.hasOwn(counts, fieldValue)) {
      counts[fieldValue] += 1;
    }
  }

  return counts;
}

export function aggregateOfferCounts(offers) {
  return {
    area: countBy(offers, "area", VALID_AREAS),
    offerType: countBy(offers, "offerType", VALID_OFFER_TYPES),
    pricingModel: countBy(offers, "pricingModel", VALID_PRICING_MODELS)
  };
}
