const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthSelect = document.getElementById("monthSelect");
const foodType = document.getElementById("foodType");
let festivals = [];
let foods = [];
monthSelect.innerHTML = `<option value="0">All year</option>` +
  MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");
monthSelect.value = new Date().getMonth() + 1;  
function showFestivals() {
  const month = Number(monthSelect.value);
  const list = festivals.filter((f) => month === 0 || f.month === month);
  document.getElementById("festivalList").innerHTML = list.map((f) => `
    <article class="card">
      <p class="muted">${f.when}</p>
      <h3>${f.name}</h3>
      <p>${f.where}</p>
      <p>${f.about}</p>
    </article>`).join("") || "<p>No festival listed for this month.</p>";
}

function showFoods() {
  const list = foods.filter((f) => foodType.value === "all" || f.type === foodType.value);
  document.getElementById("foodList").innerHTML = list.map((f) => `
    <article class="card">
      <h3>${f.name}</h3>
      <p class="muted">${f.region}</p>
      <p>${f.about}</p>
      <p>Usual price: ${peso(f.price)}</p>
    </article>`).join("") || "<p>Nothing matches.</p>";
}
monthSelect.addEventListener("change", showFestivals);
foodType.addEventListener("change", showFoods);
loadData().then((data) => {
  festivals = data.festivals;
  foods = data.foods;
  showFestivals();
  showFoods();
});
