/* destinations.js: Explore the places. Cards, map, and the place details dialog with photos. */

let lastPlan = null;   /* the itinerary from the home page, used to draw the route on the map */

/* ---------- Explore ---------- */
["exTag", "exGroup"].forEach((id) => $(id).addEventListener("change", renderExplore));

function renderExplore() {
  const tag = $("exTag").value, group = $("exGroup").value;
  const list = D.destinations.filter((d) => (tag === "all" || d.tags.includes(tag)) && (group === "all" || d.group === group));
  $("exGrid").innerHTML = list.length ? list.map((d) => {
    const inBudget = B.places[d.id] && B.places[d.id].on;
    return `<article class="pcard clickable">
    ${photoHTML(d, d.name, true)}
    <div class="body">
      <h3><button class="open-btn" type="button" data-open="${d.id}" aria-haspopup="dialog">${esc(d.name)}</button></h3>
      <p class="meta">${d.group}, best ${d.best}, from ${money(d.cost.budget)} a day</p>
      <div>${bestMonths(d.best).includes(nowMonth) ? '<span class="tag now">Good this month</span>' : ""}${d.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
      <p>${esc(d.blurb)}</p>
      <p class="meta"><b>Eat:</b> ${esc(d.eat)}<br><b>Getting there:</b> ${esc(d.gateway)}</p>
      <div class="actions">
        <button class="ghost wxBtn" data-id="${d.id}" type="button">Check weather now</button>
        <button class="ghost addBtn ${inBudget ? "on" : ""}" data-id="${d.id}" type="button" aria-pressed="${!!inBudget}">${inBudget ? "In your budget" : "Add to budget"}</button>
      </div>
      <p class="wx" id="wx-${d.id}" aria-live="polite"></p>
    </div></article>`;
  }).join("") : `<p>No places match these filters. Try a different interest or region.</p>`;
  hydratePhotos($("exGrid"));
  if (exView === "map") drawMap();
  $("exGrid").querySelectorAll(".open-btn").forEach((b) => b.addEventListener("click", () => openPlace(b.dataset.open)));
  $("exGrid").querySelectorAll(".wxBtn").forEach((b) => b.addEventListener("click", () => weather(b.dataset.id)));
  $("exGrid").querySelectorAll(".addBtn").forEach((b) => b.addEventListener("click", () => {
    const d = D.destinations.find((x) => x.id === b.dataset.id);
    const p = ensurePlace(d); p.on = !p.on;
    saveB();
    syncAddBtn(d.id);
  }));
}
/* Keep the card's "Add to budget" button in step with the budget, without re-drawing the grid. */
function syncAddBtn(id) {
  const b = document.querySelector(`#exGrid .addBtn[data-id="${id}"]`), on = !!(B.places[id] && B.places[id].on);
  if (!b) return;
  b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); b.textContent = on ? "In your budget" : "Add to budget";
}

const WX = (c) => c === 0 ? "Clear" : c <= 3 ? "Partly cloudy" : c < 50 ? "Fog" : c < 70 ? "Rain" : c >= 80 && c < 90 ? "Showers" : c >= 95 ? "Thunderstorm" : "Cloudy";

/* ---------- Map (Leaflet + OpenStreetMap, loaded only when the Map view is opened) ---------- */
const PH_BOUNDS = [[4.5, 116.8], [21.3, 127]], PH_PAD = [[3, 114], [22.8, 129.5]];
/* Pin colour by region, so the three parts of the country are easy to tell apart */
const REGION_COLOR = { Luzon: "#d6336c", Visayas: "#f08c00", Mindanao: "#7048e8" };
/* Fill a map photo (hover card or popup) from the place's Wikipedia page. The emoji shows until it loads. */
async function mapPhoto(img, d, w) {
  if (!img || img.dataset.done) return;
  img.dataset.done = "1";
  const src = await getPhoto(d.wiki);
  if (!src) return;
  img.onload = () => img.classList.add("loaded");
  img.alt = d.name;
  img.src = src.replace(/\/\d+px-/, "/" + w + "px-");
}
let exView = "grid", LMap = null, LLayer = null, leafletState = "idle";
function loadLeaflet() {
  if (window.L) return Promise.resolve(true);
  if (leafletState === "failed") return Promise.resolve(false);
  return new Promise((res) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    const js = document.createElement("script"); js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    js.onload = () => res(!!window.L); js.onerror = () => { leafletState = "failed"; res(false); };
    document.head.append(css, js);
  });
}
function setExView(v) {
  exView = v;
  document.querySelectorAll(".seg button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === v));
  $("exMapWrap").hidden = v !== "map";
  $("exGrid").hidden = v === "map";
  if (v === "map") drawMap();
}
function km(a, b) {
  const r = (x) => x * Math.PI / 180, dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
async function drawMap() {
  $("mapRouteWrap").hidden = !lastPlan;
  if (!lastPlan) $("mapRoute").checked = false;
  $("mapNote").textContent = "Loading the map...";
  const ok = await loadLeaflet();
  if (exView !== "map") return;
  if (!ok) { $("mapNote").textContent = "The map needs an internet connection to load. The cards still work offline."; return; }
  if (!LMap) {
    LMap = L.map("exMap", { scrollWheelZoom: false, zoomSnap: 0.5, attributionControl: false, maxBounds: PH_PAD, maxBoundsViscosity: 1 });
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(LMap);   /* bottom left, so it never sits under the Pause motion button */
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' }).addTo(LMap);
    LLayer = L.layerGroup().addTo(LMap);
    LMap.on("popupopen", (e) => {
      const el = e.popup.getElement(); if (!el) return;
      el.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => openPlace(b.dataset.open)));
    });
  }
  LMap.invalidateSize();
  LMap.setMinZoom(LMap.getBoundsZoom(PH_BOUNDS));   /* can't zoom out past the Philippines */
  LLayer.clearLayers();
  const tag = $("exTag").value, group = $("exGroup").value;
  const list = D.destinations.filter((d) => (tag === "all" || d.tags.includes(tag)) && (group === "all" || d.group === group));
  const route = $("mapRoute").checked && lastPlan ? lastPlan.stops.map((x) => x.d) : [];
  const shown = new Map(list.map((d) => [d.id, d]));
  route.forEach((d) => shown.set(d.id, d));
  const pts = [];
  shown.forEach((d) => {
    const n = route.findIndex((x) => x.id === d.id) + 1;
    const color = REGION_COLOR[d.group] || "#0a7e8c";
    const icon = L.divIcon({
      className: "pin-wrap",
      html: `<span class="pin${n ? " num" : ""}" style="--c:${color}"><b>${n || d.emoji}</b></span>`,
      iconSize: [34, 43], iconAnchor: [17, 43], popupAnchor: [0, -40], tooltipAnchor: [0, -40],
    });
    const m = L.marker([d.lat, d.lon], { icon, alt: d.name, keyboard: true, riseOnHover: true }).addTo(LLayer);
    const label = () => { const el = m.getElement(); if (el) { el.setAttribute("aria-label", d.name); el.setAttribute("role", "button"); } };
    label(); m.on("add", label);   /* the icon only exists once the map is showing */
    /* hover (mouse): a small photo card */
    m.bindTooltip(`<div class="tip-ph"><span aria-hidden="true">${d.emoji}</span><img alt=""></div><div class="tip-txt"><b>${esc(d.name)}</b><i>${esc(d.group)}, best ${esc(d.best)}</i></div>`, { direction: "top", opacity: 1, className: "map-tip" });
    m.on("tooltipopen", (e) => { if (m.isPopupOpen()) { m.closeTooltip(); return; } mapPhoto(e.tooltip.getElement().querySelector("img"), d, 320); });
    /* click or tap: the popup, with a bigger photo (touch screens have no hover) */
    m.bindPopup(`<div class="map-pop"><div class="pop-ph"><span aria-hidden="true">${d.emoji}</span><img alt=""></div><b>${esc(d.name)}</b><span>${esc(d.group)}, best ${esc(d.best)}</span><p>${esc(d.blurb)}</p><button type="button" class="primary" data-open="${d.id}">Photos, activities and food</button></div>`, { maxWidth: 260, minWidth: 240 });
    m.on("popupopen", (e) => { m.closeTooltip(); mapPhoto(e.popup.getElement().querySelector(".pop-ph img"), d, 480); });
    pts.push([d.lat, d.lon]);
  });
  let note = list.length ? `${list.length} place${list.length > 1 ? "s" : ""} shown. Colours show the region. Hover a pin for a photo, click it for details.` : "No places match these filters.";
  if (route.length > 1) {
    L.polyline(route.map((d) => [d.lat, d.lon]), { color: "#f6a81c", weight: 4, opacity: .95, dashArray: "2 9", lineCap: "round" }).addTo(LLayer);
    const legs = route.slice(1).map((d, i) => `${route[i].name.split(",")[0]} to ${d.name.split(",")[0]}: about ${Math.round(km(route[i], d))} km`);
    note = "Route in order: " + legs.join("; ") + ". These are straight-line distances, so real trips take longer. See the Getting around page for fares and ways to travel.";
  }
  $("mapNote").textContent = note;
  if (route.length > 1) LMap.fitBounds(route.map((d) => [d.lat, d.lon]), { padding: [60, 60], maxZoom: 9 });
  else LMap.fitBounds(PH_BOUNDS, { padding: [10, 10] });
}
document.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => setExView(b.dataset.v)));
$("mapRoute").addEventListener("change", drawMap);

async function weather(id, target) {
  const d = D.destinations.find((x) => x.id === id), out = target || $("wx-" + id);
  out.textContent = "Loading...";
  try {
    const r = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${d.lat}&longitude=${d.lon}&current=temperature_2m,weather_code`)).json();
    out.textContent = `${Math.round(r.current.temperature_2m)}°C, ${WX(r.current.weather_code)} right now`;
  } catch (e) {
    out.textContent = "Weather is not available. Check your internet connection and try again.";
  }
}

/* ---------- Place details: click a card ---------- */
/* Opens a dialog with more photos (from Wikipedia), things to do with prices, local food and weather. */
const MENU_GROUPS = [
  ["special", "Specialties of this place"],
  ["grill", "Inihaw (grilled)"],
  ["street", "Street food"],
  ["soup", "Soups and everyday meals"],
];
const MENU_KEY = { street: "street", grill: "grill", special: "special", soup: "soup" };
function menuHTML(d) {
  const m = d.menu || [];
  return MENU_GROUPS.map(([k, label]) => {
    const items = m.filter((x) => x.t === k);
    if (!items.length) return "";
    return `<h4 class="pd-mh">${label}</h4><ul class="pd-menu">${items.map((x) => `<li${x.img ? ' class="has-th"' : ""}>${x.img ? `<img class="th" src="${esc(x.img)}" alt="" loading="lazy" onerror="this.remove()">` : ""}<div><b>${esc(x.n)}</b><span>${esc(x.d)}</span></div><span class="pr">${money(x.p[0], x.p[1])}</span></li>`).join("")}</ul>`;
  }).join("");
}

function detailHTML(d) {
  const foods = D.foods.filter((f) => (d.foodNames || []).includes(f.name));
  const p = ensurePlace(d);
  return `<div class="pd">
    <button class="pd-close" type="button" data-close aria-label="Close">×</button>
    <div class="pd-scroll">
      <div class="pd-gallery">
        <div class="pd-stage" id="pdStage"><img id="pdMain" alt=""></div>
        <button class="pd-nav prev" type="button" aria-label="Previous photo" hidden>‹</button>
        <button class="pd-nav next" type="button" aria-label="Next photo" hidden>›</button>
        <p class="pd-count" id="pdCount" aria-live="polite">Loading photos...</p>
      </div>
      <div class="pd-thumbs" id="pdThumbs" hidden></div>
      <div class="pd-body">
        <h2 id="pdTitle">${esc(d.name)}</h2>
        <p class="meta">${d.group}, best ${d.best}, from ${money(d.cost.budget)} a day</p>
        <div>${bestMonths(d.best).includes(nowMonth) ? '<span class="tag now">Good this month</span>' : ""}${d.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
        <p>${esc(d.blurb)}</p>
        <p class="meta"><b>Getting there:</b> ${esc(d.gateway)}</p>

        <h3>Things to do</h3>
        <div class="pd-things">${d.acts.map((a, i) => {
          const m = a.n.match(/^(.*?)\s*\((.*)\)\s*$/), title = m ? m[1] : a.n, sub = m ? m[2] : "";
          return `<figure class="pd-act s${i % 6}"><div class="shape" style="background-image:url('images/activities/${d.id}-${i}.svg')"><img alt="" loading="lazy"></div><figcaption><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</figcaption></figure>`;
        }).join("")}</div>
        <p class="meta pd-note">Choose and price your activities in the budget calculator.</p>

        <h3>What to eat</h3>
        <p><b>Local favorites:</b> ${esc(d.eat)}</p>
        ${foods.length ? `<div class="pd-foods">${foods.map((f) => `<div class="pd-food">${photoHTML(f, f.name, true)}<div class="txt"><b>${esc(f.name)}</b>${esc(f.about)}<br><span class="meta">${money(f.price[0], f.price[1])}</span></div></div>`).join("")}</div>` : ""}
        ${menuHTML(d)}

        <div class="pd-actions">
          <button class="primary" type="button" id="pdAdd">${p.on ? "Update my budget" : "Add to my budget"}</button>
          <button class="ghost" type="button" id="pdWx">Check weather now</button>
          <a class="ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lon}">Open in Maps</a>
        </div>
        <p class="wx" id="pdWxOut" aria-live="polite"></p>
        <p class="meta">Photos from Wikipedia and Wikimedia Commons. Prices are rough estimates per person.</p>
      </div>
    </div>
  </div>`;
}

/* Each activity gets its own picture: your "img", then its Wikipedia page, then a different photo of the place */
async function hydrateActs(d, dlg) {
  const tiles = [...dlg.querySelectorAll(".pd-act")];
  const own = await Promise.all(d.acts.map((a) => (a.img ? a.img : a.wiki ? getPhoto(a.wiki) : null)));
  const [lead, more] = await Promise.all([getPhoto(d.wiki), getGallery(d.wiki)]);
  if (PD.d !== d || !dlg.open) return;
  const used = new Set(own.filter(Boolean).map(fileKey));
  const pool = more.filter((im) => !used.has(fileKey(im.small)));
  let k = 0;
  tiles.forEach((t, i) => {
    let src = own[i];
    if (!src) { const im = pool.length ? pool[k++ % pool.length] : lead ? { small: lead } : null; src = im && im.small; }
    if (!src) return;
    const img = t.querySelector("img");
    img.onload = () => t.classList.add("has-img");
    img.onerror = () => { img.removeAttribute("src"); };
    img.src = src.replace(/\/\d+px-/, "/640px-");
    img.alt = d.acts[i].n;
  });
}

async function openPlace(id) {
  const d = D.destinations.find((x) => x.id === id), dlg = $("placeDlg"), p = ensurePlace(d);
  PD.d = d; PD.imgs = []; PD.i = 0; PD.added = false;
  PD.sel = new Set(d.acts.map((a, i) => i).filter((i) => (p.on ? p.acts[i].on : i < 2)));
  dlg.innerHTML = detailHTML(d);
  hydratePhotos(dlg);
  hydrateActs(d, dlg);
  dlg.showModal();
  dlg.querySelector(".pd-scroll").scrollTop = 0;

  const [lead, more] = await Promise.all([getPhoto(d.wiki), getGallery(d.wiki)]);
  if (PD.d !== d || !dlg.open) return;   /* closed or switched while loading */
  const seen = new Set(), imgs = [];
  const add = (im) => { const k = fileKey(im.small); if (!seen.has(k)) { seen.add(k); imgs.push(im); } };
  if (lead) add({ small: lead, big: bigger(lead), alt: d.name });
  more.forEach(add);
  PD.imgs = imgs.slice(0, 9);
  if (!PD.imgs.length) { $("pdCount").textContent = "Photos need an internet connection"; return; }
  $("pdThumbs").innerHTML = PD.imgs.map((im, k) => `<button type="button" aria-label="Show photo ${k + 1}"><img src="${im.small}" alt="" loading="lazy"></button>`).join("");
  $("pdThumbs").hidden = PD.imgs.length < 2;
  dlg.querySelectorAll(".pd-nav").forEach((b) => { b.hidden = PD.imgs.length < 2; });
  showImg(0);
}

onReady(() => {
  lastPlan = loadPlan();
  $("exTag").innerHTML = `<option value="all">All</option>` + D.tags.map((t) => `<option value="${t}">${cap(t)}</option>`).join("");
  setupGalleryDialog({
    click(e, dlg) {
      if (e.target.closest("#pdWx")) return weather(PD.d.id, $("pdWxOut"));
      if (e.target.closest("#pdAdd")) {
        if (PD.added) { location.href = "budget-planner.html"; return; }
        const d = PD.d, p = ensurePlace(d);
        p.on = true; d.acts.forEach((a, i) => { p.acts[i].on = PD.sel.has(i); });
        saveB(); syncAddBtn(d.id);
        PD.added = true; $("pdAdd").textContent = "Added. Go to the budget planner";
      }
    },
  });
  renderExplore();

  /* links from other pages: ?view=map, ?open=place-id */
  const q = new URLSearchParams(location.search);
  if (recall("ph_map_route") && lastPlan) $("mapRoute").checked = true;
  store("ph_map_route", false);
  if (q.get("view") === "map") setExView("map");
  const id = q.get("open");
  if (id && D.destinations.some((d) => d.id === id)) openPlace(id);
});
