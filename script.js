// ==========================
// Airtable configuration
// ==========================
//
// IMPORTANT:
// 1. Set AIRTABLE_BASE_ID to your base's ID (starts with "app...").
// 2. Set AIRTABLE_TABLE_NAME to your table name (e.g. "Trees").
// 3. Set AIRTABLE_API_TOKEN to your personal access token with read-only access.
//
// Copy these from the working version you had earlier.

const AIRTABLE_BASE_ID = "_________";
const AIRTABLE_TABLE_NAME = "Species"; // exact table name
const AIRTABLE_API_TOKEN = "_______________________";

// Approximate FRI campus coordinates for map center.[web:77][web:79][web:85]
const FRI_LAT = 30.343;
const FRI_LNG = 78.0015;

let allRecords = [];

// ==========================
// Leaflet map setup
// ==========================

const map = L.map("map").setView([FRI_LAT, FRI_LNG], 16);

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
    `?pageSize=100&view=Grid%20view`; // adjust view name if needed.[web:18][web:52][web:63]

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

    renderSpeciesCards(allRecords);
    renderMapMarkers(allRecords);
  } catch (err) {
    console.error("Error fetching from Airtable:", err);
  }
}

// ==========================
// Field extraction helper
// ==========================

function getFields(record) {
  const fields = record.fields || {};

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
    "";

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
// Render species cards (Explore page)
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

    if (origin) {
      const originEl = document.createElement("div");
      originEl.className = "species-origin";
      originEl.textContent = origin;
      card.appendChild(originEl);
    }

    if (uses) {
      const usesEl = document.createElement("div");
      usesEl.className = "species-uses";
      usesEl.textContent = `Uses: ${uses}`;
      card.appendChild(usesEl);
    }

    if (desc) {
      const descEl = document.createElement("div");
      descEl.className = "species-desc";
      descEl.textContent = desc;
      card.appendChild(descEl);
    }

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
// Render map markers (Map page)
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

    if (lat == null || lng == null) return;

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
// Page switching (Home / Explore / Map)
// ==========================

function showPage(pageName) {
  const sections = document.querySelectorAll(".page-section");
  sections.forEach(sec => {
    sec.classList.remove("active-page");
  });

  const target = document.getElementById(`page-${pageName}`);
  if (target) {
    target.classList.add("active-page");
  }

  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === pageName);
  });
}

// ==========================
// Feedback form (temporary behavior)
// ==========================

function initSuggestionForm() {
  const form = document.getElementById("suggestion-form");
  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = formData.get("name");
    const message = formData.get("message");

    console.log("Suggestion submitted:", { name, message });
    alert("Thank you for your suggestion! (It is logged in the browser console for now.)");

    form.reset();
  });
}

// ==========================
// Initialize on page load
// ==========================

document.addEventListener("DOMContentLoaded", () => {
  // default page: home
  showPage("home");

  // nav buttons
  document.querySelectorAll(".nav-link").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      showPage(page);
    });
  });

  // hero buttons
  const btnExplore = document.getElementById("btn-explore");
  const btnMap = document.getElementById("btn-map");
  if (btnExplore) {
    btnExplore.addEventListener("click", () => showPage("explore"));
  }
  if (btnMap) {
    btnMap.addEventListener("click", () => showPage("map"));
  }

  initSuggestionForm();
  loadTreesFromAirtable();
});
