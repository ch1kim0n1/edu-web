import { AREA_LABELS } from "./config.js";

function matchesSetFilter(selectedSet, value) {
  if (!(selectedSet instanceof Set) || selectedSet.size === 0) {
    return true;
  }

  return selectedSet.has(value);
}

function matchesSearch(searchText, searchableText) {
  if (!searchText) {
    return true;
  }

  return searchableText.includes(searchText);
}

function matchesShady(selectedSet, offer) {
  if (!(selectedSet instanceof Set) || selectedSet.size === 0) {
    return true;
  }

  if (selectedSet.has("shady")) {
    return Boolean(offer.isShady);
  }

  return true;
}

export function filterOffers(offers, filters) {
  const normalizedSearch = filters.searchText.toLowerCase();

  return offers.filter((offer) => {
    const areaMatch = matchesSetFilter(filters.areas, offer.area);
    const offerTypeMatch = matchesSetFilter(filters.offerTypes, offer.offerType);
    const pricingMatch = matchesSetFilter(filters.pricingModels, offer.pricingModel);
    const shadyMatch = matchesShady(filters.shadyFlags, offer);
    const searchMatch = matchesSearch(normalizedSearch, offer.searchableText);

    return areaMatch && offerTypeMatch && pricingMatch && shadyMatch && searchMatch;
  });
}

function compareByCompanyAsc(a, b) {
  return a.companyName.localeCompare(b.companyName, undefined, { sensitivity: "base" });
}

function compareByAreaAsc(a, b) {
  const areaCompare = (AREA_LABELS[a.area] || a.area).localeCompare(
    AREA_LABELS[b.area] || b.area,
    undefined,
    { sensitivity: "base" }
  );
  if (areaCompare !== 0) {
    return areaCompare;
  }
  return compareByCompanyAsc(a, b);
}

function compareByAreaDesc(a, b) {
  return compareByAreaAsc(b, a);
}

function compareByDiscountDesc(a, b) {
  const aHasValue = typeof a.normalizedSortValue === "number";
  const bHasValue = typeof b.normalizedSortValue === "number";

  if (aHasValue && bHasValue && a.normalizedSortValue !== b.normalizedSortValue) {
    return b.normalizedSortValue - a.normalizedSortValue;
  }

  if (aHasValue !== bHasValue) {
    return aHasValue ? -1 : 1;
  }

  return compareByCompanyAsc(a, b);
}

function compareByNewestDesc(a, b) {
  if (a.addedTimestamp !== b.addedTimestamp) {
    return b.addedTimestamp - a.addedTimestamp;
  }

  return compareByCompanyAsc(a, b);
}

export function sortOffers(offers, sortBy, options = {}) {
  const { prioritizeNewlyAdded = false } = options;
  const sorted = [...offers];
  switch (sortBy) {
    case "discount_desc":
      sorted.sort(compareByDiscountDesc);
      break;
    case "area_asc":
      sorted.sort(compareByAreaAsc);
      break;
    case "area_desc":
      sorted.sort(compareByAreaDesc);
      break;
    case "newest_desc":
      sorted.sort(compareByNewestDesc);
      break;
    case "company_asc":
    default:
      sorted.sort(compareByCompanyAsc);
      break;
  }

  if (prioritizeNewlyAdded) {
    // Keep "newly added" cards pinned first while preserving the selected sort order.
    sorted.sort((a, b) => {
      const aNew = typeof a.cardLabel === "string" && a.cardLabel.trim().toLowerCase() === "newly added";
      const bNew = typeof b.cardLabel === "string" && b.cardLabel.trim().toLowerCase() === "newly added";
      if (aNew === bNew) {
        return 0;
      }
      return aNew ? -1 : 1;
    });
  }

  return sorted;
}

export function paginateOffers(offers, page, pageSize) {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  return offers.slice(start, end);
}
