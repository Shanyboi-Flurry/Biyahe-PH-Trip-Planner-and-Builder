# 🇵🇭 Biyahe-PH: Philippines Trip Planner and Builder

Biyahe-PH is an all-in-one interactive travel planning web platform designed for domestic and international tourists visiting the Philippines. Instead of searching across fragmented websites, users can explore top destinations, calculate trip budgets, browse monthly festivals, discover regional food and seasonal fruits, estimate transport fares, and access traveler safety tips in one unified interface.

---

## 🎯 Project Objectives & Purpose
* **Centralize Travel Information:** Provide a single hub for Philippine tourism destinations, transit options, and cultural events.
* **Simplify Budgeting:** Offer interactive tools to estimate daily expenses and transport fares in multiple currencies.
* **Promote Local Culture:** Highlight regional culinary specialties, seasonal tropical fruits, and local festivals across Luzon, Visayas, and Mindanao.
* **Demonstrate Collaboration:** Apply modern frontend web development techniques alongside collaborative Git/GitHub version control workflows.

---

## 👥 Target Users
* **Foreign Tourists & Backpackers:** Travelers visiting the Philippines who need guidance on transport fares, local etiquette, and basic Tagalog phrases.
* **Domestic Travelers & Vacationers:** Locals planning weekend getaways, food trips, or festival itineraries.
* **Budget Travelers:** Users seeking cost estimates and fair transport rates to avoid overcharging.

---

## ✨ Major Features

1. **🧭 Interactive Trip & Budget Planner (`budget-planner.html`)**
   * Calculates estimated daily trip costs, accommodation expenses, and activity budgets.
   * Multi-currency conversion support for foreign visitors.

2. **🏝️ Destination Showcase (`destinations.html`)**
   * Multi-region catalog showcasing top Philippine destinations with dynamic filtering.

3. **🎉 Cultural Festivals & Local Food Guide (`food-festivals.html`)**
   * **Month-Based Festival Calendar:** Interactive month selector displaying cultural festivals across the country.
   * **Regional Food Selector:** Categorizes dishes by region (Luzon, Visayas, Mindanao) and dish type (Street food, Inihaw, Soups, Sweets).
   * **Seasonal Fruit Guide:** Filters tropical fruits currently in harvest during the selected month.

4. **🛺 Commute & Transit Guide (`commute-guide.html`)**
   * **Distance-Based Fare Estimator:** Calculates expected fares for taxis, jeepneys, and tricycles.
   * **Fare Verdict Checker:** Evaluates driver quotes ("Fair price", "A bit high", or "Likely overpriced").
   * **Scam Watch & Route Guides:** Tips to navigate local transit safely.

5. **🛟 Safety Tips & Survival Phrases (`tips-phrases.html`)**
   * Traveler safety guidelines and essential Tagalog/Bisaya survival expressions.

6. **💬 Contact & Interactive FAQ (`contact-faq.html`)**
   * Contact inquiry forms and expandable travel FAQs.

---

## 🛠️ Technologies Used
* **Frontend:** HTML5, CSS3 (Flexbox/Grid layout, custom variables), JavaScript (ES6 Modules, Dynamic DOM Rendering, Async Fetch)
* **Design & Typography:** Google Fonts (*Figtree*, *Young Serif*)
* **Version Control & Hosting:** Git, GitHub, VS Code Live Server
* **APIs / Data Sources:** Frankfurter API (Live Currency Exchange Rates), Open-Meteo (Weather Data), Wikipedia / Wikimedia Commons (Destination & Festival Media)

---

## 👨‍💻 Team Members & Responsibilities

| Member Name | GitHub Username | Role & Assigned Features |
| :--- | :--- | :--- |
| **Sean Patrick D. Bungay** | [`Shanyboi-Flurry`](https://github.com/Shanyboi-Flurry) | **Project Lead / Repository Owner**<br>Navigation Bar & Global Theme Script (`theme.js`), Safety & Phrases (`tips-phrases.html`), Contact & FAQ (`contact-faq.html`). |
| **Mikaella Andrea Q. Moises** | [`mklndr`](https://github.com/mklndr) | **Developer (Member 2)**<br>Destinations Showcase (`destinations.html`), Interactive Budget Planner (`budget-planner.html`). |
| **Rhaina L. Llorente** | [`Impshort`](https://github.com/Impshort) | **Developer (Member 3)**<br>Festivals & Regional Food Module (`food-festivals.html`), Commute & Transit Fare Estimator (`commute-guide.html`). |

---

## 🚀 Instructions for Running the Website Locally

To run this project on your local machine, follow these steps:

### Prerequisites
* Install [Visual Studio Code](https://code.visualstudio.com/).
* Install the **Live Server** extension in VS Code.
* Install [Git](https://git-scm.com/).

### Setup Steps
1. **Clone the Repository:**
   Open your terminal/command prompt and run:
   ```bash
   git clone [https://github.com/Shanyboi-Flurry/Biyahe-PH-Trip-Planner-and-Builder.git](https://github.com/Shanyboi-Flurry/Biyahe-PH-Trip-Planner-and-Builder.git)
