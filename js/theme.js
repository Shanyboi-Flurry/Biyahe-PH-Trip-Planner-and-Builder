/* theme.js: the look and feel shared by every page.
   Burger menu, the waving flag, the hero background (video on the home page, photos on the other pages),
   the underwater reef and bubbles, and the "Pause motion" button. */

/* ---------- "Tara na! Let's go." : waving Philippine flag on a stick, with letters that wave along ---------- */
function setupHello() {
  const txt = $("helloTxt"), flag = $("phFlag");
  if (!txt || !flag) return;
  /* letters: each one hops a little later than the one before, so a wave runs through the words */
  const words = txt.textContent.split(" ");
  let i = 0;
  txt.innerHTML = words.map((w) => `<span class="w">${[...w].map((c) => `<span class="ch" style="--i:${i++}">${esc(c)}</span>`).join("")}</span>`).join(" ");
  /* the flag: an SVG drawn in code, cut into thin slices that ripple one after another like cloth in the wind */
  const star = (cx, cy, r) => { let d = ""; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.4 : r; d += (k ? "L" : "M") + (cx + rr * Math.cos(a)).toFixed(2) + " " + (cy + rr * Math.sin(a)).toFixed(2); } return d + "Z"; };
  let rays = "";
  for (let k = 0; k < 8; k++) {
    const a = k * 45;
    rays += `<g transform="rotate(${a} 17 30)"><path d="M17 17 L18.6 24 L15.4 24Z"/><path d="M17 20 L17.8 24 L16.2 24Z" transform="rotate(-14 17 30)"/><path d="M17 20 L17.8 24 L16.2 24Z" transform="rotate(14 17 30)"/></g>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="56" viewBox="0 0 120 60" preserveAspectRatio="none">
    <rect width="120" height="30" fill="#0038A8"/><rect y="30" width="120" height="30" fill="#CE1126"/>
    <path d="M0 0L52 30L0 60Z" fill="#fff"/>
    <g fill="#FCD116"><circle cx="17" cy="30" r="5.2"/>${rays}<path d="${star(5, 8, 3.6)}"/><path d="${star(5, 52, 3.6)}"/><path d="${star(45, 30, 3.6)}"/></g></svg>`;
  flag.style.setProperty("--flag", `url('data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27")}')`);
  const N = 14, W = 56;
  flag.innerHTML = Array.from({ length: N }, (_, k) => `<i style="--k:${k};--a:${(0.4 + k / N * 2.2).toFixed(2)}px;background-size:${W}px 28px;background-position:${-(k * W / N)}px 0"></i>`).join("");
}

/* ---------- Burger menu: opens on hover (mouse), tap (touch) or keyboard focus ---------- */
(function () {
  const navMenu = document.getElementById("navMenu"), burger = document.getElementById("burger");
  if (!navMenu || !burger) return;
  const setNav = (open) => { navMenu.classList.toggle("open", open); burger.setAttribute("aria-expanded", open); };
  navMenu.addEventListener("mouseenter", () => { if (matchMedia("(hover: hover)").matches) setNav(true); });
  navMenu.addEventListener("mouseleave", () => setNav(false));
  burger.addEventListener("click", () => setNav(!navMenu.classList.contains("open")));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setNav(false); });
  document.addEventListener("click", (e) => { if (!navMenu.contains(e.target)) setNav(false); });
})();

/* ---------- Hero background: video first, photo slideshow as fallback ---------- */
const HERO = { paused: false, mode: "", vi: 0, bad: new Set(), si: 0, slides: null, timer: null };
/* Show "El Nido" with "PALAWAN, PHILIPPINES" under it, and pop it in whenever the place changes.
   Give a clip an optional "region" in data.json, or write the place as "Name, Region". */
let capKey = "";
function heroCaption(title, region) {
  const t = (title || "").trim();
  let name = t, reg = region;
  if (reg == null) { const i = t.indexOf(","); if (i > 0) { name = t.slice(0, i).trim(); reg = t.slice(i + 1).trim(); } }
  const sub = /philippines/i.test(reg || "") ? reg : [reg, "Philippines"].filter(Boolean).join(", ");
  const key = name + "|" + sub;
  if (!name || key === capKey) return;
  capKey = key;
  $("plName").textContent = name; $("plRegion").textContent = sub;
  const box = document.querySelector(".place-label");
  box.classList.remove("pop"); void box.offsetWidth; box.classList.add("pop");   /* restart the pop animation */
}

/* Try several Wikimedia sizes (standard widths only) and use the first one that loads. */
function bestImage(src) {
  const sizes = [1280, 960];
  const tryAt = (i) => new Promise((res) => {
    if (i >= sizes.length) return res(src);
    const url = src.replace(/\/\d+px-/, "/" + sizes[i] + "px-");
    const im = new Image();
    im.onload = () => res(url);
    im.onerror = () => res(tryAt(i + 1));
    im.src = url;
  });
  return tryAt(0);
}

/* Two video layers take turns. The next clip is loaded in the background while the current one plays,
   then the two crossfade just before the current clip ends, so there is no black gap or jump. */
const FADE_AT = 1.8;   /* seconds before the end when the crossfade starts */
HERO.vids = [$("heroVideo"), (() => { const v = $("heroVideo").cloneNode(false); v.id = "heroVideo2"; $("heroVideo").after(v); return v; })()];
HERO.ai = 0; HERO.nextI = -1; HERO.fading = false; HERO.preparing = false;
const activeVid = () => HERO.vids[HERO.ai];

/* Load clip i into element v. Resolves true when it can play, false if the file is missing or broken. */
function loadInto(v, i) {
  const list = D.heroVideos || [];
  return new Promise((resolve) => {
    let timer;
    const done = (ok) => { clearTimeout(timer); v.removeEventListener("canplay", good); v.removeEventListener("error", fail); resolve(ok); };
    const good = () => done(true), fail = () => done(false);
    v.addEventListener("canplay", good, { once: true });
    v.addEventListener("error", fail, { once: true });
    timer = setTimeout(fail, 8000);
    v.muted = true; v.loop = false; v.src = list[i].src; v.load();
  });
}
/* Get the next working clip ready on the standby layer */
async function prepareNext() {
  const n = (D.heroVideos || []).length;
  if (n < 2 || HERO.preparing) return;
  HERO.preparing = true; HERO.nextI = -1;
  const standby = HERO.vids[1 - HERO.ai];
  for (let k = 1; k < n; k++) {
    const i = (HERO.vi + k) % n;
    if (HERO.bad.has(i)) continue;
    if (await loadInto(standby, i)) { HERO.nextI = i; break; }
    HERO.bad.add(i);
  }
  HERO.preparing = false;
}
function crossfade() {
  if (HERO.fading || HERO.paused || HERO.nextI < 0) return false;
  HERO.fading = true;
  const list = D.heroVideos, cur = activeVid(), nxt = HERO.vids[1 - HERO.ai], i = HERO.nextI;
  nxt.currentTime = 0; nxt.play().catch(() => {});
  nxt.classList.add("on"); cur.classList.remove("on");
  HERO.ai = 1 - HERO.ai; HERO.vi = i; HERO.nextI = -1;
  heroCaption(list[i].place, list[i].region);
  setTimeout(() => { HERO.fading = false; cur.pause(); prepareNext(); }, 1700);
  return true;
}
/* First clip: the first one that works. Then line up the next one. */
async function startVideo() {
  const n = (D.heroVideos || []).length, v = activeVid();
  for (let i = 0; i < n; i++) {
    if (HERO.bad.has(i)) continue;
    if (await loadInto(v, i)) {
      HERO.vi = i; v.classList.add("on"); v.play().catch(() => {});
      heroCaption(D.heroVideos[i].place, D.heroVideos[i].region);
      prepareNext(); return true;
    }
    HERO.bad.add(i);
  }
  return false;
}
HERO.vids.forEach((v) => {
  v.addEventListener("timeupdate", () => { if (v === activeVid() && v.duration && v.duration - v.currentTime < FADE_AT) crossfade(); });
  v.addEventListener("ended", () => {
    if (v !== activeVid() || HERO.paused) return;
    if (!crossfade()) { v.currentTime = 0; v.play().catch(() => {}); }   /* one working clip, or the next isn't ready yet: replay */
  });
});

function showSlide(n) {
  const s = HERO.slides; if (!s || !s.length) return;
  s.forEach((el, i) => el.classList.toggle("on", i === n));
  HERO.si = n; heroCaption(s[n].dataset.place);
}
async function buildSlides() {
  if (HERO.slides) return HERO.slides.length > 0;
  const box = $("heroSlides");
  const picks = (D.heroPlaces || []).map((id) => D.destinations.find((d) => d.id === id)).filter(Boolean);
  const found = await Promise.all(picks.map(async (d) => { const s = await getPhoto(d.wiki); return s ? { d, url: await bestImage(s) } : null; }));
  HERO.slides = found.filter(Boolean).map(({ d, url }) => {
    const el = document.createElement("div");
    el.className = "slide"; el.dataset.place = d.name; el.style.backgroundImage = `url("${url}")`;
    box.appendChild(el); return el;
  });
  return HERO.slides.length > 0;
}
async function startSlides(animate) {
  if (!(await buildSlides())) return false;
  HERO.mode = "slides"; showSlide(HERO.si);
  clearInterval(HERO.timer);
  if (animate && HERO.slides.length > 1) HERO.timer = setInterval(() => showSlide((HERO.si + 1) % HERO.slides.length), 7000);
  return true;
}

async function startBg() {
  HERO.vi = 0;
  if (await startVideo()) { HERO.mode = "video"; return; }
  await startSlides(true);
}
function stopBg() {
  HERO.vids.forEach((v) => v.pause()); clearInterval(HERO.timer);
}
function setPaused(p, remember) {
  HERO.paused = p;
  const b = $("bgToggle");
  b.textContent = "Pause motion"; b.setAttribute("aria-pressed", p);
  document.querySelector(".hero-bg").classList.toggle("still", p);
  document.documentElement.classList.toggle("still", p);   /* pauses the waves, weave, bubbles, bunting and nav line too */
  reefPause(p);
  if (remember) store("ph_bg_paused", p);
  if (p) { stopBg(); return; }
  if (HERO.mode === "video") activeVid().play().catch(() => {});
  else if (HERO.mode === "slides") startSlides(true);
  else startBg();
}
async function initHero() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const save = !!(navigator.connection && navigator.connection.saveData);
  const pref = recall("ph_bg_paused");
  const startPaused = pref === null ? (reduce || save) : pref;
  $("bgToggle").addEventListener("click", () => setPaused(!HERO.paused, true));
  document.addEventListener("visibilitychange", () => {
    if (HERO.paused) return;
    if (document.hidden) stopBg(); else if (HERO.mode === "video") activeVid().play().catch(() => {}); else if (HERO.mode === "slides") startSlides(true);
  });
  if (!document.body.classList.contains("home")) HERO.mode = "slides";   /* inner pages: photos only, no video download */
  if (startPaused) { setPaused(true, false); await startSlides(false); }   /* one still photo, no video download */
  else { setPaused(false, false); }
}

/* ---------- Reef underwater page background ---------- */
/* Looks for video/reef.mp4, then reef.mp4. With no file, the animated water (light rays, caustics) still shows. */
const REEF = { ok: false };
function reefPause(p) {
  const v = $("reefVideo");
  if (!REEF.ok) return;
  if (p) v.pause(); else v.play().catch(() => {});
}
function makeBubbles() {
  const box = $("bubbles"), n = innerWidth < 700 ? 12 : 22;
  for (let i = 0; i < n; i++) {
    const b = document.createElement("i"), s = 6 + Math.random() * 20;
    b.className = "bub";
    b.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;width:${s.toFixed(0)}px;height:${s.toFixed(0)}px;animation-duration:${(9 + Math.random() * 12).toFixed(1)}s;animation-delay:-${(Math.random() * 20).toFixed(1)}s;--dx:${(Math.random() * 80 - 40).toFixed(0)}px`;
    box.appendChild(b);
  }
}
async function initReef() {
  makeBubbles();
  const save = !!(navigator.connection && navigator.connection.saveData);
  if (save) return;   /* data saver: keep the light CSS water, skip the video download */
  const v = $("reefVideo");
  for (const src of ["video/reef.mp4", "reef.mp4"]) {
    const ok = await new Promise((res) => {
      const t = setTimeout(() => res(false), 12000);
      v.onloadeddata = () => { clearTimeout(t); res(true); };
      v.onerror = () => { clearTimeout(t); res(false); };
      v.src = src; v.load();
    });
    if (ok) {
      REEF.ok = true; v.classList.add("on"); document.body.classList.add("has-reef");
      if (!HERO.paused) v.play().catch(() => {});
      return;
    }
  }
  v.removeAttribute("src"); v.load();
}
document.addEventListener("visibilitychange", () => {
  if (!REEF.ok || HERO.paused) return;
  if (document.hidden) $("reefVideo").pause(); else $("reefVideo").play().catch(() => {});
});

/* ---------- Start ---------- */
setupHello();
onReady(() => { initHero(); initReef(); });
