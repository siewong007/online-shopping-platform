import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const inputPath = process.argv[2];
const outputDirectory = resolve(process.argv[3] ?? "catalogue/image-sourcing");

if (!inputPath) {
  console.error("Usage: bun scripts/generate-image-manifest.mjs <catalogue.csv> [output-directory]");
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim().length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.trim().length > 0)) rows.push(row);
  }

  const headers = rows.shift()?.map((value) => value.replace(/^\uFEFF/, "").trim()) ?? [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])));
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, headers) {
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\r\n") + "\r\n";
}

const brandRules = [
  ["Bosch", /\bBOSCH\b/i, /^BOS-/i],
  ["Nippon Paint", /\bNIPPON\b/i, /^NIP-/i],
  ["Joven", /\bJOVEN\b/i, /^JOV-/i],
  ["Stanley", /\bSTANLEY\b/i, /^STA-/i],
  ["STIHL", /\bSTIHL\b/i, /^STI-/i],
  ["Sorento", /\bSORENTO\b/i, /^SOR-/i],
  ["Saniware", /\bSANIWARE\b/i, /^SAN-/i],
  ["Khind", /\bKHIND\b/i, /^KHI-/i],
  ["Rubine", /\bRUBINE\b/i, /^RUB-/i],
  ["Deka", /\bDEKA\b/i, /^DEK-/i],
  ["Karcher", /\bKARCHER\b/i, /^KAR-/i],
  ["Panasonic", /\bPANASONIC\b/i, /^PAN-/i],
  ["Yale", /\bYALE\b/i, /^YAL-/i],
  ["Nietz", /\bNIETZ\b/i, /^NIE-/i],
  ["Glotool", /\bGLOTOOL\b/i, /^GLO-/i],
  ["Taicon", /\bTAICON\b/i, /^TAI-/i],
  ["Samurai", /\bSAMURAI\b/i, /^SAM-/i],
  ["Buteline", /\bBUTELINE\b/i, /^BUT-/i],
  ["Megaman", /\bMEGAMAN\b/i, /^MEG-/i],
  ["Eveready", /\bEVEREADY\b/i, /^EVE-/i],
  ["Yazaki", /\bYAZAKI\b/i, /^YAZ-/i],
  ["MKK", /\bMKK\b/i, /^MKK-/i],
  ["Fajar", /\bFAJAR\b/i, /^FAJ-/i]
];

const highVisualCategories = new Set([
  "Bathroom", "Fans & Ventilation", "Home Appliances", "Kitchen & Sinks", "Lighting"
]);
const mediumVisualCategories = new Set([
  "Chemicals & Adhesives", "Doors & Hardware", "Outdoor & Garden", "Paint & Sundries",
  "Power Tools", "Pumps & Water", "Safety & PPE"
]);
const lowVisualCategories = new Set([
  "Electrical", "Fasteners & Fixings", "Plumbing", "Power Tool Accessories"
]);

const colourAndSizeWords = new Set([
  "BLACK", "BLUE", "BROWN", "CHROME", "GOLD", "GREEN", "GREY", "ORANGE", "RED",
  "SILVER", "WHITE", "YELLOW", "SMALL", "MEDIUM", "LARGE", "SHORT", "LONG"
]);

function detectBrand(row) {
  const searchable = `${row.display_name} ${row.original_description ?? ""}`;
  return brandRules.find(([, namePattern, codePattern]) => namePattern.test(searchable) || codePattern.test(row.item_code))?.[0] ?? "";
}

function detectModel(row, brand) {
  const candidates = `${row.display_name} ${row.original_description ?? ""}`
    .replaceAll(/[()'",]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9.+/-]+$/g, ""))
    .filter((token) => token.length >= 3 && /[A-Za-z]/.test(token) && /\d/.test(token))
    .filter((token) => !/^\d+(?:\.\d+)?(?:MM|CM|M|L|ML|KG|G|W|V|A|AH|PCS?|IN)$/i.test(token));
  const brandToken = brand.replaceAll(/[^A-Za-z0-9]/g, "").toUpperCase();
  return candidates.find((token) => token.replaceAll(/[^A-Za-z0-9]/g, "").toUpperCase() !== brandToken) ?? "";
}

function suggestedFamilyKey(row, brand) {
  const normalized = row.display_name
    .toUpperCase()
    .replaceAll(/\b\d+(?:\.\d+)?\s*(?:MM|CM|M|IN|FT|L|ML|KG|G|W|V|A|AH|PCS?|PACK)\b/g, " ")
    .replaceAll(/[^A-Z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !colourAndSizeWords.has(token))
    .slice(0, 8)
    .join("-")
    .toLowerCase();
  return `${(brand || "unbranded").toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}:${normalized || row.item_code.toLowerCase()}`;
}

const sourceText = await readFile(resolve(inputPath), "utf8");
const catalogue = parseCsv(sourceText);
const required = ["item_code", "display_name", "category", "uom", "stock_qty", "price_myr"];
const missing = required.filter((header) => !Object.hasOwn(catalogue[0] ?? {}, header));
if (missing.length > 0) throw new Error(`Missing required columns: ${missing.join(", ")}`);

const prepared = catalogue.map((row) => {
  const stock = Math.max(0, Number(row.stock_qty) || 0);
  const price = Math.max(0, Number(row.price_myr) || 0);
  const brand = detectBrand(row);
  const model = detectModel(row, brand);
  return {
    ...row,
    stock,
    price,
    stockValue: stock * price,
    brand,
    model,
    familyKey: suggestedFamilyKey(row, brand)
  };
});

const maximumStockValue = Math.max(...prepared.map((row) => row.stockValue), 1);
const familyCounts = new Map();
for (const row of prepared) familyCounts.set(row.familyKey, (familyCounts.get(row.familyKey) ?? 0) + 1);

const scoredRows = prepared.map((row) => {
  const stockScore = 35 * Math.log1p(row.stockValue) / Math.log1p(maximumStockValue);
  const identityScore = row.brand && row.model ? 25 : row.brand ? 17 : row.model ? 10 : 4;
  const visualScore = highVisualCategories.has(row.category) ? 20 : mediumVisualCategories.has(row.category) ? 15 : lowVisualCategories.has(row.category) ? 7 : 11;
  const searchScore = row.brand && row.model ? 10 : row.brand ? 7 : row.model ? 5 : 2;
  const familyScore = (familyCounts.get(row.familyKey) ?? 0) > 1 ? 10 : 3;
  const score = Math.round((stockScore + identityScore + visualScore + searchScore + familyScore) * 10) / 10;

  return {
    item_code: row.item_code,
    uom: row.uom,
    display_name: row.display_name,
    category: row.category,
    stock_qty: row.stock_qty,
    price_myr: row.price_myr,
    priority_score: score.toFixed(1),
    priority_tier: "",
    detected_brand: row.brand,
    detected_model: row.model,
    suggested_family_key: row.familyKey,
    family_listing_count: familyCounts.get(row.familyKey) ?? 1,
    candidate_page_url: "",
    candidate_image_url: "",
    source_owner: "",
    rights_status: "pending",
    match_confidence: "",
    review_status: "pending",
    image_url: "",
    local_asset_path: "",
    checksum: "",
    notes: ""
  };
});

const scoreOrder = [...scoredRows].sort((left, right) => Number(right.priority_score) - Number(left.priority_score) || Number(right.stock_qty) - Number(left.stock_qty) || left.item_code.localeCompare(right.item_code));
const stockValueOrder = [...scoredRows].sort((left, right) => (Number(right.stock_qty) * Number(right.price_myr)) - (Number(left.stock_qty) * Number(left.price_myr)) || Number(right.priority_score) - Number(left.priority_score));
const tierOneKeys = new Set();
const tierOneCategoryCounts = new Map();
const rowKey = (row) => `${row.item_code}\u0000${row.uom}`;
const selectTierOne = (row) => {
  const key = rowKey(row);
  if (tierOneKeys.has(key)) return;
  tierOneKeys.add(key);
  tierOneCategoryCounts.set(row.category, (tierOneCategoryCounts.get(row.category) ?? 0) + 1);
};

// Reserve one third of the first pass for the stock value currently at risk, then use the
// image score with a category cap so one visually rich department cannot consume the queue.
stockValueOrder.slice(0, 100).forEach(selectTierOne);
for (const row of scoreOrder) {
  if (tierOneKeys.size >= 300) break;
  if ((tierOneCategoryCounts.get(row.category) ?? 0) >= 50) continue;
  selectTierOne(row);
}
for (const row of scoreOrder) {
  if (tierOneKeys.size >= 300) break;
  selectTierOne(row);
}

const remainingScoreOrder = scoreOrder.filter((row) => !tierOneKeys.has(rowKey(row)));
const tierTwoKeys = new Set(remainingScoreOrder.slice(0, 700).map(rowKey));
for (const row of scoredRows) {
  const key = rowKey(row);
  row.priority_tier = tierOneKeys.has(key) ? "1" : tierTwoKeys.has(key) ? "2" : "3";
}

const manifest = [...scoredRows].sort((left, right) => Number(left.priority_tier) - Number(right.priority_tier) || Number(right.priority_score) - Number(left.priority_score) || left.item_code.localeCompare(right.item_code));
const priorityOne = manifest.filter((row) => row.priority_tier === "1");

// Preserve reviewed research when the base AutoCount catalogue is regenerated. Candidate
// files intentionally contain no image_url approval; they cannot be published by the bulk
// importer until rights and A/B review are completed.
try {
  const candidates = parseCsv(await readFile(resolve(outputDirectory, "official-source-pilot.csv"), "utf8"));
  const candidatesByKey = new Map(candidates.map((row) => [`${row.item_code}\u0000${row.uom}`, row]));
  for (const row of manifest) {
    const candidate = candidatesByKey.get(rowKey(row));
    if (!candidate) continue;
    for (const field of [
      "candidate_page_url",
      "candidate_image_url",
      "source_owner",
      "rights_status",
      "match_confidence",
      "review_status",
      "image_url",
      "local_asset_path",
      "checksum",
      "notes",
    ]) {
      if (candidate[field]) row[field] = candidate[field];
    }
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const headers = Object.keys(manifest[0]);
await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, "product-image-manifest.csv"), toCsv(manifest, headers), "utf8");
await writeFile(resolve(outputDirectory, "priority-300.csv"), toCsv(priorityOne, headers), "utf8");
await writeFile(resolve(outputDirectory, "summary.json"), JSON.stringify({
  generated_at: new Date().toISOString(),
  source_file: basename(inputPath),
  listings: manifest.length,
  priority_1: Math.min(300, manifest.length),
  priority_2: Math.min(700, Math.max(0, manifest.length - 300)),
  priority_3: Math.max(0, manifest.length - 1000),
  rights_approved: 0,
  note: "No cost or margin fields are included. Suggested family keys require human verification before image sharing."
}, null, 2) + "\n", "utf8");

console.log(`Created ${manifest.length} manifest rows in ${outputDirectory}`);
