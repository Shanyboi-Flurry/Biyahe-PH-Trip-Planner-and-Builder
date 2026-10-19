/* theme.js: dark mode button. Remembers your choice. (Sean) */
const themeBtn = document.getElementById("themeBtn");

function applyTheme(mode) {
  document.body.classList.toggle("dark", mode === "dark");
  themeBtn.textContent = mode === "dark" ? "Light mode" : "Dark mode";
}

applyTheme(localStorage.getItem("theme") || "light");

themeBtn.addEventListener("click", () => {
  const mode = document.body.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem("theme", mode);
  applyTheme(mode);
});
