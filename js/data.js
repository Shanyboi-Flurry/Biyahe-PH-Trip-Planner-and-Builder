/* data.js: loads data.json (works with VS Code Live Server). Every page uses loadData(). */
async function loadData() {
  const response = await fetch("data.json");
  return response.json();
}

function peso(amount) {
  return "₱" + Math.round(amount).toLocaleString();
}

/* The trip you build is saved in the browser so the Destinations and Budget pages share it. */
function getTrip() {
  return JSON.parse(localStorage.getItem("trip") || "[]");   // list of place ids
}
function saveTrip(list) {
  localStorage.setItem("trip", JSON.stringify(list));
}
