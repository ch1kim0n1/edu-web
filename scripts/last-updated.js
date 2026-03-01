import {
  AREA_LABELS,
  CONTRIBUTE_URL,
  DATA_PATH,
  OFFER_TYPE_LABELS,
  PRICING_MODEL_LABELS
} from "./config.js";
import { aggregateOfferCounts, fetchOffersData } from "./data.js";
import { renderCountList } from "./render.js";

const elements = {
  contribute: document.querySelector("#contributeLinkStatus"),
  statusToolbarSummary: document.querySelector("#statusToolbarSummary"),
  statusSortSelect: document.querySelector("#statusSortSelect"),
  lastUpdatedDate: document.querySelector("#lastUpdatedDate"),
  datasetVersion: document.querySelector("#datasetVersion"),
  datasetSource: document.querySelector("#datasetSource"),
  totalOffers: document.querySelector("#totalOffers"),
  areaCounts: document.querySelector("#areaCounts"),
  areaHeatmap: document.querySelector("#areaHeatmap"),
  offerTypeCounts: document.querySelector("#offerTypeCounts"),
  pricingCounts: document.querySelector("#pricingCounts")
};

function animateNumber(element, target, durationMs = 620) {
  const finalValue = Number.isFinite(target) ? Math.max(0, target) : 0;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    element.textContent = String(finalValue);
    return;
  }

  const start = performance.now();
  const from = 0;
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(from + (finalValue - from) * eased);
    element.textContent = String(value);
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
}

function animateCountRows(listElement) {
  const values = listElement.querySelectorAll("strong");
  values.forEach((valueElement, index) => {
    const target = Number.parseInt(valueElement.textContent || "0", 10) || 0;
    valueElement.textContent = "0";
    window.setTimeout(() => animateNumber(valueElement, target), index * 34);
  });
}

function renderAreaHeatmap(areaCounts) {
  if (!elements.areaHeatmap) {
    return;
  }

  elements.areaHeatmap.innerHTML = "";
  const maxCount = Math.max(1, ...Object.values(areaCounts));
  const fragment = document.createDocumentFragment();

  for (const [areaKey, label] of Object.entries(AREA_LABELS)) {
    const count = areaCounts[areaKey] || 0;
    const intensity = count / maxCount;

    const cell = document.createElement("article");
    cell.className = "heatmap-cell";
    cell.style.setProperty("--intensity", intensity.toFixed(3));

    const name = document.createElement("p");
    name.className = "heatmap-label";
    name.textContent = label;

    const value = document.createElement("p");
    value.className = "heatmap-value";
    value.textContent = String(count);

    cell.append(name, value);
    fragment.append(cell);
  }

  elements.areaHeatmap.append(fragment);
}

function renderError() {
  if (elements.statusToolbarSummary) {
    elements.statusToolbarSummary.textContent = "Unable to load dataset overview.";
  }
  elements.lastUpdatedDate.textContent = "Unavailable";
  elements.datasetVersion.textContent = "Unavailable";
  elements.datasetSource.textContent = "Unavailable";
  elements.totalOffers.textContent = "0";
  elements.areaCounts.innerHTML = "<li class='count-row'><span>Unable to load dataset</span><strong>0</strong></li>";
  if (elements.areaHeatmap) {
    elements.areaHeatmap.innerHTML = "<p class='radar-empty'>Unable to load heatmap</p>";
  }
  elements.offerTypeCounts.innerHTML = "<li class='count-row'><span>Unable to load dataset</span><strong>0</strong></li>";
  elements.pricingCounts.innerHTML = "<li class='count-row'><span>Unable to load dataset</span><strong>0</strong></li>";
}

function renderAllCountLists(counts, sortBy) {
  renderCountList(elements.areaCounts, counts.area, AREA_LABELS, sortBy);
  renderCountList(elements.offerTypeCounts, counts.offerType, OFFER_TYPE_LABELS, sortBy);
  renderCountList(elements.pricingCounts, counts.pricingModel, PRICING_MODEL_LABELS, sortBy);
  animateCountRows(elements.areaCounts);
  animateCountRows(elements.offerTypeCounts);
  animateCountRows(elements.pricingCounts);
}

async function init() {
  elements.contribute.href = CONTRIBUTE_URL;

  try {
    const { metadata, offers } = await fetchOffersData(DATA_PATH);
    const counts = aggregateOfferCounts(offers);

    elements.lastUpdatedDate.textContent = metadata.lastUpdated;
    elements.datasetVersion.textContent = metadata.version;
    elements.datasetSource.textContent = metadata.source;
    elements.totalOffers.textContent = "0";
    animateNumber(elements.totalOffers, offers.length);
    renderAreaHeatmap(counts.area);

    if (elements.statusToolbarSummary) {
      const activeAreas = Object.values(counts.area).filter((count) => count > 0).length;
      const freeOffers = counts.pricingModel.free || 0;
      elements.statusToolbarSummary.textContent =
        `${offers.length} offers | ${activeAreas} active areas | ${freeOffers} free offers`;
    }

    renderAllCountLists(counts, elements.statusSortSelect.value);
    elements.statusSortSelect.addEventListener("change", () => {
      renderAllCountLists(counts, elements.statusSortSelect.value);
    });
  } catch (error) {
    console.error(error);
    renderError();
  }
}

init();
