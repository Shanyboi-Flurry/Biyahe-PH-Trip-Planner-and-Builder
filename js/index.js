/* index.js: the home page. Pick interests, days and budget, get a day-by-day plan. */

/* ---------- Plan a trip ---------- */
let lastPlan = null;
$("planForm").addEventListener("submit", (e) => { e.preventDefault(); if (D) buildPlan(); });

function buildPlan() {
  const days = Math.min(21, Math.max(1, +$("days").value || 1));
  const pax = Math.min(12, Math.max(1, +$("pax").value || 1));
  const lvl = $("level").value;
  const month = +$("month").value;
  const picked = [...document.querySelectorAll(".tagChk:checked")].map((c) => c.value);
  const count = Math.min(D.destinations.length, Math.max(1, Math.round(days / 3)));

  /* Interests count most. Pick stops one by one, favouring places that cover an interest not yet covered. */
  const score = (d, covered) => d.tags.reduce((t, g) => t + (picked.includes(g) ? (covered.has(g) ? 1 : 3) : 0), 0) + (month && bestMonths(d.best).includes(month) ? 1 : 0);
  const pool = D.destinations.slice(), covered = new Set(), pickedStops = [];
  while (pickedStops.length < count && pool.length) {
    pool.sort((a, b) => score(b, covered) - score(a, covered));
    const d = pool.shift(); pickedStops.push(d); d.tags.forEach((g) => covered.add(g));
  }
  const chosen = pickedStops.sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || b.lat - a.lat);

  const base = Math.floor(days / count);
  let extra = days % count, dayNo = 1;
  const stops = chosen.map((d) => {
    const n = base + (extra-- > 0 ? 1 : 0);
    const first = dayNo; dayNo += n;
    return { d, n, first, acts: d.acts.slice().sort((a, b) => a.c - b.c).slice(0, Math.min(n, d.acts.length)) };   /* friendliest prices first */
  });
  lastPlan = { days, pax, lvl, month, stops, picked };
  savePlan(lastPlan);   /* so the map and the budget planner can use it */
  renderPlan();
}

function renderPlan() {
  if (!lastPlan) return;
  const { days, pax, lvl, month, stops, picked = [] } = lastPlan;
  const count = stops.length;
  const stay = stops.reduce((t, s) => t + s.n * s.d.cost[lvl], 0);
  const actsCost = stops.reduce((t, s) => t + s.acts.reduce((a, x) => a + x.c, 0), 0);
  const transfers = (count - 1) * D.transfer[lvl];
  const perPerson = stay + actsCost + transfers;
  const total = perPerson * pax;
  const fests = month ? D.festivals.filter((f) => f.month === month) : [];

  $("planResult").innerHTML = `<div class="itin">
    <div class="total">
      <p class="sub">${days} days, ${count} stop${count > 1 ? "s" : ""}, ${cap(lvl)} style, ${pax} traveler${pax > 1 ? "s" : ""}</p>
      <p class="big">${money(total)}</p>
      <p>${money(perPerson)} per person, ${money(perPerson / days)} per person per day.</p>
      <p class="sub">Per person: stay and food ${money(stay)}, activities ${money(actsCost)}, transfers ${money(transfers)}.</p>
      <p class="sub">Includes stay, food, local rides, one activity a day, and ${count - 1} transfer${count === 2 ? "" : "s"}. International flights are not included.</p>
      <div class="row-btns"><button class="primary" id="toBudget" type="button">Fine-tune in the budget calculator</button></div>
    </div>
    ${fests.length ? `<div class="fest-note"><h3>Happening in ${MONTH_NAMES[month - 1]}</h3>${fests.map((f) => `<p><b>${esc(f.name)}</b> in ${esc(f.where)} (${esc(f.when)})</p>`).join("")}</div>` : ""}
    ${month && D.climate && D.climate.months[month - 1].r >= 2 ? `<div class="fest-note warn"><h3>Typhoon season in ${MONTH_NAMES[month - 1]}</h3><p>Typhoon risk is ${D.climate.risk[D.climate.months[month - 1].r].toLowerCase()} this month. Keep your bookings flexible, add a buffer day before your flight home, and check the <a href="tips-phrases.html?month=${month}#typhoon">typhoon guide</a>.</p></div>` : ""}
    <div class="row-btns"><button class="ghost" id="toMap" type="button">See this route on the map</button></div>
    ${stops.map(({ d, n, first, acts }) => {
      const inSeason = !month || bestMonths(d.best).includes(month);
      return `<div class="stop">
      ${photoHTML(d, d.name)}
      <div>
        <h3>${esc(d.name)}</h3>
        <p class="meta">${n} day${n > 1 ? "s" : ""} (Day ${first}${n > 1 ? "-" + (first + n - 1) : ""}), best time ${d.best}
          ${month ? (inSeason ? '<span class="tag now">In season</span>' : '<span class="tag">Off season</span>') : ""}</p>
        <div class="stop-tags">${d.tags.map((t) => `<span class="tag${picked.includes(t) ? " match" : ""}">${cap(t)}</span>`).join("")}</div>
        <p>${esc(d.blurb)}</p>
        <p class="meta"><b>Getting there:</b> ${esc(d.gateway)}</p>
        <p class="meta"><a href="destinations.html?open=${d.id}">See photos and details</a></p>
        <ul>${Array.from({ length: n }, (_, k) => acts[k] ? `<li><b>Day ${first + k}:</b> ${esc(acts[k].n)} (${money(acts[k].c)})</li>` : `<li><b>Day ${first + k}:</b> Free day. Wander, rest, and eat where locals eat.</li>`).join("")}</ul>
        <p class="meta">Stay costs ${money(n * d.cost[lvl])} per person. Try: ${esc(d.eat)}</p>
      </div></div>`;
    }).join("")}
  </div>`;
  hydratePhotos($("planResult"));
  $("toBudget").addEventListener("click", () => loadPlanIntoBudget());
  $("toMap").addEventListener("click", () => { store("ph_map_route", true); location.href = "destinations.html?view=map"; });
}

/* Send the itinerary to the budget planner */
function loadPlanIntoBudget() {
  if (!lastPlan) return;
  const { pax, lvl, stops } = lastPlan;
  B.pax = pax; B.level = lvl; B.transfer = D.transfer[lvl]; B.places = {};
  D.destinations.forEach(ensurePlace);
  stops.forEach(({ d, n, acts }) => {
    const p = B.places[d.id]; p.on = true; p.days = n; p.dayCost = d.cost[lvl];
    d.acts.forEach((a, i) => { p.acts[i].on = i < acts.length; });
  });
  saveB();
  location.href = "budget-planner.html";
}

onReady(() => {
  $("interests").innerHTML = D.tags.map((t) => `<label class="chip"><input type="checkbox" class="tagChk" value="${t}" ${t === "beach" || t === "food" ? "checked" : ""}>${t}</label>`).join("");
  $("month").innerHTML = `<option value="0">Any month</option>` + MONTH_NAMES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");
  /* come back to the last plan you built */
  lastPlan = loadPlan();
  if (lastPlan) {
    $("days").value = lastPlan.days; $("pax").value = lastPlan.pax; $("level").value = lastPlan.lvl; $("month").value = lastPlan.month;
    document.querySelectorAll(".tagChk").forEach((c) => { c.checked = (lastPlan.picked || []).includes(c.value); });
    renderPlan();
  }
});
