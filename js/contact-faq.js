/* contact-faq.js: answers to common questions (from "faq" in data.json) and a contact form.
   The form opens the visitor's email app, so no server is needed. */

const CONTACT_EMAIL = "hello@example.com";   /* change this to your own address */

function renderFaq() {
  $("faqList").innerHTML = (D.faq || []).map((f, i) => `<details class="card faq"${i === 0 ? " open" : ""}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("");
}

$("contactForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("cName").value.trim(), from = $("cEmail").value.trim(), msg = $("cMsg").value.trim();
  const body = `${msg}\n\n${name}${from ? " (" + from + ")" : ""}`;
  location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Philippines trip planner: question from " + name)}&body=${encodeURIComponent(body)}`;
  $("cNote").textContent = "Your email app should open now. If nothing happens, write to " + CONTACT_EMAIL + " instead.";
});

onReady(renderFaq);
