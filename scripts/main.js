import {
  BROKEN_DEAL_LABEL,
  BROKEN_DEAL_TOKEN_STORAGE_KEY,
  CONTRIBUTE_URL,
  DATA_PATH,
  GITHUB_REPO_NAME,
  GITHUB_REPO_OWNER,
  SUPPORT_EMAIL,
  ensureIconifyLoaded
} from "./config.js";
import { fetchOffersData } from "./data.js";
import { filterOffers, paginateOffers, sortOffers } from "./filters.js";
import {
  renderActiveFilters,
  renderCards,
  renderDealRadar,
  renderEmptyState,
  renderFilterControls,
  renderLoadError,
  renderPagination,
  renderResultsSummary,
  renderSearchSuggestions,
  renderSortOptions,
  renderStatsStrip
} from "./render.js?v=20260301a";
import {
  clearAllFilters,
  createInitialState,
  resetPage,
  setFavorites,
  setFavoritesOnly,
  setIncludeShadyDeals,
  setOffers,
  setPage,
  setSearchText,
  setShadyOffers,
  setSortBy,
  syncPagination,
  toggleFavorite,
  toggleSetFilter
} from "./state.js";

const state = createInitialState();
const mobileMedia = window.matchMedia("(max-width: 640px)");
const FAVORITES_STORAGE_KEY = "edu_hub_favorites_v1";
const ISSUE_MARKER_PREFIX = "edu-hub-deal-id";
const GITHUB_API_BASE = "https://api.github.com";
const BROKEN_DEAL_PLUS_ONE = "+1";
let datasetLastUpdated = null;

const elements = {
  body: document.body,
  headerLastUpdated: document.querySelector("#headerLastUpdated"),
  hireMeBtn: document.querySelector("#hireMeBtn"),
  contributeTop: document.querySelector("#contributeLinkTop"),
  contributeBottom: document.querySelector("#contributeLinkBottom"),
  resumeModal: document.querySelector("#resumeModal"),
  resumeModalCloseBtn: document.querySelector("#resumeModalCloseBtn"),
  resumeModalBackdrop: document.querySelector("[data-resume-close]"),
  filtersPanel: document.querySelector("#filtersPanel"),
  filterGroups: document.querySelector("#filterGroups"),
  clearFiltersBtn: document.querySelector("#clearFiltersBtn"),
  closeFiltersBtn: document.querySelector("#closeFiltersBtn"),
  openFiltersBtn: document.querySelector("#openFiltersBtn"),
  mobileOverlay: document.querySelector("#mobileOverlay"),
  mobileSortBtn: document.querySelector("#mobileSortBtn"),
  searchInput: document.querySelector("#searchInput"),
  searchSuggestions: document.querySelector("#searchSuggestions"),
  sortSelect: document.querySelector("#sortSelect"),
  shortlistToggleBtn: document.querySelector("#shortlistToggleBtn"),
  shadyToggleBtn: document.querySelector("#shadyToggleBtn"),
  shadyNotice: document.querySelector("#shadyNotice"),
  dealRadar: document.querySelector("#dealRadar"),
  statsStrip: document.querySelector("#statsStrip"),
  activeFiltersBar: document.querySelector("#activeFiltersBar"),
  resultsSummary: document.querySelector("#resultsSummary"),
  cardsContainer: document.querySelector("#cardsContainer"),
  emptyState: document.querySelector("#emptyState"),
  resetFromEmptyBtn: document.querySelector("#resetFromEmptyBtn"),
  clearAreaFromEmptyBtn: document.querySelector("#clearAreaFromEmptyBtn"),
  sortAZFromEmptyBtn: document.querySelector("#sortAZFromEmptyBtn"),
  freeOnlyFromEmptyBtn: document.querySelector("#freeOnlyFromEmptyBtn"),
  paginationContainer: document.querySelector("#paginationContainer")
};

function buildShadyOffers(lastUpdatedDate) {
  const addedDate = typeof lastUpdatedDate === "string" && lastUpdatedDate ? lastUpdatedDate : new Date().toISOString().slice(0, 10);
  const addedTimestamp = Date.parse(`${addedDate}T00:00:00Z`);
  const safeTimestamp = Number.isFinite(addedTimestamp) ? addedTimestamp : Date.now();

  return [
    {
      id: "libgen-shadow-library",
      companyName: "LibGen",
      logoIcon: "mdi:book-open-variant",
      area: "other",
      offerType: "offer",
      pricingModel: "free",
      discountValue: null,
      discountUnit: "none",
      valueText: "Free access to a shadow academic library",
      shortDescription: "Unofficial mirror library used to access research books and papers.",
      eligibilityNotes: "No student verification required. Legal status varies by country and institution policy.",
      officialUrl: "https://librarygenesis.net/",
      addedDate,
      normalizedSortValue: null,
      addedTimestamp: safeTimestamp,
      ageInDays: 0,
      lastVerifiedDate: addedDate,
      verificationStatus: "needs_recheck",
      verificationStatusLabel: "Needs Recheck",
      searchableText: [
        "LibGen",
        "shadow academic library",
        "librarygenesis",
        "unofficial mirror"
      ].join(" ").toLowerCase(),
      isShady: true
    },
    {
      id: "hianime-shadow-stream",
      companyName: "HiAnime",
      logoIcon: "mdi:television-play",
      area: "gaming",
      offerType: "offer",
      pricingModel: "free",
      discountValue: null,
      discountUnit: "none",
      valueText: "Free anime streaming index",
      shortDescription: "Unofficial streaming portal with ad-heavy third-party mirrors.",
      eligibilityNotes: "No EDU verification. Use caution and verify your local legal restrictions before use.",
      officialUrl: "https://hianime.to/",
      addedDate,
      normalizedSortValue: null,
      addedTimestamp: safeTimestamp,
      ageInDays: 0,
      lastVerifiedDate: addedDate,
      verificationStatus: "needs_recheck",
      verificationStatusLabel: "Needs Recheck",
      searchableText: [
        "HiAnime",
        "anime streaming",
        "hianime"
      ].join(" ").toLowerCase(),
      isShady: true
    }
  ];
}

function loadFavoriteIds() {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((value) => typeof value === "string" && value.trim()));
  } catch {
    return new Set();
  }
}

function saveFavoriteIds(favoriteSet) {
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favoriteSet]));
  } catch {
    // noop: localStorage can be unavailable in some contexts.
  }
}

function syncFavoritesWithOffers() {
  const validIds = new Set(
    [...state.allOffers, ...state.shadyOffers].map((offer) => offer.id)
  );
  const nextFavorites = new Set();
  for (const favoriteId of state.favorites) {
    if (validIds.has(favoriteId)) {
      nextFavorites.add(favoriteId);
    }
  }
  setFavorites(state, nextFavorites);
}

function updateShortlistButton(matchingFavoritesCount) {
  if (!elements.shortlistToggleBtn) {
    return;
  }

  elements.shortlistToggleBtn.textContent = state.favoritesOnly
    ? `Showing Shortlist (${matchingFavoritesCount})`
    : `My Shortlist (${state.favorites.size})`;
  elements.shortlistToggleBtn.classList.toggle("active", state.favoritesOnly);
}

function updateShadyToggleButton() {
  if (elements.body) {
    elements.body.classList.toggle("shady-enabled", state.includeShadyDeals);
  }

  if (elements.shadyToggleBtn) {
    elements.shadyToggleBtn.textContent = state.includeShadyDeals ? "x" : "?";
    elements.shadyToggleBtn.classList.toggle("active", state.includeShadyDeals);
    elements.shadyToggleBtn.setAttribute(
      "aria-label",
      state.includeShadyDeals ? "Hide shady deals" : "Show shady deals"
    );
    elements.shadyToggleBtn.title = state.includeShadyDeals ? "Hide shady deals" : "Show shady deals";
  }

  if (elements.shadyNotice) {
    elements.shadyNotice.hidden = !state.includeShadyDeals;
  }
}

function pickUniqueOffers(sortedOffers, usedIds, limit = 3) {
  const picks = [];
  for (const offer of sortedOffers) {
    if (usedIds.has(offer.id)) {
      continue;
    }
    picks.push(offer);
    usedIds.add(offer.id);
    if (picks.length >= limit) {
      break;
    }
  }
  return picks;
}

function computeDealRadarSections(offers) {
  if (!offers.length) {
    return [
      { title: "New This Week", offers: [] },
      { title: "Most Valuable", offers: [] },
      { title: "Hidden Gems", offers: [] }
    ];
  }

  const referenceDate = datasetLastUpdated
    ? Date.parse(`${datasetLastUpdated}T00:00:00Z`)
    : Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const newestFirst = [...offers].sort((a, b) => b.addedTimestamp - a.addedTimestamp);
  const newThisWeekAll = newestFirst.filter((offer) => {
    const delta = referenceDate - offer.addedTimestamp;
    return delta >= 0 && delta <= weekMs;
  });

  const mostValuableAll = [...offers].sort((a, b) => {
    const aScore = typeof a.discountValue === "number" ? a.discountValue : (a.pricingModel === "free" ? 10 : 0);
    const bScore = typeof b.discountValue === "number" ? b.discountValue : (b.pricingModel === "free" ? 10 : 0);
    if (aScore !== bScore) {
      return bScore - aScore;
    }
    return a.companyName.localeCompare(b.companyName, undefined, { sensitivity: "base" });
  });

  const areaCounts = new Map();
  for (const offer of offers) {
    areaCounts.set(offer.area, (areaCounts.get(offer.area) || 0) + 1);
  }

  const hiddenGemsAll = [...offers].sort((a, b) => {
    const areaWeightA = 100 / (areaCounts.get(a.area) || 1);
    const areaWeightB = 100 / (areaCounts.get(b.area) || 1);
    const freshnessA = Math.max(0, 365 - a.ageInDays) / 365 * 8;
    const freshnessB = Math.max(0, 365 - b.ageInDays) / 365 * 8;
    const freeBonusA = a.pricingModel === "free" ? 12 : 0;
    const freeBonusB = b.pricingModel === "free" ? 12 : 0;
    const scoreA = areaWeightA + freshnessA + freeBonusA;
    const scoreB = areaWeightB + freshnessB + freeBonusB;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    return a.companyName.localeCompare(b.companyName, undefined, { sensitivity: "base" });
  });

  const used = new Set();
  const newThisWeek = pickUniqueOffers(newThisWeekAll.length ? newThisWeekAll : newestFirst, used);
  const mostValuable = pickUniqueOffers(mostValuableAll, used);
  const hiddenGems = pickUniqueOffers(hiddenGemsAll, used);

  return [
    { title: "New This Week", offers: newThisWeek },
    { title: "Most Valuable", offers: mostValuable },
    { title: "Hidden Gems", offers: hiddenGems }
  ];
}

function handleFavoriteToggle(offerId) {
  toggleFavorite(state, offerId);
  saveFavoriteIds(state.favorites);
  recomputeAndRender();
}

function isMobileViewport() {
  return mobileMedia.matches;
}

function openFiltersDrawer() {
  if (!isMobileViewport()) {
    return;
  }

  elements.body.classList.add("mobile-drawer-open");
  elements.mobileOverlay.hidden = false;
}

function closeFiltersDrawer() {
  elements.body.classList.remove("mobile-drawer-open");
  elements.mobileOverlay.hidden = true;
}

function openResumeModal() {
  if (!elements.resumeModal) {
    return;
  }

  elements.resumeModal.hidden = false;
  elements.body.classList.add("resume-modal-open");
}

function closeResumeModal() {
  if (!elements.resumeModal) {
    return;
  }

  elements.resumeModal.hidden = true;
  elements.body.classList.remove("resume-modal-open");
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeOpenExternal(url) {
  if (!url) {
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function getStoredGitHubToken() {
  try {
    return normalizeText(window.localStorage.getItem(BROKEN_DEAL_TOKEN_STORAGE_KEY));
  } catch {
    return "";
  }
}

function buildIssueMarker(offerId) {
  return `${ISSUE_MARKER_PREFIX}:${offerId}`;
}

function buildBrokenDealIssueTitle(offer) {
  return `[Broken Deal] ${offer.companyName} (${offer.id})`;
}

function buildBrokenDealIssueBody(offer) {
  const marker = buildIssueMarker(offer.id);
  const currentPageUrl = window.location.href;

  return [
    "## Broken deal report",
    "",
    `- Company: ${offer.companyName}`,
    `- Deal ID: ${offer.id}`,
    `- Offer URL: ${offer.officialUrl}`,
    `- Reported from: ${currentPageUrl}`,
    "",
    "### What is broken?",
    "- [ ] Link is dead",
    "- [ ] Promo no longer works",
    "- [ ] Student verification is rejected",
    "- [ ] Other (explain below)",
    "",
    "### Additional details",
    "Please add any error messages, screenshots, or notes that help reproduce the issue.",
    "",
    `<!-- ${marker} -->`,
    marker
  ].join("\n");
}

function buildBrokenDealIssueUrl(offer) {
  const baseUrl = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/issues/new`;
  const params = new URLSearchParams({
    labels: BROKEN_DEAL_LABEL,
    title: buildBrokenDealIssueTitle(offer),
    body: buildBrokenDealIssueBody(offer)
  });
  return `${baseUrl}?${params.toString()}`;
}

function buildBrokenDealMailtoUrl(offer) {
  const subject = `[Broken Deal] ${offer.companyName} (${offer.id})`;
  const body = [
    `Company: ${offer.companyName}`,
    `Deal ID: ${offer.id}`,
    `Offer URL: ${offer.officialUrl}`,
    "",
    "What is broken:",
    "-",
    "",
    "Additional details:",
    "-"
  ].join("\n");
  return `mailto:${encodeURIComponent(SUPPORT_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function findExistingBrokenDealIssue(offer) {
  const marker = buildIssueMarker(offer.id);
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/issues?state=all&per_page=100&sort=created&direction=desc`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json"
    }
  });

  if (!response.ok) {
    throw new Error(`Issue lookup failed with status ${response.status}.`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  for (const item of payload) {
    if (!item || item.pull_request) {
      continue;
    }

    const issueBody = normalizeText(item.body);
    if (!issueBody.includes(marker)) {
      continue;
    }

    if (!item.number || !item.html_url) {
      continue;
    }

    return {
      number: item.number,
      htmlUrl: item.html_url
    };
  }

  return null;
}

async function postPlusOneComment(issueNumber) {
  const token = getStoredGitHubToken();
  if (!token) {
    return false;
  }

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ body: BROKEN_DEAL_PLUS_ONE })
    }
  );

  return response.ok;
}

async function copyPlusOneToClipboard() {
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    return false;
  }

  try {
    await navigator.clipboard.writeText(BROKEN_DEAL_PLUS_ONE);
    return true;
  } catch {
    return false;
  }
}

async function handleReportBrokenDeal(offer, triggerButton = null) {
  if (!offer || !offer.id) {
    return;
  }

  const defaultLabel = "Report Broken Deal";
  const originalLabel = triggerButton ? triggerButton.textContent : defaultLabel;
  if (triggerButton) {
    triggerButton.disabled = true;
    triggerButton.textContent = "Checking...";
  }

  try {
    const existingIssue = await findExistingBrokenDealIssue(offer);
    if (existingIssue) {
      const autoCommented = await postPlusOneComment(existingIssue.number);
      if (autoCommented) {
        safeOpenExternal(existingIssue.htmlUrl);
        window.alert(`Added "${BROKEN_DEAL_PLUS_ONE}" to issue #${existingIssue.number}.`);
        return;
      }

      const copied = await copyPlusOneToClipboard();
      safeOpenExternal(`${existingIssue.htmlUrl}#new_comment_field`);
      window.alert(
        copied
          ? `Issue #${existingIssue.number} already exists. "${BROKEN_DEAL_PLUS_ONE}" was copied; paste it as a comment.`
          : `Issue #${existingIssue.number} already exists. Please comment "${BROKEN_DEAL_PLUS_ONE}" on it.`
      );
      return;
    }

    safeOpenExternal(buildBrokenDealIssueUrl(offer));
  } catch (error) {
    console.warn("Broken-deal issue flow failed; falling back to email.", error);
    safeOpenExternal(buildBrokenDealMailtoUrl(offer));
  } finally {
    if (triggerButton) {
      triggerButton.disabled = false;
      triggerButton.textContent = originalLabel || defaultLabel;
    }
  }
}

function applyContributeLinks() {
  if (elements.contributeTop) {
    elements.contributeTop.href = CONTRIBUTE_URL;
  }
  if (elements.contributeBottom) {
    elements.contributeBottom.href = CONTRIBUTE_URL;
  }
}

function renderActiveFilterBar() {
  renderActiveFilters(
    elements.activeFiltersBar,
    state.filters,
    (filterKey, value) => {
      if (filterKey === "searchText") {
        setSearchText(state, "");
        elements.searchInput.value = "";
      } else if (state.filters[filterKey] instanceof Set) {
        state.filters[filterKey].delete(value);
      }

      resetPage(state);
      refreshFilterControls();
      recomputeAndRender();
    },
    () => {
      clearFilterState();
    }
  );
}

function refreshFilterControls() {
  renderFilterControls(
    elements.filterGroups,
    state.filters,
    (filterKey, value) => {
      const hadValue = state.filters[filterKey] instanceof Set && state.filters[filterKey].has(value);
      toggleSetFilter(state, filterKey, value);
      if (filterKey === "shadyFlags" && value === "shady" && !hadValue) {
        setIncludeShadyDeals(state, true);
      }
      resetPage(state);
      refreshFilterControls();
      recomputeAndRender();

      if (isMobileViewport()) {
        closeFiltersDrawer();
      }
    },
    { showShadyFilter: state.includeShadyDeals }
  );
}

function clearFilterState() {
  clearAllFilters(state);
  elements.searchInput.value = "";
  resetPage(state);
  refreshFilterControls();
  recomputeAndRender();

  if (isMobileViewport()) {
    closeFiltersDrawer();
  }
}

function computeStats(offers) {
  return {
    total: offers.length,
    free: offers.filter((offer) => offer.pricingModel === "free").length,
    discount: offers.filter((offer) => offer.pricingModel === "discount").length,
    travel: offers.filter((offer) => offer.area === "travel").length
  };
}

function hasNoActiveFilters() {
  return (
    state.filters.areas.size === 0 &&
    state.filters.offerTypes.size === 0 &&
    state.filters.pricingModels.size === 0 &&
    state.filters.shadyFlags.size === 0 &&
    !state.filters.searchText
  );
}

function recomputeAndRender() {
  const sourceOffers = state.includeShadyDeals
    ? [...state.allOffers, ...state.shadyOffers]
    : state.allOffers;
  const filteredBase = filterOffers(sourceOffers, state.filters);
  const favoriteMatches = filteredBase.filter((offer) => state.favorites.has(offer.id));
  const filtered = state.favoritesOnly ? favoriteMatches : filteredBase;
  const sorted = sortOffers(filtered, state.sortBy, {
    prioritizeNewlyAdded: !state.favoritesOnly && hasNoActiveFilters()
  });

  syncPagination(state, sorted.length);
  const pagedOffers = paginateOffers(
    sorted,
    state.pagination.page,
    state.pagination.pageSize
  );

  state.visibleOffers = pagedOffers;

  renderStatsStrip(elements.statsStrip, computeStats(filtered));
  updateShortlistButton(favoriteMatches.length);
  updateShadyToggleButton();
  renderActiveFilterBar();

  renderResultsSummary(elements.resultsSummary, {
    visibleCount: pagedOffers.length,
    totalFiltered: sorted.length,
    totalAll: sourceOffers.length,
    page: state.pagination.page,
    totalPages: state.pagination.totalPages
  });

  renderCards(elements.cardsContainer, pagedOffers, state.filters.searchText, {
    favoritesSet: state.favorites,
    onToggleFavorite: handleFavoriteToggle,
    onReportBrokenDeal: handleReportBrokenDeal
  });

  const showEmptyState = sorted.length === 0;
  renderEmptyState(elements.emptyState, showEmptyState);
  elements.paginationContainer.hidden = showEmptyState || state.pagination.totalPages <= 1;

  renderPagination(
    elements.paginationContainer,
    state.pagination.page,
    state.pagination.totalPages,
    (nextPage) => {
      setPage(state, nextPage);
      recomputeAndRender();
    }
  );
}

function renderAppLoadError(error) {
  console.error(error);
  if (elements.headerLastUpdated) {
    elements.headerLastUpdated.textContent = "Unavailable";
  }
  elements.resultsSummary.textContent = "Offer data could not be loaded.";
  elements.statsStrip.innerHTML = "";
  if (elements.dealRadar) {
    elements.dealRadar.innerHTML = "";
  }
  elements.activeFiltersBar.hidden = true;
  renderLoadError(
    elements.cardsContainer,
    "Failed to load data/offers.json. Run a local server and open this app through http://localhost."
  );
  elements.paginationContainer.innerHTML = "";
  elements.paginationContainer.hidden = true;
  renderEmptyState(elements.emptyState, false);
}

function showFreeOffersOnly() {
  clearAllFilters(state);
  state.filters.pricingModels.add("free");
  elements.searchInput.value = "";
  resetPage(state);
  refreshFilterControls();
  recomputeAndRender();
}

function applySort(sortValue) {
  setSortBy(state, sortValue);
  elements.sortSelect.value = sortValue;
  resetPage(state);
  recomputeAndRender();
}

function attachEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    setSearchText(state, event.target.value);
    resetPage(state);
    recomputeAndRender();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    applySort(event.target.value);
  });

  if (elements.shortlistToggleBtn) {
    elements.shortlistToggleBtn.addEventListener("click", () => {
      setFavoritesOnly(state, !state.favoritesOnly);
      resetPage(state);
      recomputeAndRender();
    });
  }

  if (elements.shadyToggleBtn) {
    elements.shadyToggleBtn.addEventListener("click", () => {
      const nextEnabled = !state.includeShadyDeals;
      setIncludeShadyDeals(state, nextEnabled);
      if (!nextEnabled) {
        state.filters.shadyFlags.delete("shady");
      }
      refreshFilterControls();
      resetPage(state);
      recomputeAndRender();
    });
  }

  elements.clearFiltersBtn.addEventListener("click", clearFilterState);
  elements.resetFromEmptyBtn.addEventListener("click", clearFilterState);
  elements.clearAreaFromEmptyBtn.addEventListener("click", () => {
    state.filters.areas.clear();
    resetPage(state);
    refreshFilterControls();
    recomputeAndRender();
  });
  elements.sortAZFromEmptyBtn.addEventListener("click", () => {
    applySort("company_asc");
  });
  elements.freeOnlyFromEmptyBtn.addEventListener("click", showFreeOffersOnly);

  elements.openFiltersBtn.addEventListener("click", openFiltersDrawer);
  elements.closeFiltersBtn.addEventListener("click", closeFiltersDrawer);
  elements.mobileOverlay.addEventListener("click", closeFiltersDrawer);
  elements.mobileSortBtn.addEventListener("click", () => {
    elements.sortSelect.scrollIntoView({ behavior: "smooth", block: "center" });
    elements.sortSelect.focus();
    if (typeof elements.sortSelect.showPicker === "function") {
      elements.sortSelect.showPicker();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeResumeModal();
      closeFiltersDrawer();
    }
  });

  if (elements.hireMeBtn) {
    elements.hireMeBtn.addEventListener("click", openResumeModal);
  }

  if (elements.resumeModalCloseBtn) {
    elements.resumeModalCloseBtn.addEventListener("click", closeResumeModal);
  }

  if (elements.resumeModalBackdrop) {
    elements.resumeModalBackdrop.addEventListener("click", closeResumeModal);
  }

  mobileMedia.addEventListener("change", (event) => {
    if (!event.matches) {
      closeFiltersDrawer();
    }
  });
}

async function init() {
  setFavorites(state, loadFavoriteIds());
  applyContributeLinks();
  attachEvents();
  renderSortOptions(elements.sortSelect, state.sortBy);
  refreshFilterControls();

  // Icon loading is optional; cards still render with text fallbacks if unavailable.
  await ensureIconifyLoaded();

  try {
    const { metadata, offers } = await fetchOffersData(DATA_PATH);
    datasetLastUpdated = metadata.lastUpdated;
    setOffers(state, offers);
    setShadyOffers(state, buildShadyOffers(metadata.lastUpdated));
    syncFavoritesWithOffers();
    saveFavoriteIds(state.favorites);
    renderSearchSuggestions(elements.searchSuggestions, offers);
    if (elements.dealRadar) {
      renderDealRadar(elements.dealRadar, computeDealRadarSections(offers));
    }
    if (elements.headerLastUpdated) {
      elements.headerLastUpdated.textContent = metadata.lastUpdated;
    }
    recomputeAndRender();
  } catch (error) {
    renderAppLoadError(error);
  }
}

init();
