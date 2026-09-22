import { BUILDINGS } from "./data.js";
import { createStore } from "./store.js";

const ESTADOS = [
  { key: "sin_visitar", label: "Sin visitar" },
  { key: "nadie_en_casa", label: "Nadie en casa" },
  { key: "no_vive_nadie", label: "Vivienda vacía" },
  { key: "contactado", label: "Contactado" },
];
const ESTADO_LABEL = Object.fromEntries(ESTADOS.map((e) => [e.key, e.label]));
const COLORS = {
  sin_visitar: "#9aa0a6",
  nadie_en_casa: "#f4b400",
  no_vive_nadie: "#4285f4",
  contactado: "#34a853",
  mixto: "#a142f4",
};

let statusData = {}; // buildingId -> { unitIndex: {estado, nota, updatedAt} }
let store = null;
let markers = new Map(); // buildingId -> marker
let markerCluster = null;
let activeFilters = {
  municipios: new Set(),
  localidad: "",
  estados: new Set(),
  search: "",
};

// ---------- Map setup ----------
const map = L.map("map", { zoomControl: false }).setView([43.35, -5.7], 11);
L.control.zoom({ position: "bottomright" }).addTo(map);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

markerCluster = L.markerClusterGroup({ maxClusterRadius: 45 });
map.addLayer(markerCluster);

function unitStatus(buildingId, unitIndex) {
  const b = statusData[buildingId];
  const u = b && b[unitIndex];
  return (u && u.estado) || "sin_visitar";
}

function buildingAggregateColor(building) {
  const n = building.units.length;
  const counts = {};
  for (let i = 0; i < n; i++) {
    const st = unitStatus(building.id, i);
    counts[st] = (counts[st] || 0) + 1;
  }
  const distinctNonDefault = Object.keys(counts).filter((k) => k !== "sin_visitar");
  if (!counts.sin_visitar) {
    // todas las viviendas tienen algún estado marcado
    if (distinctNonDefault.length === 1) return COLORS[distinctNonDefault[0]];
    return COLORS.mixto;
  }
  if (counts.sin_visitar === n) return COLORS.sin_visitar;
  return COLORS.mixto;
}

function makeIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div class="marker-badge" style="background:${color}"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function buildingMatchesFilters(b) {
  if (activeFilters.municipios.size && !activeFilters.municipios.has(b.municipio)) return false;
  if (activeFilters.localidad && b.localidad !== activeFilters.localidad) return false;
  if (activeFilters.search) {
    const hay = `${b.direccion} ${b.numero} ${b.localidad}`.toLowerCase();
    if (!hay.includes(activeFilters.search.toLowerCase())) return false;
  }
  if (activeFilters.estados.size) {
    let match = false;
    for (let i = 0; i < b.units.length; i++) {
      if (activeFilters.estados.has(unitStatus(b.id, i))) { match = true; break; }
    }
    if (!match) return false;
  }
  return true;
}

function renderMarkers() {
  markerCluster.clearLayers();
  let visible = 0;
  let contactadas = 0;
  let totalUnits = 0;
  let contactedUnits = 0;

  for (const b of BUILDINGS) {
    if (b.lat == null || b.lon == null) continue;
    totalUnits += b.units.length;
    for (let i = 0; i < b.units.length; i++) {
      if (unitStatus(b.id, i) === "contactado") contactedUnits++;
    }
    if (!buildingMatchesFilters(b)) continue;
    visible++;
    const color = buildingAggregateColor(b);
    if (color === COLORS.contactado) contactadas++;
    let marker = markers.get(b.id);
    if (!marker) {
      marker = L.marker([b.lat, b.lon], { icon: makeIcon(color) });
      marker.on("click", () => openBuilding(b));
      markers.set(b.id, marker);
    } else {
      marker.setIcon(makeIcon(color));
    }
    markerCluster.addLayer(marker);
  }

  document.getElementById("statsText").textContent =
    `${visible} edificios visibles · ${contactedUnits}/${totalUnits} viviendas contactadas`;
}

// ---------- Building panel ----------
function openBuilding(b) {
  document.getElementById("buildingTitle").textContent = `${b.direccion} ${b.numero}`;
  document.getElementById("buildingSubtitle").textContent = `${b.localidad}, ${b.municipio} · ${b.units.length} vivienda(s)`;

  const list = document.getElementById("unitsList");
  list.innerHTML = "";

  b.units.forEach((unit, idx) => {
    const card = document.createElement("div");
    card.className = "unit-card";

    const head = document.createElement("div");
    head.className = "unit-card-head";
    const pisoLabel = [unit.esc && `Esc.${unit.esc}`, unit.piso, unit.letra].filter(Boolean).join(" ") || `Vivienda ${idx + 1}`;
    head.textContent = pisoLabel;
    card.appendChild(head);

    const row = document.createElement("div");
    row.className = "unit-estado-row";
    const current = unitStatus(b.id, idx);
    ESTADOS.forEach((e) => {
      const btn = document.createElement("button");
      btn.className = "estado-btn" + (current === e.key ? " active" : "");
      btn.dataset.estado = e.key;
      btn.textContent = e.label;
      btn.addEventListener("click", async () => {
        await store.setUnitStatus(b.id, idx, { estado: e.key });
        openBuilding(b); // re-render panel with new active state
        renderMarkers();
      });
      row.appendChild(btn);
    });
    card.appendChild(row);

    const noteVal = (statusData[b.id] && statusData[b.id][idx] && statusData[b.id][idx].nota) || "";
    const note = document.createElement("textarea");
    note.className = "unit-note";
    note.placeholder = "Notas (ej: volver por la tarde, tiene perro, habla asturiano...)";
    note.value = noteVal;
    let debounceTimer;
    note.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        store.setUnitStatus(b.id, idx, { nota: note.value });
      }, 600);
    });
    card.appendChild(note);

    list.appendChild(card);
  });

  showPanel("buildingPanel");
}

// ---------- Panels ----------
function showPanel(id) {
  document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}
function hidePanel(id) {
  document.getElementById(id).classList.add("hidden");
}
document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => hidePanel(btn.dataset.close));
});
document.getElementById("menuBtn").addEventListener("click", () => showPanel("filterPanel"));

// ---------- Filters UI ----------
function setupFilters() {
  const municipios = [...new Set(BUILDINGS.map((b) => b.municipio))].sort();
  const municipioWrap = document.getElementById("municipioFilters");
  municipios.forEach((m) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = m;
    chip.addEventListener("click", () => {
      if (activeFilters.municipios.has(m)) {
        activeFilters.municipios.delete(m);
        chip.classList.remove("active");
      } else {
        activeFilters.municipios.add(m);
        chip.classList.add("active");
      }
      refreshLocalidadOptions();
      renderMarkers();
    });
    municipioWrap.appendChild(chip);
  });

  const estadoWrap = document.getElementById("estadoFilters");
  ESTADOS.forEach((e) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = e.label;
    chip.addEventListener("click", () => {
      if (activeFilters.estados.has(e.key)) {
        activeFilters.estados.delete(e.key);
        chip.classList.remove("active");
      } else {
        activeFilters.estados.add(e.key);
        chip.classList.add("active");
      }
      renderMarkers();
    });
    estadoWrap.appendChild(chip);
  });

  refreshLocalidadOptions();

  document.getElementById("localidadFilter").addEventListener("change", (ev) => {
    activeFilters.localidad = ev.target.value;
    renderMarkers();
  });

  let searchDebounce;
  document.getElementById("searchInput").addEventListener("input", (ev) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      activeFilters.search = ev.target.value.trim();
      renderMarkers();
    }, 250);
  });
}

function refreshLocalidadOptions() {
  const sel = document.getElementById("localidadFilter");
  const pool = activeFilters.municipios.size
    ? BUILDINGS.filter((b) => activeFilters.municipios.has(b.municipio))
    : BUILDINGS;
  const localidades = [...new Set(pool.map((b) => b.localidad))].sort();
  const prev = sel.value;
  sel.innerHTML = '<option value="">Todas</option>';
  localidades.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l;
    opt.textContent = l;
    sel.appendChild(opt);
  });
  if (localidades.includes(prev)) sel.value = prev;
  else activeFilters.localidad = "";
}

// ---------- Geolocation ----------
document.getElementById("locateBtn").addEventListener("click", () => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 16);
      L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
        radius: 8,
        color: "#1a73e8",
        fillColor: "#1a73e8",
        fillOpacity: 0.9,
      }).addTo(map);
    },
    () => alert("No se pudo obtener tu ubicación."),
    { enableHighAccuracy: true }
  );
});

// ---------- Boot ----------
async function boot() {
  setupFilters();

  const banner = document.getElementById("syncBanner");
  store = await createStore();
  if (store.mode === "local") {
    banner.textContent = "Modo local: los cambios solo se guardan en este móvil (configura Firebase para compartir con el equipo — ver README).";
    banner.classList.remove("hidden", "ok");
  } else {
    banner.textContent = "Conectado — sincronizando en tiempo real con el equipo.";
    banner.classList.remove("hidden");
    banner.classList.add("ok");
    setTimeout(() => banner.classList.add("hidden"), 4000);
  }

  store.onChange((data) => {
    statusData = data;
    renderMarkers();
  });
}

boot();
