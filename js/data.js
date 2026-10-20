/* data.js: shared by every page.
   Loads data.json, then provides the helpers the pages use: money and currency, Wikipedia photos,
   the photo gallery dialog, season helpers, and the saved budget and itinerary (kept in localStorage,
   so they follow you from page to page).
   Live data: exchange rates (Frankfurter), photos (Wikipedia). If they fail, the pages still work with fallbacks. */

const $ = (id) => document.getElementById(id);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const GROUPS = ["Luzon", "Visayas", "Mindanao"];
const REGION_CUR = { US: "USD", GB: "GBP", AU: "AUD", CA: "CAD", NZ: "NZD", JP: "JPY", KR: "KRW", CN: "CNY", HK: "HKD", SG: "SGD", MY: "MYR", TH: "THB", ID: "IDR", IN: "INR", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", TR: "TRY", IL: "ILS", ZA: "ZAR", BR: "BRL", MX: "MXN", PH: "PHP",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR", PT: "EUR", FI: "EUR", GR: "EUR" };

let D = null;
const S = { cur: "USD", rate: 0.0172, rates: {}, live: false, rateDate: "" };
const nowMonth = new Date().getMonth() + 1;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } };
const recall = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };

/* ---------- Money and currency ---------- */
const moneyHooks = [];
const peso = (n) => "₱" + Math.round(n).toLocaleString("en-PH");
function fmtCur(php) {
  const v = php * S.rate;
  const big = Math.abs(v) >= 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: S.cur, minimumFractionDigits: big ? 0 : 2, maximumFractionDigits: big ? 0 : 2 }).format(v);
  } catch (e) { return S.cur + " " + Math.round(v); }
}
function moneyInner(a, b) {
  const range = b != null && b !== a;
  const p = range ? peso(a) + "-" + peso(b).slice(1) : peso(a);
  if (S.cur === "PHP") return p;
  return p + " <small>(about " + (range ? fmtCur(a) + "-" + fmtCur(b) : fmtCur(a)) + ")</small>";
}
/* Any element with class "money" is re-priced when the currency changes. */
const money = (a, b) => `<span class="money" data-a="${a}"${b != null ? ` data-b="${b}"` : ""}>${moneyInner(a, b)}</span>`;
function refreshMoney() {
  document.querySelectorAll(".money").forEach((el) => { el.innerHTML = moneyInner(+el.dataset.a, el.dataset.b != null ? +el.dataset.b : null); });
  moneyHooks.forEach((fn) => fn());   /* pages add their own re-draw here, for example the budget total */
  rateNote();
}
function rateNote() {
  if (!$("curNote")) return;
  $("curNote").textContent = S.cur === "PHP" ? "Showing pesos only."
    : S.live ? `Live rate from Frankfurter${S.rateDate ? " (" + S.rateDate + ")" : ""}. Prices show pesos and ${S.cur}.`
    : `Approximate rate (offline). Prices show pesos and ${S.cur}.`;
}
function guessCurrency() {
  const reg = ((navigator.language || "en-US").split("-")[1] || "").toUpperCase();
  return REGION_CUR[reg] || "USD";
}
function setupCurrency() {
  D.currencies.forEach((c) => { S.rates[c.c] = c.r; });
  const saved = recall("ph_cur");
  S.cur = saved && S.rates[saved] ? saved : (S.rates[guessCurrency()] ? guessCurrency() : "USD");
  S.rate = S.rates[S.cur];
  if (!$("cur")) return;   /* this page has no currency box */
  $("cur").innerHTML = D.currencies.map((c) => {
    const label = c.c === "PHP" ? "Philippines (pesos, no conversion)" : c.c === "EUR" ? "Euro countries (EUR)" : `${c.ctry} (${c.c})`;
    return `<option value="${c.c}">${esc(label)}</option>`;
  }).join("");
  $("cur").value = S.cur;
  $("cur").addEventListener("change", () => {
    S.cur = $("cur").value; S.rate = S.rates[S.cur] || 1; store("ph_cur", S.cur); refreshMoney();
  });
  rateNote();
}
async function loadRate() {
  const urls = ["https://api.frankfurter.dev/v1/latest?base=PHP", "https://api.frankfurter.app/latest?from=PHP"];
  for (const u of urls) {
    try {
      const r = await (await fetch(u)).json();
      if (r && r.rates) {
        Object.keys(r.rates).forEach((c) => { S.rates[c] = r.rates[c]; });
        S.live = true; S.rateDate = r.date || "";
        break;
      }
    } catch (e) { /* try the next one, or keep fallback rates */ }
  }
  S.rate = S.rates[S.cur] || S.rate;
  refreshMoney();
}

/* ---------- Photos from Wikipedia, with an emoji fallback ---------- */
const photoCache = {};
function getPhoto(title) {
  if (!photoCache[title]) {
    photoCache[title] = (async () => {
      try {
        const r = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title));
        if (!r.ok) return null;
        const j = await r.json();
        return j.thumbnail ? j.thumbnail.source : null;
      } catch (e) { return null; }
    })();
  }
  return photoCache[title];
}
/* If an item has "img" in data.json (a file in the images/ folder, or a full web address), that picture is used.
   If it is missing or fails to load, the Wikipedia photo is used, then the emoji. */
const photoHTML = (item, alt, plain) => `<div class="ph" data-wiki="${esc(item.wiki || "")}" data-img="${esc(item.img || "")}"><span aria-hidden="true">${plain ? "" : item.emoji || "🌴"}</span><img alt="${esc(alt)}" loading="lazy"></div>`;
function hydratePhotos(root) {
  root.querySelectorAll(".ph[data-wiki]").forEach(async (box) => {
    const title = box.dataset.wiki, own = box.dataset.img;
    box.removeAttribute("data-wiki"); box.removeAttribute("data-img");
    const img = box.querySelector("img");
    const show = () => { img.classList.add("loaded"); const s = box.querySelector("span"); if (s) s.style.visibility = "hidden"; };
    const fromWiki = async () => {
      if (!title) return;
      const src = await getPhoto(title);
      if (!src) return;
      img.onload = show;
      img.onerror = () => { if (img.src !== src) img.src = src; };
      img.src = src.replace(/\/\d+px-/, "/500px-");
    };
    if (own) {
      img.onload = show;
      img.onerror = () => {
        /* a bare file name like "habhab.jpg" is also looked for in the images/ folder before using Wikipedia */
        if (!/^(https?:|\/|images\/)/.test(own) && !img.dataset.retry) { img.dataset.retry = 1; img.src = "images/" + own; return; }
        img.onerror = null; fromWiki();
      };
      img.src = own;
    } else await fromWiki();
  });
}

/* ---------- Season helpers ---------- */
const MIDX = Object.fromEntries(MONTHS.map((m, i) => [m, i + 1]));
function bestMonths(best) {
  const [a, b] = best.split("-").map((s) => MIDX[s.trim()]);
  const out = []; let m = a, guard = 0;
  while (guard++ < 13) { out.push(m); if (m === b) break; m = (m % 12) + 1; }
  return out;
}

/* ---------- Photo gallery dialog (used by Destinations and Festivals) ---------- */
const PD = { d: null, imgs: [], i: 0, sel: new Set(), added: false };
const mediaCache = {};
const fileKey = (u) => ((u || "").match(/\/([^\/]+\.jpe?g)(?:\/|$)/i) || [])[1] || u;
const bigger = (u) => u.replace(/\/\d+px-/, "/960px-");

function getGallery(title) {
  if (!mediaCache[title]) {
    mediaCache[title] = (async () => {
      try {
        const r = await fetch("https://en.wikipedia.org/api/rest_v1/page/media-list/" + encodeURIComponent(title));
        if (!r.ok) return [];
        const j = await r.json();
        return (j.items || [])
          .filter((i) => i.type === "image" && i.showInGallery !== false && /\.jpe?g$/i.test(i.title || "") && i.srcset && i.srcset.length)
          .map((i) => { const s = i.srcset[0].src; const small = s.startsWith("//") ? "https:" + s : s; return { small, big: bigger(small), alt: i.title.replace(/_/g, " ").replace(/\.jpe?g$/i, "") }; });
      } catch (e) { return []; }
    })();
  }
  return mediaCache[title];
}

function showImg(i) {
  const n = PD.imgs.length; if (!n) return;
  PD.i = (i + n) % n;
  const im = PD.imgs[PD.i], main = $("pdMain");
  main.classList.remove("loaded");
  main.onload = () => main.classList.add("loaded");
  main.onerror = () => { if (main.src !== im.small) main.src = im.small; };
  main.src = im.big; main.alt = im.alt;
  $("pdCount").textContent = `${PD.i + 1} of ${n}`;
  const th = [...$("pdThumbs").children];
  th.forEach((b, k) => b.setAttribute("aria-current", k === PD.i));
  if (th[PD.i]) th[PD.i].scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
}

/* Wire up the shared parts of the dialog: close, thumbnails, arrows, arrow keys and swipe.
   A page can pass { click(e, dlg) } to handle its own buttons inside the dialog. */
function setupGalleryDialog(extra) {
  const dlg = $("placeDlg");
  if (!dlg) return;
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg || e.target.closest("[data-close]")) return dlg.close();   /* backdrop or X */
    const t = e.target.closest("#pdThumbs button");
    if (t) return showImg([...t.parentNode.children].indexOf(t));
    if (e.target.closest(".pd-nav.prev")) return showImg(PD.i - 1);
    if (e.target.closest(".pd-nav.next")) return showImg(PD.i + 1);
    if (extra && extra.click) extra.click(e, dlg);
  });
  dlg.addEventListener("keydown", (e) => {   /* arrow keys flip through the photos */
    if (e.target.matches("input[type=checkbox]")) return;
    if (e.key === "ArrowLeft") showImg(PD.i - 1); else if (e.key === "ArrowRight") showImg(PD.i + 1);
  });
  let x0 = null;   /* swipe on touch screens */
  dlg.addEventListener("touchstart", (e) => { x0 = e.target.closest("#pdStage") ? e.touches[0].clientX : null; }, { passive: true });
  dlg.addEventListener("touchend", (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 45) showImg(PD.i + (dx < 0 ? 1 : -1));
  });
  dlg.addEventListener("close", () => { PD.d = null; });
}

/* ---------- Saved budget (shared by Destinations and the Budget planner) ---------- */
const DEFAULT_B = () => ({ pax: 2, level: "mid", buffer: 10, transfer: D.transfer.mid, places: {}, extras: [] });
let B = null;
const openIds = new Set();
const saveB = () => store("ph_budget", B);

function ensurePlace(d) {
  let p = B.places[d.id];
  if (!p) p = B.places[d.id] = { on: false, days: 2, dayCost: d.cost[B.level], acts: {} };
  d.acts.forEach((a, i) => { if (!p.acts[i]) p.acts[i] = { on: false, c: a.c }; });
  return p;
}

function initBudgetState() {
  B = recall("ph_budget") || DEFAULT_B();
  if (!B.places || !B.extras) B = DEFAULT_B();
  D.destinations.forEach(ensurePlace);
}

/* ---------- Saved itinerary (built on the home page, used by the map and the budget planner) ---------- */
function savePlan(p) {
  store("ph_plan", { days: p.days, pax: p.pax, lvl: p.lvl, month: p.month, picked: p.picked, stops: p.stops.map((s) => ({ id: s.d.id, n: s.n, first: s.first })) });
}
function loadPlan() {
  const p = recall("ph_plan");
  if (!p || !p.stops || !p.stops.length || !D) return null;
  const stops = p.stops.map((s) => {
    const d = D.destinations.find((x) => x.id === s.id);
    return d ? { d, n: s.n, first: s.first, acts: d.acts.slice().sort((a, b) => a.c - b.c).slice(0, Math.min(s.n, d.acts.length)) } : null;
  });
  return stops.includes(null) ? null : { ...p, stops };
}

/* ---------- Load data.json ---------- */
const ready = (async () => {
  D = await (await fetch("data.json")).json();
  setupCurrency();
  initBudgetState();
  if ($("cur")) loadRate();
  return D;
})();
ready.catch(() => { const e = $("loadError"); if (e) e.hidden = false; });
const onReady = (fn) => ready.then(fn, () => {});   /* run fn once data.json is loaded */
