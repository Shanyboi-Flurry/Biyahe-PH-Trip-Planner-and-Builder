let places = [];
let extras = JSON.parse(localStorage.getItem("extras") || "[]");
// choices[id] = { days: 2, acts: [true, false, ...] }
let choices = JSON.parse(localStorage.getItem("choices") || "{}");
function choiceFor(place) {
  if (!choices[place.id]) choices[place.id] = { days: 2, acts: place.acts.map(() => false) };
  return choices[place.id];
}
function save() {
  localStorage.setItem("extras", JSON.stringify(extras));
  localStorage.setItem("choices", JSON.stringify(choices));
}
function showTrip() {
  const trip = places.filter((p) => getTrip().includes(p.id));
  document.getElementById("empty").hidden = trip.length > 0;
  document.getElementById("tripList").innerHTML = trip.map((p) => {
    const c = choiceFor(p);
    return `<div class="place-box" data-id="${p.id}">
      <h3>${p.name}</h3>
      <label>Days <input type="number" min="1" value="${c.days}" data-days></label>
      <p>Stay and food: ${peso(p.costPerDay)} per person per day</p>
      ${p.acts.map((a, i) => `<div class="act-row">
        <input type="checkbox" id="${p.id}-${i}" data-act="${i}" ${c.acts[i] ? "checked" : ""}>
        <label for="${p.id}-${i}">${a.name}</label>
        <span>${peso(a.cost)}</span>
      </div>`).join("")}
    </div>`;
  }).join("");
  showTotal(trip);
}
function showExtras() {
  document.getElementById("extraList").innerHTML = extras.map((x, i) =>
    <li>${x.name}: ${peso(x.amt)} <button type="button" data-rm="${i}">Remove</button></li>).join("");
}
function showTotal(trip) {
  const people = Number(document.getElementById("people").value) || 1;
  const buffer = Number(document.getElementById("buffer").value) || 0;
  let stay = 0, activities = 0, days = 0;
  trip.forEach((p) => {
    const c = choiceFor(p);
    days += c.days;
    stay += p.costPerDay * c.days * people;
    p.acts.forEach((a, i) => { if (c.acts[i]) activities += a.cost * people; });
  });
  const extraTotal = extras.reduce((t, x) => t + x.amt, 0);
  const subtotal = stay + activities + extraTotal;
  const total = subtotal * (1 + buffer / 100);
  document.getElementById("summary").innerHTML = `
    <p>${trip.length} place(s), ${days} day(s), ${people} traveler(s)</p>
    <p>Stay and food: ${peso(stay)}</p>
    <p>Activities: ${peso(activities)}</p>
    <p>Extras: ${peso(extraTotal)}</p>
    <p>Buffer (${buffer}%): ${peso(subtotal * buffer / 100)}</p>
    <p class="big">Total: ${peso(total)}</p>`;
}
document.getElementById("tripList").addEventListener("input", (e) => {
  const place = places.find((p) => p.id === e.target.closest(".place-box").dataset.id);
  const c = choiceFor(place);
  if (e.target.dataset.act !== undefined) c.acts[e.target.dataset.act] = e.target.checked;
  if (e.target.hasAttribute("data-days")) c.days = Math.max(1, Number(e.target.value) || 1);
  save();
  showTotal(places.filter((p) => getTrip().includes(p.id)));
});
["people", "buffer"].forEach((id) =>
  document.getElementById(id).addEventListener("input", () => showTotal(places.filter((p) => getTrip().includes(p.id)))));
document.getElementById("extraForm").addEventListener("submit", (e) => {
  e.preventDefault();
  extras.push({ name: document.getElementById("extraName").value, amt: Number(document.getElementById("extraAmt").value) });
  e.target.reset();
  save(); showExtras(); showTotal(places.filter((p) => getTrip().includes(p.id)));
});
document.getElementById("extraList").addEventListener("click", (e) => {
  if (e.target.dataset.rm === undefined) return;
  extras.splice(e.target.dataset.rm, 1);
  save(); showExtras(); showTotal(places.filter((p) => getTrip().includes(p.id)));
});
loadData().then((data) => {
  places = data.destinations;
  showTrip();
  showExtras();
});