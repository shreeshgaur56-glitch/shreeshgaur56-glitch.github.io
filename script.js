// ==========================
// CONFIGURE THESE CONSTANTS
// ==========================

// TODO: Replace these three values with your real Airtable details
const AIRTABLE_BASE_ID = "REPLACE_WITH_YOUR_BASE_ID";
const AIRTABLE_TABLE_NAME = "Trees"; // or your actual table name
const AIRTABLE_API_TOKEN = "REPLACE_WITH_YOUR_API_TOKEN";

// FRI Dehradun coordinates (approx) for map center
// Based on public coordinate data for Forest Research Institute campus.[web:77][web:79][web:85]
const FRI_LAT = 30.343;
const FRI_LNG = 78.0015;

// ==========================
// LEAFLET MAP SETUP
// ==========================

const map = L.map("map").setView([FRI_LAT, FRI_LNG], 16);

// OpenStreetMap tiles (free)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// A layer group to hold tree markers
const treeLayer = L.layerGroup().addTo(map);

// ==========================
// LOAD DATA FROM AIRTABLE
// ==========================

async function loadTreesFromAirtable() {
  if (!AIRTABLE_BASE_ID || !AIRTABLE_API_TOKEN) {
    console.error("You must set AIRTABLE_BASE_ID and AIRTABLE_API_TOKEN in script.js");
    return;
  }

  const url =
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/` +
    encodeURIComponent(AIRTABLE_TABLE_NAME) +
    `?pageSize=100&view=Grid%20view`; // adjust view name if needed[web:18][web:52][web:63]

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
    console.log("Airtable data:", data); // useful for debugging

    if (!data.records || !Array.isArray(data.records)) {
      console.error("Unexpected Airtable response format");
      return;
    }

    renderTrees(data.records);
  } catch (err) {
    console.error("Error fetching from Airtable:", err);
  }
}

// ==========================
// RENDER TREE LIST & MARKERS
// ==========================

function renderTrees(records) {
  const listEl = document.getElementById("tree-list");
  listEl.innerHTML = ""; // clear existing

  treeLayer.clearLayers();

  records.forEach(record => {
    const fields = record.fields || {};

    const species = fields.Species || fields["Scientific name"] || "Unnamed species";
    const family = fields.Family || "Unknown family";
    const uses = fields.Uses || "";
    const desc = fields.Description || "";

    // Adjust if your field names are different:
    const lat = fields.Latitude || fields.lat || null;
    const lng = fields.Longitude || fields.lng || null;

    // Images: use the first attachment URL if available
    let imageUrl = null;
    if (fields.Images && Array.isArray(fields.Images) && fields.Images.length > 0) {
      imageUrl = fields.Images[0].url;
    }

    // ---- List item ----
    const li = document.createElement("li");

    const nameEl = document.createElement("div");
    nameEl.className = "tree-name";
    nameEl.textContent = species;

    const familyEl = document.createElement("div");
    familyEl.className = "tree-family";
    familyEl.textContent = family;

    const usesEl = document.createElement("div");
    usesEl.className = "tree-uses";
    usesEl.textContent = uses ? `Uses: ${uses}` : "";

    const descEl = document.createElement("div");
    descEl.className = "tree-desc";
    descEl.textContent = desc;

    li.appendChild(nameEl);
    li.appendChild(familyEl);
    if (uses) li.appendChild(usesEl);
    if (desc) li.appendChild(descEl);

    if (imageUrl) {
      const imgEl = document.createElement("img");
      imgEl.src = imageUrl;
      imgEl.alt = species;
      imgEl.style.maxWidth = "200px";
      imgEl.style.display = "block";
      imgEl.style.marginTop = "0.5rem";
      li.appendChild(imgEl);
    }

    listEl.appendChild(li);

    // ---- Map marker ----
    if (lat != null && lng != null) {
      const marker = L.marker([lat, lng]);
      const popupHtml = `
        <strong>${species}</strong><br/>
        ${family}<br/>
        ${uses ? `<em>${uses}</em><br/>` : ""}
      `;
      marker.bindPopup(popupHtml);
      marker.addTo(treeLayer);
    }
  });
}

// Kick off data loading when page loads
document.addEventListener("DOMContentLoaded", () => {
  loadTreesFromAirtable();
});
