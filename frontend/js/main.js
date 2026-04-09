let API_BASE = null;
async function getApiBase() {
  if (API_BASE) return API_BASE;
  try {
    const res = await fetch("/DB/pokemon-trader/backend/api/config.php");
    const config = await res.json();
    API_BASE = config.api_base || "http://localhost:8888/DB/pokemon-trader/backend/api";
  } catch (e) {
    API_BASE = "http://localhost:8888/DB/pokemon-trader/backend/api";
  }
  return API_BASE;
}

// ---------- HELPERS ----------
async function fetchData(endpoint, options = {}) {
  try {
    const base = await getApiBase();
    const res = await fetch(`${base}/${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      },
      credentials: "include",
      ...options
    });
    return await res.json();
  } catch (e) {
    console.error("API error:", e);
    return null;
  }
}

function $(id) {
  return document.getElementById(id);
}

// ---------- CARD RENDER ----------
function createCardHTML(card) {
  return `
    <div class="card">
      <img src="${card.image || ''}" alt="${card.name}" />
      <h3>${card.name}</h3>
      <p>${card.rarity || ''}</p>
    </div>
  `;
}

// ---------- AUTH ----------
async function handleLogin() {
  const form = $("login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));

    const res = await fetchData("auth.php?action=login", {
      method: "POST",
      body: JSON.stringify(data)
    });

    if (res?.success) {
      window.location.href = "market.html";
    } else {
      alert("Login failed");
    }
  });
}

async function handleRegister() {
  const form = $("register-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));

    const res = await fetchData("auth.php?action=register", {
      method: "POST",
      body: JSON.stringify(data)
    });

    if (res?.success) {
      window.location.href = "login.html";
    } else {
      alert("Register failed");
    }
  });
}

// ---------- MARKET ----------
async function loadMarket() {
  const grid = $("listings-grid");
  if (!grid) return;

  const data = await fetchData("market.php");
  if (!data) return;

  grid.innerHTML = data.map(card => `
    <div class="card">
      <img src="${card.image}" />
      <h3>${card.name}</h3>
      <p>${card.price} coins</p>
      <button onclick="buyCard(${card.id})">Buy</button>
    </div>
  `).join("");
}

async function buyCard(id) {
  const res = await fetchData("buy.php", {
    method: "POST",
    body: JSON.stringify({ id })
  });

  if (res?.success) {
    alert("Purchased!");
    loadMarket();
  }
}

// ---------- COLLECTION ----------
async function loadCollection() {
  const grid = $("collection-grid");
  if (!grid) return;

  const data = await fetchData("collection.php");
  if (!data) return;

  grid.innerHTML = data.map(createCardHTML).join("");
}

// ---------- SHOWCASE ----------
async function loadShowcase() {
  const grid = $("showcase-grid");
  if (!grid) return;

  const data = await fetchData("showcase.php");
  if (!data) return;

  grid.innerHTML = data.map(createCardHTML).join("");
}

// ---------- PACKS ----------
async function loadPacks() {
  const grid = $("packs-grid");
  if (!grid) return;

  const data = await fetchData("packs.php");
  if (!data) return;

  grid.innerHTML = data.map(pack => `
    <div class="card">
      <h3>${pack.name}</h3>
      <p>${pack.price} coins</p>
      <button onclick="openPack(${pack.id})">Open</button>
    </div>
  `).join("");
}

async function openPack(id) {
  const res = await fetchData("open_pack.php", {
    method: "POST",
    body: JSON.stringify({ id })
  });

  if (!res) return;

  const modal = $("pack-open-modal");
  const results = $("pack-results");

  results.innerHTML = res.cards.map(createCardHTML).join("");
  modal.showModal();
}

// ---------- SELL MODAL ----------
function setupSellModal() {
  const openBtn = $("open-sell-modal");
  const modal = $("sell-modal");
  const closeBtn = $("close-sell-modal");
  const form = $("sell-form");

  if (!openBtn || !modal) return;

  openBtn.onclick = () => modal.showModal();
  closeBtn.onclick = () => modal.close();

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));

    const res = await fetchData("sell.php", {
      method: "POST",
      body: JSON.stringify(data)
    });

    if (res?.success) {
      modal.close();
      loadMarket();
    }
  });
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  handleLogin();
  handleRegister();

  loadMarket();
  loadCollection();
  loadShowcase();
  loadPacks();

  setupSellModal();
});