/* tips-phrases.js: emergency numbers, rainy season and typhoon guide, travel tips, Filipino phrases with audio. */

/* ---------- Safety, tips and voice ---------- */
let voices = [], phraseCat = "All";
const hasTTS = "speechSynthesis" in window;


/* ---------- Rainy season and typhoon guide ---------- */
let tyMonth = nowMonth;
function renderTyphoon() {
  const C = D.climate; if (!C) return;
  $("tyStrip").innerHTML = MONTHS.map((m, i) => `<button type="button" data-m="${i + 1}" class="risk${C.months[i].r}" aria-pressed="${tyMonth === i + 1}" aria-label="${MONTH_NAMES[i]}, typhoon risk ${C.risk[C.months[i].r].toLowerCase()}">${m}</button>`).join("");
  $("tyStrip").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { tyMonth = +b.dataset.m; renderTyphoon(); }));
  const mo = C.months[tyMonth - 1], se = C.seasons[mo.s];
  const good = D.destinations.filter((d) => bestMonths(d.best).includes(tyMonth));
  $("tyOut").innerHTML = `<article class="card ty-card">
      <div class="ty-head">
        <div><p class="when">${MONTH_NAMES[tyMonth - 1]}</p><h3>${esc(se.title)}</h3></div>
        <div class="ty-risk r${mo.r}" role="img" aria-label="Typhoon risk: ${C.risk[mo.r]}">
          <span class="lbl">Typhoon risk</span>
          <span class="bars" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i < mo.r ? "on" : ""}"></i>`).join("")}</span>
          <b>${C.risk[mo.r]}</b>
        </div>
      </div>
      <p>${esc(se.sum)}</p>
      <h4>What to expect by region</h4>
      <dl class="ty-reg">${se.regions.map(([r, t]) => `<div><dt>${esc(r)}</dt><dd>${esc(t)}</dd></div>`).join("")}</dl>
      <h4>Good places in ${MONTH_NAMES[tyMonth - 1]}</h4>
      <div class="ty-good">${good.length ? good.map((d) => `<a class="chipbtn" href="destinations.html?open=${d.id}">${d.emoji} ${esc(d.name)}</a>`).join("") : "<p class=\"meta\">No place is marked as best for this month. Choose a destination on the Destinations page and check its details.</p>"}</div>
      <h4>Smart tips</h4>
      <ul>${se.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
    </article>
    <details class="card ty-sig"><summary>What the storm warning signals mean</summary>
      <table><thead><tr><th>Signal</th><th>Wind</th><th>What it means for you</th></tr></thead><tbody>
      ${C.signals.map(([n, w, t]) => `<tr><th scope="row">No. ${n}</th><td>${esc(w)}</td><td>${esc(t)}</td></tr>`).join("")}
      </tbody></table>
      <p class="meta">PAGASA scale as I know it. Check the official site for the current version and the active bulletin. Ferries and boat tours are usually stopped by the Coast Guard once a signal is raised.</p>
      <p>${C.links.map(([l, u]) => `<a class="ghost" target="_blank" rel="noopener" href="${u}">${esc(l)}</a>`).join(" ")}</p>
    </details>`;
}

function renderTips() {
  $("sos").innerHTML = `<h3>In an emergency</h3>` + D.emergency.map((e) => `<div><a href="tel:${e.num}">${e.num}</a><span>${esc(e.label)}</span></div>`).join("");
  renderTyphoon();
  $("tipList").innerHTML = D.tips.map((t) => `<article class="card"><h3>${esc(t.title)}</h3><ul>${t.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></article>`).join("");
  renderPhraseCats(); renderPhrases();
  if (hasTTS) { loadVoices(); speechSynthesis.addEventListener("voiceschanged", loadVoices); }
  else { $("voiceNote").textContent = "Your browser can't play speech. Use the respelling under each phrase to practice."; $("voiceSel").parentElement.hidden = true; $("rate").parentElement.hidden = true; }
}
function renderPhraseCats() {
  const cats = ["All", ...D.phraseCats];
  $("phraseCats").innerHTML = cats.map((c) => `<button type="button" data-c="${c}" aria-pressed="${c === phraseCat}">${c}</button>`).join("");
  $("phraseCats").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { phraseCat = b.dataset.c; renderPhraseCats(); renderPhrases(); }));
}
function renderPhrases() {
  const list = D.phrases.map((p, i) => ({ p, i })).filter((x) => phraseCat === "All" || x.p.cat === phraseCat);
  $("phrases").innerHTML = list.map(({ p, i }) => `<li><span><b>${esc(p.fil)}</b><span class="say">${esc(p.say)}</span><br><span class="en">${esc(p.en)}</span></span>
    ${hasTTS || p.audio ? `<span class="btns"><button class="ghost play" data-i="${i}" type="button" aria-label="Listen to ${esc(p.fil)}">Listen</button><button class="ghost play" data-i="${i}" data-slow="1" type="button" aria-label="Listen slowly to ${esc(p.fil)}">Slow</button></span>` : ""}</li>`).join("");
  $("phrases").querySelectorAll(".play").forEach((b) => b.addEventListener("click", () => speak(D.phrases[b.dataset.i], !!b.dataset.slow, b)));
}
function loadVoices() {
  voices = speechSynthesis.getVoices();
  const pref = (v) => /^(fil|tl)/i.test(v.lang) ? 0 : /^id/i.test(v.lang) ? 1 : /^(ms|es)/i.test(v.lang) ? 2 : /^en/i.test(v.lang) ? 3 : 4;
  const sorted = [...voices].sort((a, b) => pref(a) - pref(b) || a.name.localeCompare(b.name));
  const saved = recall("ph_voice");
  $("voiceSel").innerHTML = sorted.map((v) => `<option value="${esc(v.name)}">${esc(v.name)} (${esc(v.lang)})</option>`).join("");
  if (saved && sorted.some((v) => v.name === saved)) $("voiceSel").value = saved;
  voiceNote();
}
function voiceNote() {
  const v = voices.find((x) => x.name === $("voiceSel").value);
  if (!voices.length) { $("voiceNote").textContent = "No voices found yet. Try again in a moment, or use the respelling under each phrase."; return; }
  $("voiceNote").textContent = v && /^(fil|tl)/i.test(v.lang) ? `Using a Filipino voice: ${v.name}.`
    : `No Filipino voice on this device, so ${v ? v.name : "a default voice"} will be used and the accent may sound off. Follow the respelling, or add a Filipino voice in your device's speech settings.`;
}
$("voiceSel").addEventListener("change", () => { store("ph_voice", $("voiceSel").value); voiceNote(); });

let currentAudio = null;
function speak(p, slow, btn) {
  document.querySelectorAll(".play.playing").forEach((x) => x.classList.remove("playing"));
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (hasTTS) speechSynthesis.cancel();
  const fallbackToTTS = () => {
    if (!hasTTS) return;
    const u = new SpeechSynthesisUtterance(p.fil.replace(/[!?]/g, ""));
    const v = voices.find((x) => x.name === $("voiceSel").value);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "fil-PH";
    u.rate = slow ? 0.55 : +$("rate").value;
    u.onstart = () => btn.classList.add("playing");
    u.onend = u.onerror = () => btn.classList.remove("playing");
    speechSynthesis.speak(u);
  };
  /* Optional: put a recorded AI voice file in the audio folder and add "audio": "audio/salamat.mp3" to a phrase in data.json. */
  if (p.audio) {
    const a = new Audio(p.audio); currentAudio = a;
    a.playbackRate = slow ? 0.7 : 1;
    a.onplay = () => btn.classList.add("playing"); a.onended = () => btn.classList.remove("playing");
    a.onerror = fallbackToTTS;
    a.play().catch(fallbackToTTS);
  } else fallbackToTTS();
}

onReady(() => {
  const m = +new URLSearchParams(location.search).get("month");   /* the home page links here with ?month= */
  if (m >= 1 && m <= 12) tyMonth = m;
  renderTips();
  if (location.hash === "#typhoon" && $("typhoon")) $("typhoon").scrollIntoView();
});
