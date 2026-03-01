import { DEFAULT_SORT, PAGE_SIZE } from "./config.js";

export function createInitialState() {
  return {
    allOffers: [],
    visibleOffers: [],
    shadyOffers: [],
    includeShadyDeals: false,
    favorites: new Set(),
    favoritesOnly: false,
    filters: {
      areas: new Set(),
      offerTypes: new Set(),
      pricingModels: new Set(),
      shadyFlags: new Set(),
      searchText: ""
    },
    sortBy: DEFAULT_SORT,
    pagination: {
      page: 1,
      pageSize: PAGE_SIZE,
      totalPages: 1,
      totalItems: 0
    }
  };
}

export function setOffers(state, offers) {
  state.allOffers = Array.isArray(offers) ? [...offers] : [];
}

export function setShadyOffers(state, offers) {
  state.shadyOffers = Array.isArray(offers) ? [...offers] : [];
}

export function setIncludeShadyDeals(state, enabled) {
  state.includeShadyDeals = Boolean(enabled);
}

export function setFavorites(state, favoriteIds) {
  state.favorites = favoriteIds instanceof Set ? new Set(favoriteIds) : new Set();
}

export function toggleFavorite(state, offerId) {
  if (!offerId) {
    return;
  }

  if (state.favorites.has(offerId)) {
    state.favorites.delete(offerId);
    return;
  }

  state.favorites.add(offerId);
}

export function setFavoritesOnly(state, enabled) {
  state.favoritesOnly = Boolean(enabled);
}

export function toggleSetFilter(state, filterKey, value) {
  const selectedValues = state.filters[filterKey];
  if (!(selectedValues instanceof Set)) {
    return;
  }

  if (selectedValues.has(value)) {
    selectedValues.delete(value);
    return;
  }

  selectedValues.add(value);
}

export function setSearchText(state, text) {
  state.filters.searchText = typeof text === "string" ? text.trim() : "";
}

export function clearAllFilters(state) {
  state.filters.areas.clear();
  state.filters.offerTypes.clear();
  state.filters.pricingModels.clear();
  state.filters.shadyFlags.clear();
  state.filters.searchText = "";
}

export function setSortBy(state, sortBy) {
  state.sortBy = sortBy;
}

export function resetPage(state) {
  state.pagination.page = 1;
}

export function setPage(state, page) {
  state.pagination.page = page;
}

export function syncPagination(state, totalItems) {
  state.pagination.totalItems = totalItems;
  state.pagination.totalPages = Math.max(
    1,
    Math.ceil(totalItems / state.pagination.pageSize)
  );

  if (state.pagination.page > state.pagination.totalPages) {
    state.pagination.page = state.pagination.totalPages;
  }
}
