import {
  AREA_LABELS,
  OFFER_TYPE_LABELS,
  PRICING_MODEL_LABELS,
  SORT_OPTIONS
} from "./config.js";

const FILTER_GROUPS = [
  {
    heading: "Offer Type",
    stateKey: "offerTypes",
    labels: OFFER_TYPE_LABELS
  },
  {
    heading: "Pricing",
    stateKey: "pricingModels",
    labels: PRICING_MODEL_LABELS
  },
  {
    heading: "Special",
    stateKey: "shadyFlags",
    labels: Object.freeze({
      shady: "Shady"
    })
  },
  {
    heading: "Area",
    stateKey: "areas",
    labels: AREA_LABELS
  }
];

const AREA_GLYPH_ICONS = Object.freeze({
  cs: "mdi:code-braces",
  creative: "mdi:palette-outline",
  notetaking: "mdi:notebook-edit-outline",
  productivity: "mdi:rocket-launch-outline",
  shopping: "mdi:shopping-outline",
  travel: "mdi:airplane",
  financial: "mdi:bank-outline",
  gaming: "mdi:controller-classic-outline",
  stationery: "mdi:pencil-ruler-outline",
  other: "mdi:earth"
});

const DEFAULT_LOGO_ICON = "mdi:domain";

const COMPANY_LOGO_OVERRIDES = Object.freeze({
  Calm: "mdi:meditation",
  UNiDAYS: "mdi:school-outline",
  "Student Beans": "mdi:account-school-outline",
  SheerID: "mdi:shield-check-outline",
  "ID.me": "mdi:id-card",
  Educative: "mdi:book-open-page-variant-outline",
  "The Wall Street Journal": "simple-icons:thewallstreetjournal",
  "The Washington Post": "simple-icons:thewashingtonpost",
  ACM: "mdi:atom-variant",
  StudentUniverse: "mdi:airplane-marker",
  Chase: "mdi:bank",
  "U.S. Bank": "mdi:bank",
  "US Bank": "mdi:bank",
  MATLAB: "simple-icons:mathworks",
  "U-Pack": "mdi:truck-delivery-outline",
  "U.S. Self Storage": "mdi:warehouse",
  "Ubigi eSIM": "mdi:sim",
  Typo: "mdi:format-font"
});

function highlightText(text, searchText) {
  if (!searchText) {
    return [{ type: "text", value: text }];
  }

  const normalizedNeedle = searchText.trim().toLowerCase();
  if (!normalizedNeedle) {
    return [{ type: "text", value: text }];
  }

  const haystack = text.toLowerCase();
  let cursor = 0;
  const parts = [];

  while (cursor < text.length) {
    const matchIndex = haystack.indexOf(normalizedNeedle, cursor);
    if (matchIndex === -1) {
      parts.push({ type: "text", value: text.slice(cursor) });
      break;
    }

    if (matchIndex > cursor) {
      parts.push({ type: "text", value: text.slice(cursor, matchIndex) });
    }

    parts.push({ type: "match", value: text.slice(matchIndex, matchIndex + normalizedNeedle.length) });
    cursor = matchIndex + normalizedNeedle.length;
  }

  return parts;
}

function appendHighlightedText(element, text, searchText) {
  element.textContent = "";
  const parts = highlightText(text, searchText);

  for (const part of parts) {
    if (part.type === "match") {
      const mark = document.createElement("mark");
      mark.textContent = part.value;
      element.append(mark);
      continue;
    }
    element.append(document.createTextNode(part.value));
  }
}

function createLabelTag(label, className = "tag") {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = label;
  return element;
}

function shortenEligibility(text, maxLength = 92) {
  if (text.length <= maxLength) {
    return text;
  }

  const clipped = text.slice(0, maxLength);
  const lastWordBoundary = clipped.lastIndexOf(" ");
  const safeCut = lastWordBoundary > 52 ? clipped.slice(0, lastWordBoundary) : clipped;
  return `${safeCut.trimEnd()}...`;
}

function createLogoBadge(offer) {
  const badge = document.createElement("div");
  badge.className = "logo-badge";

  const fallbackGlyph = document.createElement("span");
  fallbackGlyph.className = "logo-fallback-glyph fallback-hidden";
  fallbackGlyph.setAttribute("aria-hidden", "true");

  const hasIconify =
    typeof window !== "undefined" &&
    Boolean(window.customElements) &&
    Boolean(window.customElements.get("iconify-icon"));
  if (!hasIconify) {
    badge.append(fallbackGlyph);
    return badge;
  }

  const resolvedIcon =
    offer.logoIcon ||
    COMPANY_LOGO_OVERRIDES[offer.companyName] ||
    DEFAULT_LOGO_ICON;

  const icon = document.createElement("iconify-icon");
  icon.className = "company-icon";
  icon.setAttribute("icon", resolvedIcon);
  icon.setAttribute("aria-hidden", "true");
  badge.append(icon, fallbackGlyph);

  icon.addEventListener("load", () => {
    fallbackGlyph.classList.add("fallback-hidden");
  });

  icon.addEventListener("error", () => {
    if (icon.getAttribute("icon") !== DEFAULT_LOGO_ICON) {
      icon.setAttribute("icon", DEFAULT_LOGO_ICON);
      return;
    }
    fallbackGlyph.classList.remove("fallback-hidden");
  });

  return badge;
}

function createAreaGlyph(area, variant = "default") {
  const glyph = document.createElement("div");
  glyph.className = `area-glyph area-${area} area-glyph-${variant}`;

  const halo = document.createElement("span");
  halo.className = "area-glyph-halo";

  const icon = document.createElement("iconify-icon");
  icon.className = "area-glyph-icon";
  icon.setAttribute("icon", AREA_GLYPH_ICONS[area] || AREA_GLYPH_ICONS.other);
  icon.setAttribute("aria-hidden", "true");

  const spark = document.createElement("span");
  spark.className = "area-glyph-spark";

  glyph.append(halo, icon, spark);
  return glyph;
}

function createFavoriteButton(offerId, isFavorite, onToggleFavorite) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `favorite-btn${isFavorite ? " active" : ""}`;
  button.textContent = isFavorite ? "\u2605" : "\u2606";
  button.setAttribute("aria-label", isFavorite ? "Remove from favorites" : "Add to favorites");
  button.title = isFavorite ? "Remove from shortlist" : "Add to shortlist";

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    if (typeof onToggleFavorite === "function") {
      onToggleFavorite(offerId);
    }
  });

  return button;
}

function createOfferCard(
  offer,
  index,
  searchText,
  {
    favoritesSet = new Set(),
    onToggleFavorite = null,
    onReportBrokenDeal = null
  } = {}
) {
  const card = document.createElement("article");
  card.className = "offer-card";
  if (offer.isShady) {
    card.classList.add("shady-card");
  }
  card.style.animationDelay = `${Math.min(index * 20, 280)}ms`;
  card.setAttribute("role", "listitem");
  card.tabIndex = 0;
  card.setAttribute("aria-label", `Flip ${offer.companyName} card`);

  const cardInner = document.createElement("div");
  cardInner.className = "offer-card-inner";

  const frontFace = document.createElement("div");
  frontFace.className = "offer-card-face offer-card-front";

  const backFace = document.createElement("div");
  backFace.className = "offer-card-face offer-card-back";

  const favoriteButton = createFavoriteButton(
    offer.id,
    favoritesSet.has(offer.id),
    onToggleFavorite
  );

  const topBadges = document.createElement("div");
  topBadges.className = "card-top-badges";

  if (typeof offer.cardLabel === "string" && offer.cardLabel.trim()) {
    const normalizedCardLabel = offer.cardLabel.trim().toLowerCase();
    const cornerLabel = document.createElement("span");
    cornerLabel.className = "card-corner-label";
    if (normalizedCardLabel === "newly added") {
      cornerLabel.classList.add("card-corner-label-newly-added");
    }
    cornerLabel.textContent = offer.cardLabel.trim();
    topBadges.append(cornerLabel);
    frontFace.classList.add("has-card-label");
  }

  topBadges.append(favoriteButton);

  const setFlipped = (nextState) => {
    card.classList.toggle("is-flipped", nextState);
  };

  const toggleFlipped = () => {
    setFlipped(!card.classList.contains("is-flipped"));
  };

  card.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) {
      return;
    }
    toggleFlipped();
  });

  card.addEventListener("keydown", (event) => {
    if (event.target.closest("a, button")) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleFlipped();
    }
  });

  const header = document.createElement("header");
  header.className = "offer-card-header";

  const logo = createLogoBadge(offer);

  const nameBlock = document.createElement("div");
  const companyName = document.createElement("h3");
  companyName.className = "company-name";
  appendHighlightedText(companyName, offer.companyName, searchText);

  const valueRow = document.createElement("div");
  valueRow.className = "value-row";

  const valueLine = document.createElement("p");
  valueLine.className = "card-value";
  valueLine.textContent = offer.valueText;
  valueRow.append(valueLine);
  nameBlock.append(companyName, valueRow);

  header.append(logo, nameBlock);

  const tagRow = document.createElement("div");
  tagRow.className = "tag-row";
  tagRow.append(createLabelTag(PRICING_MODEL_LABELS[offer.pricingModel], "tag tag-pricing"));
  tagRow.append(createLabelTag(AREA_LABELS[offer.area]));

  if (offer.offerType !== "offer") {
    tagRow.append(createLabelTag(OFFER_TYPE_LABELS[offer.offerType]));
  }
  if (offer.isShady) {
    tagRow.append(createLabelTag("Shady", "tag tag-shady"));
  }

  const description = document.createElement("p");
  description.className = "card-description";
  if (offer.isShady) {
    description.classList.add("card-shady-note");
    description.textContent = "Use at your own risk.";
  } else {
    appendHighlightedText(description, offer.shortDescription, searchText);
  }

  const eligibility = document.createElement("p");
  eligibility.className = "card-eligibility";
  const eligibilityLabel = document.createElement("span");
  eligibilityLabel.className = "inline-label";
  eligibilityLabel.textContent = "Eligibility:";
  const eligibilityText = document.createElement("span");
  appendHighlightedText(eligibilityText, shortenEligibility(offer.eligibilityNotes), searchText);
  eligibility.append(eligibilityLabel, " ", eligibilityText);

  const trustRow = document.createElement("div");
  trustRow.className = "trust-row";

  const trustMeta = document.createElement("p");
  trustMeta.className = "trust-meta";
  trustMeta.textContent = `Last verified: ${offer.lastVerifiedDate}`;
  trustRow.append(trustMeta);

  const linkButton = document.createElement("a");
  linkButton.className = "btn btn-primary btn-small";
  linkButton.href = offer.officialUrl;
  linkButton.target = "_blank";
  linkButton.rel = "noopener noreferrer";
  linkButton.textContent = "Open Official Page";
  linkButton.setAttribute("aria-label", `Open ${offer.companyName} official offer page`);

  const actionsRow = document.createElement("div");
  actionsRow.className = "card-actions";
  actionsRow.append(linkButton);

  if (!offer.isShady) {
    const reportButton = document.createElement("button");
    reportButton.type = "button";
    reportButton.className = "btn btn-secondary btn-small btn-report";
    reportButton.textContent = "Report Broken Deal";
    reportButton.setAttribute("aria-label", `Report ${offer.companyName} as broken`);
    reportButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (typeof onReportBrokenDeal === "function") {
        onReportBrokenDeal(offer, reportButton);
      }
    });
    actionsRow.append(reportButton);
  }

  const backTitle = document.createElement("p");
  backTitle.className = "back-title";
  backTitle.textContent = `${offer.companyName} Signal`;

  const backAreaGlyph = createAreaGlyph(offer.area, "back");

  const backMeta = document.createElement("p");
  backMeta.className = "back-meta";
  backMeta.textContent = `${AREA_LABELS[offer.area]} | ${PRICING_MODEL_LABELS[offer.pricingModel]}`;

  if (offer.isShady) {
    frontFace.append(topBadges, header, tagRow, description, actionsRow);
  } else {
    frontFace.append(topBadges, header, tagRow, description, eligibility, trustRow, actionsRow);
  }
  backFace.append(backAreaGlyph, backTitle, backMeta);

  cardInner.append(frontFace, backFace);
  card.append(cardInner);
  return card;
}

export function renderSortOptions(selectElement, selectedValue) {
  selectElement.innerHTML = "";
  for (const option of SORT_OPTIONS) {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    if (option.value === selectedValue) {
      optionElement.selected = true;
    }
    selectElement.append(optionElement);
  }
}

export function renderFilterControls(container, filters, onToggle) {
  container.innerHTML = "";

  for (const group of FILTER_GROUPS) {
    const section = document.createElement("section");
    section.className = "filter-group";

    const heading = document.createElement("h3");
    heading.textContent = group.heading;

    const chipRow = document.createElement("div");
    chipRow.className = "chip-row";

    const entries = Object.entries(group.labels);
    for (const [value, label] of entries) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-chip";
      button.textContent = label;

      const active = filters[group.stateKey].has(value);
      if (active) {
        button.classList.add("active");
      }

      button.setAttribute("aria-pressed", String(active));
      button.addEventListener("click", () => onToggle(group.stateKey, value));
      chipRow.append(button);
    }

    section.append(heading, chipRow);
    container.append(section);
  }
}

export function renderResultsSummary(element, summary) {
  const { visibleCount, totalFiltered, totalAll, page, totalPages } = summary;

  if (totalFiltered === 0) {
    element.textContent = `Showing 0 of ${totalAll} offers. Change filters or reset to continue.`;
    return;
  }

  element.textContent =
    `Showing ${visibleCount} of ${totalFiltered} matching offers ` +
    `(${totalAll} total). Page ${page} of ${totalPages}.`;
}

export function renderCards(container, offers, searchText = "", options = {}) {
  container.innerHTML = "";
  const fragment = document.createDocumentFragment();
  offers.forEach((offer, index) => {
    fragment.append(createOfferCard(offer, index, searchText, options));
  });
  container.append(fragment);
}

export function renderSearchSuggestions(datalistElement, offers) {
  datalistElement.innerHTML = "";
  const values = new Set();

  for (const offer of offers) {
    values.add(offer.companyName);
    values.add(AREA_LABELS[offer.area]);
  }

  const suggestions = [...values]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .slice(0, 80);

  for (const value of suggestions) {
    const option = document.createElement("option");
    option.value = value;
    datalistElement.append(option);
  }
}

export function renderStatsStrip(container, stats) {
  container.innerHTML = "";
  const cards = [
    { label: "Matching Offers", value: stats.total },
    { label: "Free", value: stats.free },
    { label: "Discounted", value: stats.discount },
    { label: "Travel", value: stats.travel }
  ];

  const fragment = document.createDocumentFragment();
  for (const card of cards) {
    const item = document.createElement("article");
    item.className = "stat-mini";

    const label = document.createElement("p");
    label.className = "stat-mini-label";
    label.textContent = card.label;

    const value = document.createElement("p");
    value.className = "stat-mini-value";
    value.textContent = String(card.value);

    item.append(label, value);
    fragment.append(item);
  }

  container.append(fragment);
}

function createRadarListCard(title, offers) {
  const article = document.createElement("article");
  article.className = "radar-card";

  const heading = document.createElement("h3");
  heading.className = "radar-title";
  heading.textContent = title;

  const list = document.createElement("div");
  list.className = "radar-list";

  if (!offers.length) {
    const empty = document.createElement("p");
    empty.className = "radar-empty";
    empty.textContent = "No matching offers right now.";
    list.append(empty);
  } else {
    for (const offer of offers.slice(0, 3)) {
      const item = document.createElement("a");
      item.className = "radar-item";
      item.href = offer.officialUrl;
      item.target = "_blank";
      item.rel = "noopener noreferrer";
      item.setAttribute("aria-label", `Open ${offer.companyName} offer`);

      const company = document.createElement("span");
      company.className = "radar-item-company";
      company.textContent = offer.companyName;

      const meta = document.createElement("span");
      meta.className = "radar-item-meta";
      meta.textContent = `${AREA_LABELS[offer.area]} | ${offer.valueText}`;

      item.append(company, meta);
      list.append(item);
    }
  }

  article.append(heading, list);
  return article;
}

export function renderDealRadar(container, radarSections) {
  container.innerHTML = "";

  const title = document.createElement("h2");
  title.className = "radar-heading";
  title.textContent = "Deal Radar";

  const grid = document.createElement("div");
  grid.className = "radar-grid";

  for (const section of radarSections) {
    grid.append(createRadarListCard(section.title, section.offers));
  }

  container.append(title, grid);
}

export function renderActiveFilters(
  container,
  filters,
  onRemove,
  onClear
) {
  container.innerHTML = "";

  const chips = [];
  for (const area of filters.areas) {
    chips.push({ key: "areas", value: area, label: `Area: ${AREA_LABELS[area] || area}` });
  }
  for (const offerType of filters.offerTypes) {
    chips.push({ key: "offerTypes", value: offerType, label: `Type: ${OFFER_TYPE_LABELS[offerType] || offerType}` });
  }
  for (const pricingModel of filters.pricingModels) {
    chips.push({ key: "pricingModels", value: pricingModel, label: `Pricing: ${PRICING_MODEL_LABELS[pricingModel] || pricingModel}` });
  }
  for (const shadyFlag of filters.shadyFlags) {
    if (shadyFlag === "shady") {
      chips.push({ key: "shadyFlags", value: shadyFlag, label: "Special: Shady" });
    }
  }
  if (filters.searchText) {
    chips.push({ key: "searchText", value: filters.searchText, label: `Search: ${filters.searchText}` });
  }

  container.hidden = chips.length === 0;
  if (chips.length === 0) {
    return;
  }

  const title = document.createElement("span");
  title.className = "active-title";
  title.textContent = "Active filters";
  container.append(title);

  for (const chipData of chips) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "active-chip";
    chip.textContent = `${chipData.label} x`;
    chip.addEventListener("click", () => onRemove(chipData.key, chipData.value));
    container.append(chip);
  }

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "active-clear";
  clearButton.textContent = "Clear all";
  clearButton.addEventListener("click", onClear);
  container.append(clearButton);
}

export function renderEmptyState(emptyStateElement, showEmpty) {
  emptyStateElement.hidden = !showEmpty;
}

function getPaginationTokens(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const numericPages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const orderedPages = [...numericPages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  const tokens = [];
  for (let i = 0; i < orderedPages.length; i += 1) {
    const page = orderedPages[i];
    const previous = orderedPages[i - 1];
    if (i > 0 && page - previous > 1) {
      tokens.push("...");
    }
    tokens.push(page);
  }

  return tokens;
}

function createPageButton(label, page, disabled, onPageChange, isCurrent = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "page-btn";
  button.textContent = label;
  button.disabled = disabled;

  if (isCurrent) {
    button.classList.add("current");
    button.setAttribute("aria-current", "page");
  }

  button.addEventListener("click", () => {
    if (!disabled) {
      onPageChange(page);
    }
  });

  return button;
}

export function renderPagination(container, currentPage, totalPages, onPageChange) {
  container.innerHTML = "";
  if (totalPages <= 1) {
    return;
  }

  container.append(
    createPageButton("Prev", currentPage - 1, currentPage === 1, onPageChange)
  );

  const tokens = getPaginationTokens(currentPage, totalPages);
  for (const token of tokens) {
    if (token === "...") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "page-ellipsis";
      ellipsis.textContent = "...";
      container.append(ellipsis);
      continue;
    }

    container.append(
      createPageButton(String(token), token, token === currentPage, onPageChange, token === currentPage)
    );
  }

  container.append(
    createPageButton("Next", currentPage + 1, currentPage === totalPages, onPageChange)
  );
}

export function renderCountList(listElement, counts, labelMap, sortBy = "label_asc") {
  listElement.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const rows = Object.entries(labelMap).map(([key, label]) => ({
    key,
    label,
    count: counts[key] ?? 0
  }));

  switch (sortBy) {
    case "label_desc":
      rows.sort((a, b) => b.label.localeCompare(a.label, undefined, { sensitivity: "base" }));
      break;
    case "count_desc":
      rows.sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
      break;
    case "count_asc":
      rows.sort((a, b) => (a.count - b.count) || a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
      break;
    case "label_asc":
    default:
      rows.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
      break;
  }

  for (const row of rows) {
    const listItem = document.createElement("li");
    listItem.className = "count-row";

    const labelSpan = document.createElement("span");
    labelSpan.textContent = row.label;
    const valueSpan = document.createElement("strong");
    valueSpan.textContent = String(row.count);

    listItem.append(labelSpan, valueSpan);
    fragment.append(listItem);
  }

  listElement.append(fragment);
}

export function renderLoadError(container, message) {
  container.innerHTML = "";
  const box = document.createElement("div");
  box.className = "error-box";
  box.textContent = message;
  container.append(box);
}
