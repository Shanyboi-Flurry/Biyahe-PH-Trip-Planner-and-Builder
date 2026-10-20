let fMonth = nowMonth;
function renderMonthStrip() {
  const has = new Set(D.festivals.map((f) => f.month));
  $("monthStrip").innerHTML = `<button type="button" data-m="0" aria-pressed="${fMonth === 0}">All year</button>` +
    MONTHS.map((m, i) => `<button type="button" data-m="${i + 1}" class="${has.has(i + 1) ? "has" : ""}" aria-pressed="${fMonth === i + 1}" aria-label="${MONTH_NAMES[i]}${has.has(i + 1) ? ", has festivals" : ""}">${m}</button>`).join("");
  $("monthStrip").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { fMonth = +b.dataset.m; renderMonthStrip(); renderFestivals(); renderFruits(); }));
}
function renderFestivals() {
  const all = D.festivals.map((f, i) => ({ f, i })).filter(({ f }) => !fMonth || f.month === fMonth).sort((a, b) => a.f.month - b.f.month);
  $("fList").innerHTML = all.length ? all.map(({ f, i }) => `<article class="pcard clickable fcard">
    ${photoHTML(f, f.name)}
    <div class="body">
      <p class="when">${esc(f.when)}</p>
      <h3><button class="open-btn" type="button" data-fest="${i}" aria-haspopup="dialog">${esc(f.name)}</button></h3>
      <p class="meta">${esc(f.where)}</p>
      <p>${esc(f.about)}</p>
      <p class="meta"><b>Eat:</b> ${esc(f.food)}</p>
    </div></article>`).join("") : `<p>No major festival is listed for ${MONTH_NAMES[fMonth - 1]}. It can be a quieter time to travel. Check the Destinations page for places in season.</p>`;
  hydratePhotos($("fList"));
  $("fList").querySelectorAll(".open-btn").forEach((b) => b.addEventListener("click", () => openFestival(+b.dataset.fest)));
}

/* Festival details: click a festival card. Reuses the place dialog and its photo gallery (arrows, thumbnails, swipe). */
function festHTML(f) {
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
        <h2 id="pdTitle">${esc(f.name)}</h2>
        <p class="meta">${esc(f.when)}, ${esc(f.where)}</p>
        <div><span class="tag">${MONTH_NAMES[f.month - 1]}</span>${f.month === nowMonth ? '<span class="tag now">This month</span>' : ""}</div>
        <p>${esc(f.about)}</p>
        <p><b>What to eat:</b> ${esc(f.food)}</p>
        <p class="meta pd-note">Dates change from year to year. Check the local tourism office before you book.</p>
        <p class="meta">Photos from Wikipedia and Wikimedia Commons.</p>
      </div>
    </div>
  </div>`;
}
async function openFestival(i) {
  const f = D.festivals[i], dlg = $("placeDlg");
  PD.d = f; PD.imgs = []; PD.i = 0; PD.added = false;
  dlg.innerHTML = festHTML(f);
  dlg.showModal();
  dlg.querySelector(".pd-scroll").scrollTop = 0;
  /* the festival's own page first, then photos of the place as a fallback */
  let lead = await getPhoto(f.wiki), more = await getGallery(f.wiki);
  if (PD.d !== f || !dlg.open) return;
  if (!lead && !more.length && f.alt) { [lead, more] = await Promise.all([getPhoto(f.alt), getGallery(f.alt)]); if (PD.d !== f || !dlg.open) return; }
  const seen = new Set(), imgs = [];
  const add = (im) => { const k = fileKey(im.small); if (!seen.has(k)) { seen.add(k); imgs.push(im); } };
  if (lead) add({ small: lead, big: bigger(lead), alt: f.name });
  more.forEach(add);
  PD.imgs = imgs.slice(0, 9);
  if (!PD.imgs.length) { $("pdCount").textContent = "Photos need an internet connection"; return; }
  $("pdThumbs").innerHTML = PD.imgs.map((im, k) => `<button type="button" aria-label="Show photo ${k + 1}"><img src="${im.small}" alt="" loading="lazy"></button>`).join("");
  $("pdThumbs").hidden = PD.imgs.length < 2;
  dlg.querySelectorAll(".pd-nav").forEach((b) => { b.hidden = PD.imgs.length < 2; });
  showImg(0);
}
const foodGroup = (r) => /Everywhere/.test(r) ? "Everywhere" : /Visayas|Cebu|Bacolod/.test(r) ? "Visayas" : /Mindanao|Davao/.test(r) ? "Mindanao" : "Luzon";
function renderFood() {
  const g = $("foodRegion").value;
  const ty = $("foodType").value;
  const list = D.foods.filter((f) => (g === "all" || foodGroup(f.region) === g || foodGroup(f.region) === "Everywhere") && (ty === "all" || f.type === ty));
  $("foodGrid").innerHTML = list.map((f) => `<article class="pcard">
    ${photoHTML(f, f.name)}
    <div class="body">
      <h3>${esc(f.name)}</h3>
      <p class="meta">${esc(f.region)}</p>
      <p>${esc(f.about)}</p>
      <p class="meta"><b>Usual price:</b> ${money(f.price[0], f.price[1])}</p>
    </div></article>`).join("");
  if (!list.length) $("foodGrid").innerHTML = "<p>Nothing matches. Try another type or region.</p>";
  hydratePhotos($("foodGrid"));
}

function renderFruits() {
  const onlySeason = $("frSeason").checked, onlyRare = $("frUnique").checked;
  const mName = fMonth ? MONTH_NAMES[fMonth - 1] : "";
  const list = (D.fruits || []).filter((f) => (!onlySeason || !fMonth || f.months.includes(fMonth)) && (!onlyRare || f.unique));
  $("fruitGrid").innerHTML = list.length ? list.map((f) => {
    const all = f.months.length === 12;
    const inSeason = fMonth && f.months.includes(fMonth);
    return `<article class="pcard">
    ${photoHTML(f, f.name)}
    <div class="body">
      <h3>${esc(f.name)}</h3>
      <div>${f.unique ? '<span class="tag gem">Uncommon abroad</span>' : ""}${all ? '<span class="tag">All year</span>' : inSeason ? `<span class="tag now">In season in ${mName}</span>` : `<span class="tag">Season: ${esc(seasonText(f.months))}</span>`}</div>
      <p class="meta">${esc(f.region)}</p>
      <p>${esc(f.about)}</p>
      <p>${esc(f.why)}</p>
      <p class="meta"><b>Usual price per kilo:</b> ${money(f.price[0], f.price[1])}</p>
    </div></article>`;
  }).join("") : `<p>No fruit matches. Try turning off a filter or picking another month.</p>`;
  hydratePhotos($("fruitGrid"));
}
function seasonText(ms) {
  const set = new Set(ms);
  const start = ms.find((m) => !set.has(m === 1 ? 12 : m - 1)) || ms[0];
  let end = start;
  while (set.has(end === 12 ? 1 : end + 1) && end !== (start === 1 ? 12 : start - 1)) end = end === 12 ? 1 : end + 1;
  return `${MONTHS[start - 1]} to ${MONTHS[end - 1]}`;
}

onReady(() => {
  $("foodRegion").innerHTML = `<option value="all">All of the Philippines</option><option>Luzon</option><option>Visayas</option><option>Mindanao</option>`;
  $("foodRegion").addEventListener("change", renderFood);
  ["foodType"].forEach((i) => $(i).addEventListener("change", renderFood));
  ["frSeason", "frUnique"].forEach((i) => $(i).addEventListener("change", renderFruits));
  setupGalleryDialog();
  renderMonthStrip(); renderFestivals(); renderFood(); renderFruits();
});
