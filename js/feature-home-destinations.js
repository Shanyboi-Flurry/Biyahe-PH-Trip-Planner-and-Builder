const placeList = document.getElementById("placeList");
const search = document.getElementById("search");
const regionSelect = document.getElementById("region");
let places = [];
let activeTag = "all";
function showPlaces() {
  const word = search.value.toLowerCase();
  const trip = getTrip();
  const list = places.filter((p) =>
    p.name.toLowerCase().includes(word) &&
    (regionSelect.value === "all" || p.region === regionSelect.value) &&
    (activeTag === "all" || p.tags.includes(activeTag)));
  document.getElementById("count").textContent = list.length + " place(s)";
  placeList.innerHTML = list.map((p) => `
    <article class="card">
      <h3>${p.name}</h3>
      <p>${p.tags.map((t) => <span class="tag">${t}</span>).join("")}</p>
      <p>${p.region}: ${p.blurb}</p>
      <p>From ${peso(p.costPerDay)} a day</p>
      <button type="button" data-id="${p.id}">${trip.includes(p.id) ? "Remove from trip" : "Add to trip"}</button>
    </article>`).join("") || "<p>No place matches.</p>";
}
function showChips() {
  const allTags = ["all", ...new Set(places.flatMap((p) => p.tags))];
  document.getElementById("tagChips").innerHTML = allTags.map((t) =>
    `<button type="button" class="chip ${t === activeTag ? "on" : ""}" data-tag="${t}">${t}</button>`).join("");
}
document.getElementById("tagChips").addEventListener("click", (e) => {
  if (!e.target.dataset.tag) return;
  activeTag = e.target.dataset.tag;
  showChips();
  showPlaces();
});
placeList.addEventListener("click", (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  const trip = getTrip();
  saveTrip(trip.includes(id) ? trip.filter((x) => x !== id) : [...trip, id]);
  showPlaces();
});
search.addEventListener("input", showPlaces);
regionSelect.addEventListener("change", showPlaces);
loadData().then((data) => {
  places = data.destinations;
  showChips();
  showPlaces();
});