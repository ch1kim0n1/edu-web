export const DATA_PATH = "data/offers.json";
export const PAGE_SIZE = 20;
export const CONTRIBUTE_URL = "https://github.com/ch1kim0n1/edu-web";
export const ICONIFY_SCRIPT_URL = "https://code.iconify.design/iconify-icon/2.2.0/iconify-icon.min.js";

export const AREA_LABELS = Object.freeze({
  cs: "Computer Science",
  creative: "Creative",
  notetaking: "Notetaking",
  productivity: "Productivity",
  shopping: "Shopping",
  travel: "Travel",
  financial: "Financial",
  gaming: "Gaming & Entertainment",
  stationery: "Office & Stationery",
  other: "Other"
});

export const OFFER_TYPE_LABELS = Object.freeze({
  deal: "Deal",
  discount: "Discount",
  offer: "Offer"
});

export const PRICING_MODEL_LABELS = Object.freeze({
  free: "Free",
  discount: "Discount"
});

export const VALID_AREAS = Object.freeze(Object.keys(AREA_LABELS));
export const VALID_OFFER_TYPES = Object.freeze(Object.keys(OFFER_TYPE_LABELS));
export const VALID_PRICING_MODELS = Object.freeze(Object.keys(PRICING_MODEL_LABELS));
export const VALID_DISCOUNT_UNITS = Object.freeze(["percent", "usd", "none"]);

export const SORT_OPTIONS = Object.freeze([
  { value: "company_asc", label: "Company A-Z" },
  { value: "area_asc", label: "Area A-Z" },
  { value: "area_desc", label: "Area Z-A" },
  { value: "discount_desc", label: "Highest Discount/Value" },
  { value: "newest_desc", label: "Newest Added" }
]);

export const DEFAULT_SORT = "newest_desc";

let iconifyLoadPromise = null;

export function ensureIconifyLoaded() {
  if (typeof document === "undefined") {
    return Promise.resolve(false);
  }

  if (window.customElements && window.customElements.get("iconify-icon")) {
    return Promise.resolve(true);
  }

  if (iconifyLoadPromise) {
    return iconifyLoadPromise;
  }

  iconifyLoadPromise = new Promise((resolve) => {
    const existingLoader = document.querySelector("script[data-iconify-loader='true']");
    if (existingLoader) {
      if (existingLoader.dataset.loaded === "true") {
        resolve(true);
        return;
      }

      existingLoader.addEventListener(
        "load",
        () => {
          existingLoader.dataset.loaded = "true";
          resolve(true);
        },
        { once: true }
      );
      existingLoader.addEventListener(
        "error",
        () => resolve(false),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = ICONIFY_SCRIPT_URL;
    script.defer = true;
    script.dataset.iconifyLoader = "true";
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve(true);
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => resolve(false),
      { once: true }
    );
    document.head.appendChild(script);
  });

  return iconifyLoadPromise;
}
