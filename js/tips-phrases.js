/* tips-phrases.js: emergency numbers, tips and phrases with sound (Sean) */
let phrases = [];
let category = "All";

function showPhrases() {
  const list = phrases.filter((p) => category === "All" || p.cat === category);
  document.getElementById("phraseList").innerHTML = list.map((p) => `
    <li>
      <span><b>${p.fil}</b><br><span class="muted">${p.en}</span></span>
      <button type="button" data-say="${p.fil}">Listen</button>
    </li>`).join("");
}

function showCategories(cats) {
  document.getElementById("phraseCats").innerHTML = ["All", ...cats].map((c) =>
    `<button type="button" class="chip ${c === category ? "on" : ""}" data-cat="${c}">${c}</button>`).join("");
}

function say(text) {
  if (!("speechSynthesis" in window)) { alert("Your browser cannot play speech."); return; }
  const voice = new SpeechSynthesisUtterance(text);
  voice.lang = "fil-PH";
  voice.rate = 0.85;
  speechSynthesis.cancel();
  speechSynthesis.speak(voice);
}

document.getElementById("phraseCats").addEventListener("click", (e) => {
  if (!e.target.dataset.cat) return;
  category = e.target.dataset.cat;
  showCategories(window.cats);
  showPhrases();
});

document.getElementById("phraseList").addEventListener("click", (e) => {
  if (e.target.dataset.say) say(e.target.dataset.say);
});

loadData().then((data) => {
  window.cats = data.phraseCats;
  phrases = data.phrases;
  document.getElementById("sos").innerHTML = "<h3>In an emergency</h3>" +
    data.emergency.map((e) => `<p><a href="tel:${e.num}">${e.num}</a> ${e.label}</p>`).join("");
  document.getElementById("tipList").innerHTML = data.tips.map((t) => `<li>${t}</li>`).join("");
  showCategories(window.cats);
  showPhrases();
});
