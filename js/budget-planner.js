/* budget-planner.js: tick places, edit prices, see the total in your currency. Saved in your browser. */

function placeHTML(d) {
  const p = ensurePlace(d), open = openIds.has(d.id);
  return `<div class="bplace ${p.on ? "on" : ""} ${open ? "open" : ""}" data-id="${d.id}">
    <div class="bhead">
      <label class="pick"><input type="checkbox" data-k="on" ${p.on ? "checked" : ""}> <span>${d.emoji} ${esc(d.name)}</span></label>
      <span class="sub-total" data-sub="${d.id}"></span>
      <button type="button" class="ghost tog" aria-expanded="${open}">${open ? "Hide details" : "Edit details"}</button>
    </div>
    <div class="inner" ${open ? "" : "hidden"}>
      <div class="rowline">
        <label>Days <input type="number" min="1" max="21" value="${p.days}" data-k="days"></label>
        <label>Stay, food and local rides per person per day (₱) <input type="number" min="0" step="50" value="${p.dayCost}" data-k="dayCost"></label>
      </div>
      <p class="meta">Activities, price per person (₱)</p>
      ${d.acts.map((a, i) => `<div class="act" data-place="${d.id}" data-ai="${i}">
        <input type="checkbox" data-k="act" data-i="${i}" ${p.acts[i].on ? "checked" : ""} aria-label="Include ${esc(a.n)}">
        <span class="nm" tabindex="0" aria-describedby="actTip">${esc(a.n)} <button type="button" class="cam" aria-label="Show a picture of ${esc(a.n)}">📷</button></span>
        <input type="number" min="0" step="50" value="${p.acts[i].c}" data-k="actc" data-i="${i}" aria-label="Price for ${esc(a.n)}">
      </div>`).join("")}
    </div></div>`;
}


/* ---------- Picture preview when you hover (or tap the camera) on an activity ---------- */
const tipEl = document.createElement("div");
tipEl.id = "actTip"; tipEl.className = "act-tip"; tipEl.setAttribute("role", "tooltip"); tipEl.hidden = true;
tipEl.innerHTML = '<div class="ph"><span aria-hidden="true">📷</span><img alt=""></div><p class="cap"></p>';
document.body.appendChild(tipEl);
let tipFor = null, tipTimer = 0;
async function actPhoto(a, d) {
  /* order: your own "img", then the activity's Wikipedia page, then the place photo */
  if (a.img) return a.img;
  const t = a.wiki && (await getPhoto(a.wiki));
  return t || (await getPhoto(d.wiki));
}
async function showActTip(row) {
  const d = D.destinations.find((x) => x.id === row.dataset.place), a = d && d.acts[+row.dataset.ai];
  if (!a) return;
  tipFor = row;
  const img = tipEl.querySelector("img"), ph = tipEl.querySelector(".ph"), sp = ph.querySelector("span");
  tipEl.querySelector(".cap").textContent = a.n + " · " + d.name;
  img.classList.remove("loaded"); img.removeAttribute("src"); img.alt = a.n; sp.style.visibility = "visible"; sp.textContent = d.emoji;
  tipEl.hidden = false; placeTip(row);
  const src = await actPhoto(a, d);
  if (tipFor !== row || !src) return;
  img.onload = () => { if (tipFor === row) { img.classList.add("loaded"); sp.style.visibility = "hidden"; } };
  img.onerror = async () => { img.onerror = null; const alt = await getPhoto(d.wiki); if (alt && tipFor === row) img.src = alt.replace(/\/\d+px-/, "/500px-"); };
  img.src = src.replace(/\/\d+px-/, "/500px-");
}
function placeTip(row) {
  const nm = row.querySelector(".nm").getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let x = Math.min(Math.max(8, nm.left), innerWidth - w - 8);
  let y = nm.top - h - 8; if (y < 8) y = nm.bottom + 8;
  tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
}
function hideActTip() { tipFor = null; tipEl.hidden = true; }
function setupActPreview() {
  const box = $("bPlaces");
  box.addEventListener("mouseover", (e) => { const nm = e.target.closest(".cam") ? null : e.target.closest(".act .nm"); if (nm) { clearTimeout(tipTimer); tipTimer = setTimeout(() => showActTip(nm.closest(".act")), 120); } });
  box.addEventListener("mouseout", (e) => { if (!e.target.closest(".cam") && e.target.closest(".act .nm")) { clearTimeout(tipTimer); hideActTip(); } });
  box.addEventListener("focusin", (e) => { const nm = e.target.closest(".cam") ? null : e.target.closest(".act .nm"); if (nm) showActTip(nm.closest(".act")); });
  box.addEventListener("focusout", (e) => { if (!e.target.closest(".cam") && e.target.closest(".act .nm")) hideActTip(); });
  /* touch screens have no hover: tap the camera to show it, tap again to hide */
  box.addEventListener("click", (e) => { const c = e.target.closest(".cam"); if (!c) return; const row = c.closest(".act"); tipFor === row ? hideActTip() : showActTip(row); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".cam")) hideActTip(); });
  window.addEventListener("scroll", hideActTip, { passive: true });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideActTip(); });
}

function rebuildBudget() {
  $("bPax").value = B.pax; $("bLevel").value = B.level; $("bBuffer").value = B.buffer; $("bTransfer").value = B.transfer;
  $("bPlaces").innerHTML = D.destinations.map(placeHTML).join("");
  renderExtras();
  updateBudget();
}

function renderExtras() {
  $("bExtras").innerHTML = B.extras.length ? B.extras.map((x, i) => `<div class="extra-row"><span class="nm">${esc(x.name)}</span><span>${money(x.amt)}</span><button class="ghost" type="button" data-rm="${i}" aria-label="Remove ${esc(x.name)}">Remove</button></div>`).join("") : `<p class="meta">Nothing added yet. Try travel insurance, a SIM card, souvenirs or a tip fund.</p>`;
  $("bExtras").querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => { B.extras.splice(+b.dataset.rm, 1); saveB(); renderExtras(); updateBudget(); }));
}

function calcBudget() {
  let stay = 0, acts = 0, n = 0, days = 0;
  const per = {};
  D.destinations.forEach((d) => {
    const p = B.places[d.id];
    if (!p || !p.on) return;
    n++; days += p.days;
    const s = p.days * p.dayCost * B.pax;
    const a = d.acts.reduce((t, x, i) => t + (p.acts[i] && p.acts[i].on ? p.acts[i].c : 0), 0) * B.pax;
    stay += s; acts += a; per[d.id] = s + a;
  });
  const transfers = Math.max(0, n - 1) * B.transfer * B.pax;
  const extras = B.extras.reduce((t, x) => t + x.amt, 0);
  const sub = stay + acts + transfers + extras;
  const buffer = sub * B.buffer / 100;
  return { stay, acts, transfers, extras, buffer, total: sub + buffer, n, days, per };
}

function updateBudget() {
  if (!D || !B) return;
  const c = calcBudget();
  D.destinations.forEach((d) => {
    const el = document.querySelector(`[data-sub="${d.id}"]`);
    if (el) el.innerHTML = c.per[d.id] != null ? money(c.per[d.id]) : "";
  });
  $("bTransferNote").textContent = c.n > 1 ? `${c.n - 1} transfer${c.n === 2 ? "" : "s"} between ${c.n} places.` : "Pick two or more places to add transfers (ferry, bus or flight).";
  if (!c.n) {
    $("bSummary").innerHTML = `<div class="sum-card"><p class="big">Your budget</p><p class="sub">Tick a place to start. You can also add places from the Destinations page, or send a plan from the home page.</p></div>`;
    return;
  }
  const parts = [
    ["Stay, food and local rides", c.stay, "#f6a81c"],
    ["Activities", c.acts, "#5cc4c4"],
    ["Transfers", c.transfers, "#ff7b9c"],
    ["Extra items", c.extras, "#b8e07a"],
    ["Buffer", c.buffer, "#ffffff"]
  ];
  $("bSummary").innerHTML = `<div class="sum-card">
    <p class="sub">${c.n} place${c.n > 1 ? "s" : ""}, ${c.days} days, ${B.pax} traveler${B.pax > 1 ? "s" : ""}</p>
    <p class="big">${money(c.total)}</p>
    <p>${money(c.total / B.pax)} per person</p>
    <p>${money(c.total / c.days)} per day for the group</p>
    <div class="stack" aria-hidden="true">${parts.map(([, v, col]) => `<i style="width:${(v / c.total * 100).toFixed(2)}%;background:${col}"></i>`).join("")}</div>
    <ul class="legend">${parts.filter((p) => p[1] > 0).map(([n, v, col]) => `<li><span class="sw" style="background:${col}"></span>${n}<b>${money(v)}</b></li>`).join("")}</ul>
    <button class="ghost" id="copyBudget" type="button">Copy summary</button>
    <button class="ghost" id="resetBudget" type="button">Start over</button>
  </div>`;
  $("copyBudget").addEventListener("click", copyBudget);
  $("resetBudget").addEventListener("click", () => { if (confirm("Clear all places, prices and extra items?")) { B = DEFAULT_B(); openIds.clear(); saveB(); rebuildBudget(); } });
}

function copyBudget() {
  const c = calcBudget();
  const cur = (v) => peso(v) + (S.cur === "PHP" ? "" : " (about " + fmtCur(v) + ")");
  const lines = ["Philippines trip budget", `${c.n} places, ${c.days} days, ${B.pax} traveler(s)`, ""];
  D.destinations.forEach((d) => { const p = B.places[d.id]; if (p && p.on) lines.push(`${d.name}: ${p.days} days, ${cur(c.per[d.id])}`); });
  lines.push("", `Transfers: ${cur(c.transfers)}`, `Extras: ${cur(c.extras)}`, `Buffer (${B.buffer}%): ${cur(c.buffer)}`, `Total: ${cur(c.total)}`, `Per person: ${cur(c.total / B.pax)}`);
  const btn = $("copyBudget");
  const done = (m) => { btn.textContent = m; setTimeout(() => { btn.textContent = "Copy summary"; }, 1800); };
  try { navigator.clipboard.writeText(lines.join("\n")).then(() => done("Copied"), () => done("Copy failed")); } catch (e) { done("Copy failed"); }
}

function setupBudgetEvents() {
  $("bPax").addEventListener("input", () => { B.pax = Math.min(12, Math.max(1, +$("bPax").value || 1)); saveB(); updateBudget(); });
  $("bBuffer").addEventListener("input", () => { B.buffer = Math.min(50, Math.max(0, +$("bBuffer").value || 0)); saveB(); updateBudget(); });
  $("bTransfer").addEventListener("input", () => { B.transfer = Math.max(0, +$("bTransfer").value || 0); saveB(); updateBudget(); });
  $("bLevel").addEventListener("change", () => {
    B.level = $("bLevel").value; B.transfer = D.transfer[B.level];
    D.destinations.forEach((d) => { ensurePlace(d).dayCost = d.cost[B.level]; });
    saveB(); rebuildBudget();
  });
  $("bPlaces").addEventListener("click", (e) => {
    const t = e.target.closest(".tog"); if (!t) return;
    const box = t.closest(".bplace"), id = box.dataset.id, open = !openIds.has(id);
    open ? openIds.add(id) : openIds.delete(id);
    box.classList.toggle("open", open); box.querySelector(".inner").hidden = !open;
    t.setAttribute("aria-expanded", open); t.textContent = open ? "Hide details" : "Edit details";
  });
  const onField = (e) => {
    const el = e.target, k = el.dataset.k; if (!k) return;
    const box = el.closest(".bplace"), d = D.destinations.find((x) => x.id === box.dataset.id), p = ensurePlace(d);
    if (k === "on") {
      p.on = el.checked; box.classList.toggle("on", p.on);
      if (p.on) { openIds.add(d.id); box.classList.add("open"); box.querySelector(".inner").hidden = false; const t = box.querySelector(".tog"); t.textContent = "Hide details"; t.setAttribute("aria-expanded", true); }
    }
    if (k === "days") p.days = Math.min(21, Math.max(1, +el.value || 1));
    if (k === "dayCost") p.dayCost = Math.max(0, +el.value || 0);
    if (k === "act") p.acts[el.dataset.i].on = el.checked;
    if (k === "actc") p.acts[el.dataset.i].c = Math.max(0, +el.value || 0);
    saveB(); updateBudget();
  };
  $("bPlaces").addEventListener("input", onField);
  $("bPlaces").addEventListener("change", (e) => { if (e.target.type === "checkbox") onField(e); });
  $("extraForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("exName").value.trim(), amt = Math.max(0, +$("exAmt").value || 0);
    if (!name) return;
    B.extras.push({ name, amt }); $("exName").value = ""; $("exAmt").value = "";
    saveB(); renderExtras(); updateBudget();
  });
}

moneyHooks.push(updateBudget);   /* re-price the total when the currency changes */
onReady(() => {
  setupBudgetEvents();
  setupActPreview();
  rebuildBudget();
});
