function renderTransport() {
  $("tList").innerHTML = D.transport.map((t) => `<article class="card"><h3>${t.emoji} ${esc(t.mode)}</h3>
    <p class="meta">${t.p ? money(t.p[0], t.p[1]) : esc(t.cost)}</p><p>${esc(t.tip)}</p></article>`).join("");
  $("routeList").innerHTML = D.routes.map((r) => `<div class="route">
    <h3>${esc(r.from)} to ${esc(r.to)}</h3>
    <div><p class="fare">${money(r.p[0], r.p[1])}</p><p class="meta">${esc(r.mode)}, ${esc(r.time)}</p></div>
    <p>${esc(r.tip)}</p></div>`).join("");
  $("scamList").innerHTML = D.scams.map((s) => `<article class="card scam"><h3>${esc(s.title)}</h3><p>${esc(s.fix)}</p></article>`).join("");
}

function fareRange(mode, km, special) {
  const r5 = (n) => Math.max(5, Math.round(n / 5) * 5);
  if (mode === "taxi") { const f = 45 + 13.5 * km + 2 * (km * 3); return { lo: r5(f), hi: r5(f * 1.35), note: "Meter rule: 45 flag-down, plus 13.50 per km and 2 per minute. The high end allows for traffic. Airport taxis and Grab add their own fees." }; }
  if (mode === "jeep") { const f = 13 + Math.max(0, km - 4) * 1.8; return { lo: r5(f), hi: r5(f * 1.3), note: "Jeepney fares start at about 13 for the first 4 km, then rise per km. Aircon and modern jeepneys cost a little more." }; }
  const f = 20 + Math.max(0, km - 1) * 10;
  return special ? { lo: r5(f * 2.5), hi: r5(f * 4), note: "A special trip means the tricycle is yours alone, so it costs more. Local rates vary by town, so ask your hotel." }
    : { lo: r5(f * 0.8), hi: r5(f * 1.3), note: "Shared tricycle fares are per person and vary by town. Ask your hotel or a local for the usual rate." };
}
function renderFare() {
  if (!D) return;
  const mode = $("fMode").value, km = Math.max(0.5, +$("fKm").value || 1), quote = $("fQuote").value === "" ? null : +$("fQuote").value;
  $("fSpecialWrap").hidden = mode !== "trike";
  const f = fareRange(mode, km, $("fSpecial").checked);
  let verdict = "";
  if (quote != null) {
    const [cls, txt] = quote <= f.hi * 1.15 ? ["ok", "Fair price"] : quote <= f.hi * 1.8 ? ["warn", "A bit high. Try to haggle"] : ["bad", "Likely overpriced"];
    verdict = `<p><span class="verdict ${cls}">${txt}</span> They asked ${money(quote)}.</p>`;
  }
  $("fareOut").innerHTML = `<p><b>Expected fare:</b> ${money(f.lo, f.hi)}</p>${verdict}<p class="meta">${esc(f.note)} This is a rough guide, not an official quote.</p>`;
}
["fMode", "fKm", "fQuote", "fSpecial"].forEach((id) => $(id).addEventListener("input", renderFare));

moneyHooks.push(renderFare);   /* re-price the fare when the currency changes */
onReady(() => { renderTransport(); renderFare(); });
