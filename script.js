// ==========================
// Airtable configuration
// ==========================
//
// IMPORTANT:
// 1. Set AIRTABLE_BASE_ID to your base's ID (starts with "app...").
// 2. Set AIRTABLE_TABLE_NAME to your table name (e.g. "Trees").
// 3. Set AIRTABLE_API_TOKEN to your personal access token with read-only access.
//
// If you don't remember them, open your previous script.js in another tab
// and copy the values from there.

const AIRTABLE_BASE_ID = "appe2sseQ12piCWap";
const AIRTABLE_TABLE_NAME = "Species"; // replace with your actual table name
const AIRTABLE_API_TOKEN = "patme1XZdQghYiGd4.b637eb7325e461d04863f06d75dc2732074b1ab27459f5f950bed2812f37cb40";

// Approximate FRI campus coordinates for map center.[web:77][web:79][web:85]
const FRI_LAT = 30.343;
const FRI_LNG = 78.0015;

// We'll store records globally so future phases (filters, detail view) can reuse them.
let allRecords = [];

// ==========================
// Leaflet map setup
// ==========================

const map = L.map("map").setView([FRI_LAT, FRI_LNG], 16);

// OpenStreetMap tiles (free).[web:108]
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const treeLayer = L.layerGroup().addTo(map);

// ==========================
// Airtable fetch
// ==========================

async function loadTreesFromAirtable() {
  if (!AIRTABLE_BASE_ID || !AIRTABLE_API_TOKEN) {
    console.error("You must set AIRTABLE_BASE_ID and AIRTABLE_API_TOKEN in script.js");
    return;
  }

  const url =
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/` +
    encodeURIComponent(AIRTABLE_TABLE_NAME) +
    `?pageSize=100&view=Grid%20view`; // adjust "Grid view" if your main view has another name.[web:18][web:52][web:63]

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_TOKEN}`
      }
    });

    if (!response.ok) {
      console.error("Airtable API error:", response.status, response.statusText);
      return;
    }

    const data = await response.json();
    console.log("Airtable data:", data);

    if (!data.records || !Array.isArray(data.records)) {
      console.error("Unexpected Airtable response format");
      return;
    }

    allRecords = data.records;

    setSpeciesCount(allRecords);
    renderSpeciesCards(allRecords);
    renderMapMarkers(allRecords);
  } catch (err) {
    console.error("Error fetching from Airtable:", err);
  }
}

// ==========================
// Helpers: extract fields
// ==========================

function getFields(record) {
  const fields = record.fields || {};

  // Adjust these mappings if your Airtable field names differ.
  const species =
    fields.Species ||
    fields["Scientific name"] ||
    fields["Species name"] ||
    "Unnamed species";

  const family =
    fields.Family ||
    fields["Botanical family"] ||
    "Unknown family";

  const commonName =
    fields["Common name"] ||
    fields["Common Name"] ||
    "";

  const origin =
    fields.Origin ||
    fields["Origin category"] ||
    ""; // e.g., "Native" or "Exotic"

  const uses =
    fields.Uses ||
    fields["Tree uses"] ||
    "";

  const desc =
    fields.Description ||
    fields.Notes ||
    "";

  const lat =
    fields.Latitude ||
    fields.Lat ||
    fields.lat ||
    null;

  const lng =
    fields.Longitude ||
    fields.Lng ||
    fields.lng ||
    null;

  // First image from an attachment field
  let imageUrl = null;
  if (fields.Images && Array.isArray(fields.Images) && fields.Images.length > 0) {
    imageUrl = fields.Images[0].url;
  }
  if (!imageUrl && fields.Photos && Array.isArray(fields.Photos) && fields.Photos.length > 0) {
    imageUrl = fields.Photos[0].url;
  }

  return {
    species,
    family,
    commonName,
    origin,
    uses,
    desc,
    lat,
    lng,
    imageUrl
  };
}

// ==========================
// Species count on Home page
// ==========================

function setSpeciesCount(records) {
  const countEl = document.getElementById("species-count");
  if (!countEl) return;

  const uniqueSpecies = new Set();
  records.forEach(record => {
    const { species } = getFields(record);
    uniqueSpecies.add(species);
  });

  countEl.textContent = uniqueSpecies.size.toString();
}

// ==========================
// Render species cards
// ==========================

function renderSpeciesCards(records) {
  const container = document.getElementById("species-cards");
  if (!container) return;

  container.innerHTML = "";

  records.forEach(record => {
    const {
      species,
      family,
      commonName,
      origin,
      uses,
      desc,
      imageUrl
    } = getFields(record);

    const card = document.createElement("article");
    card.className = "species-card";

    // Header: names + family
    const header = document.createElement("div");
    header.className = "species-card-header";

    const nameEl = document.createElement("div");
    nameEl.className = "species-name";
    nameEl.textContent = commonName
      ? `${commonName} (${species})`
      : species;

    const familyEl = document.createElement("div");
    familyEl.className = "species-family";
    familyEl.textContent = family;

    header.appendChild(nameEl);
    header.appendChild(familyEl);
    card.appendChild(header);

    // Origin (Native/Exotic)
    if (origin) {
      const originEl = document.createElement("div");
      originEl.className = "species-origin";
      originEl.textContent = origin;
      card.appendChild(originEl);
    }

    // Uses
    if (uses) {
      const usesEl = document.createElement("div");
      usesEl.className = "species-uses";
      usesEl.textContent = `Uses: ${uses}`;
      card.appendChild(usesEl);
    }

    // Description
    if (desc) {
      const descEl = document.createElement("div");
      descEl.className = "species-desc";
      descEl.textContent = desc;
      card.appendChild(descEl);
    }

    // Image
    if (imageUrl) {
      const imgEl = document.createElement("img");
      imgEl.className = "species-image";
      imgEl.src = imageUrl;
      imgEl.alt = species;
      card.appendChild(imgEl);
    }

    container.appendChild(card);
  });
}

// ==========================
// Render map markers
// ==========================

function renderMapMarkers(records) {
  treeLayer.clearLayers();

  records.forEach(record => {
    const {
      species,
      family,
      commonName,
      origin,
      uses,
      lat,
      lng
    } = getFields(record);

    if (lat == null || lng == null) {
      return;
    }

    const marker = L.marker([lat, lng]);

    const popupLines = [];
    popupLines.push(`<strong>${species}</strong>`);
    if (commonName) popupLines.push(commonName);
    popupLines.push(family);
    if (origin) popupLines.push(origin);
    if (uses) popupLines.push(`<em>${uses}</em>`);

    marker.bindPopup(popupLines.join("<br/>"));
    marker.addTo(treeLayer);
  });
}

// ==========================
// Initialize on page load
// ==========================

document.addEventListener("DOMContentLoaded", () => {
  loadTreesFromAirtable();
});
