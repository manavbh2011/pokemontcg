// ---------- HELPERS ----------
async function fetchData(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
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

function setFormNotice(el, message) {
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.hidden = false;
  } else {
    el.textContent = "";
    el.hidden = true;
  }
}

function formatCoins(value) {
  if (value == null || value === "") return "0";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function setBalanceDisplay(value) {
  const raw = value == null || value === "" ? "0" : String(value);
  localStorage.setItem("balance", raw);
  const label = formatCoins(raw);
  ["user-balance", "profile-balance"].forEach((id) => {
    const el = $(id);
    if (el) el.textContent = label;
  });
}

async function refreshBalance() {
  if (!localStorage.getItem("username")) return;
  const res = await fetchData("auth.php?action=me");
  if (res?.balance != null && !res.error) {
    setBalanceDisplay(res.balance);
  }
}

async function loadProfileFromApi() {
  const res = await fetchData("auth.php?action=me");
  if (!res || res.error) return;

  const u = $("profile-username");
  if (u) u.textContent = res.username ?? "";

  if (res.balance != null) setBalanceDisplay(res.balance);
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
  const notice = $("login-error");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setFormNotice(notice, "");
    setFormNotice($("login-gate-notice"), "");
    const data = Object.fromEntries(new FormData(form));

    const res = await fetchData("auth.php?action=login", {
      method: "POST",
      body: JSON.stringify(data)
    });

    if (res?.username) {
      if (res.balance != null) setBalanceDisplay(res.balance);
      localStorage.setItem("username", res.username);
      localStorage.setItem("name", res.name);
      const next = new URLSearchParams(window.location.search).get("required");
      const dest = {
        packs: "packs.html",
        market: "market.html",
        collection: "collection.html",
        showcase: "showcase.html"
      }[next];
      window.location.href = dest || "market.html";
    } else {
      const msg =
        res?.error ||
        (res === null
          ? "Could not reach the server. Check that PHP is running and config.js API_BASE is correct."
          : "Invalid username or password.");
      setFormNotice(notice, msg);
    }
  });
}

async function handleRegister() {
  const form = $("register-form");
  const notice = $("register-error");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setFormNotice(notice, "");
    const data = Object.fromEntries(new FormData(form));

    const res = await fetchData("auth.php?action=register", {
      method: "POST",
      body: JSON.stringify(data)
    });

    if (res?.success) {
      window.location.href = "login.html";
    } else {
      const msg =
        res?.error ||
        (res === null
          ? "Could not reach the server. Check that PHP is running and config.js API_BASE is correct."
          : "Registration failed.");
      setFormNotice(notice, msg);
    }
  });
}

// ---------- MARKET ----------
async function loadMarket() {
  const grid = $("listings-grid");
  if (!grid) return;

  const data = await fetchData("market.php");
  if (!data) return;

  const tcgdex = new TCGdex('en');
  const cards = await Promise.all(data.map(async listing => {
    const card = await tcgdex.card.get(listing.card_info_id);
    return { ...listing, imageURL: card?.getImageURL('low', 'webp') ?? '' };
  }));

  grid.innerHTML = cards.map(card => `
    <div class="card">
      <img src="${card.imageURL}" alt="${card.card_name}" style="width:120px;border-radius:8px;" />
      <h3>${card.card_name}</h3>
      <p>${card.type} · ${card.level}</p>
      <p>${card.card_price} coins</p>
      <button onclick="buyCard(${card.listing_id})">Buy</button>
    </div>
  `).join("");
}

async function buyCard(listingId) {
  const res = await fetchData("market.php?action=buy", {
    method: "POST",
    body: JSON.stringify({ listing_id: listingId })
  });

  if (res?.success) {
    if (res.balance != null) setBalanceDisplay(res.balance);
    else void refreshBalance();
    alert("Purchased!");
    loadMarket();
  }
}

// ---------- COLLECTION ----------
async function loadCollection() {
  const grid = $("collection-grid");
  if (!grid) return;

  const username = localStorage.getItem("username");
  if (!username) return;

  const data = await fetchData(`cards.php?username=${username}`);
  if (!data || data.error) {
    grid.innerHTML = '<p class="muted">No cards in your collection yet.</p>';
    return;
  }

  const tcgdex = new TCGdex('en');
  const withImages = await Promise.all(data.map(async c => {
    const card = await tcgdex.card.get(c.card_info_id);
    return { ...c, imageURL: card?.getImageURL('low', 'webp') ?? '' };
  }));

  grid.innerHTML = withImages.map(c => `
    <div class="card-shell">
      <img src="${c.imageURL}" alt="${c.card_name}" style="width:120px;border-radius:12px;" />
      <div>
        <h3>${c.card_name}</h3>
        <p class="muted">${c.type} · ${c.level}</p>
      </div>
    </div>
  `).join("");
}

// ---------- SHOWCASE ----------
async function loadShowcase() {
  const grid = $("showcase-grid");
  if (!grid) return;

  const username = localStorage.getItem("username");
  if (!username) return;

  const data = await fetchData(`showcase.php?username=${username}`);
  if (!data) return;

  const tcgdex = new TCGdex('en');
  const cards = data.flatMap(s => s.cards);

  if (!cards.length) {
    grid.innerHTML = '<p class="muted">No cards in your showcase yet.</p>';
    return;
  }

  const withImages = await Promise.all(cards.map(async c => {
    const card = await tcgdex.card.get(c.card_info_id);
    return { ...c, imageURL: card?.getImageURL('low', 'webp') ?? '' };
  }));

  grid.innerHTML = withImages.map(c => `
    <div class="card-shell">
      <img src="${c.imageURL}" alt="${c.card_name}" style="width:120px;border-radius:12px;" />
      <div style="margin-top:auto;">
        <h3>${c.card_name}</h3>
        <p class="muted">${c.type} · ${c.level}</p>
        <button onclick="removeFromShowcase(${c.card_id})">Remove</button>
      </div>
    </div>
  `).join("");
}

async function removeFromShowcase(cardId) {
  const username = localStorage.getItem("username");
  await fetchData("showcase.php?action=remove", {
    method: "POST",
    body: JSON.stringify({ username, card_id: cardId })
  });
  loadShowcase();
}

async function openAddToShowcaseModal() {
  const username = localStorage.getItem("username");
  const [collectionData, showcaseData] = await Promise.all([
    fetchData(`cards.php?username=${username}`),
    fetchData(`showcase.php?username=${username}`)
  ]);
  const list = $("showcase-card-list");
  if (!collectionData || !list) return;

  const showcaseCardIds = new Set(
    (showcaseData || []).flatMap(s => s.cards.map(c => c.card_id))
  );

  const available = collectionData.filter(c => !showcaseCardIds.has(c.card_id));

  if (!available.length) {
    list.innerHTML = '<p class="muted">All your cards are already in your showcase.</p>';
    $("add-to-showcase-modal").showModal();
    return;
  }

  const tcgdex = new TCGdex('en');
  const withImages = await Promise.all(available.map(async c => {
    const card = await tcgdex.card.get(c.card_info_id);
    return { ...c, imageURL: card?.getImageURL('low', 'webp') ?? '' };
  }));

  list.innerHTML = withImages.map(c => `
    <div class="card-shell" style="cursor:pointer;" onclick="addToShowcase(${c.card_id})">
      <img src="${c.imageURL}" alt="${c.card_name}" style="border-radius:12px;" />
      <div><h3>${c.card_name}</h3><p class="muted">${c.type} · ${c.level}</p></div>
    </div>
  `).join("");

  $("add-to-showcase-modal").showModal();
}

async function addToShowcase(cardId) {
  const username = localStorage.getItem("username");
  const res = await fetchData("showcase.php?action=add", {
    method: "POST",
    body: JSON.stringify({ username, card_id: cardId })
  });
  if (res?.success) {
    $("add-to-showcase-modal").close();
    loadShowcase();
  } else {
    alert("Failed to add card: " + (res?.error ?? "Unknown error"));
  }
}

// ---------- PACKS ----------
async function loadPacks() {
  const grid = $("packs-grid");
  if (!grid) return;

  const data = await fetchData("packs.php");
  if (!data) return;

  grid.innerHTML = data.map(pack => `
    <div class="card-shell">
      <div class="card-image">${pack.pack_type_name}</div>
      <div style="margin-top:auto;">
        <h3 style="margin-bottom:0.4rem;">${pack.pack_type_name}</h3>
        <div class="card-meta" style="margin-bottom:0.75rem;"><span>${pack.pack_price} coins</span></div>
        <button onclick="openPack('${pack.pack_type_id}')">Open Pack</button>
      </div>
    </div>
  `).join("");
}

async function openPack(packTypeId) {
  const res = await fetchData("packs.php?action=buy", {
    method: "POST",
    body: JSON.stringify({ pack_type_id: packTypeId })
  });

  if (!res || res.error) {
    alert(res?.error ?? "Failed to open pack");
    return;
  }

  if (res.balance != null) setBalanceDisplay(res.balance);
  else void refreshBalance();

  const modal = $("pack-open-modal");
  const results = $("pack-results");

  const tcgdex = new TCGdex('en');
  const withImages = await Promise.all(res.cards.map(async c => {
    const card = await tcgdex.card.get(c.card_info_id);
    return { ...c, imageURL: card?.getImageURL('low', 'webp') ?? '' };
  }));

  results.innerHTML = withImages.map(c => `
    <div class="card-shell">
      <img src="${c.imageURL}" alt="${c.card_name}" style="width:120px;border-radius:12px;" />
      <div>
        <h3>${c.card_name}</h3>
        <p class="muted">${c.type} · ${c.level}</p>
      </div>
    </div>
  `).join("");

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
      void refreshBalance();
      modal.close();
      loadMarket();
    }
  });
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.endsWith("login.html") && localStorage.getItem("username")) {
    const next = new URLSearchParams(window.location.search).get("required");
    const dest = {
      packs: "packs.html",
      market: "market.html",
      collection: "collection.html",
      showcase: "showcase.html"
    }[next];
    window.location.replace(dest || "market.html");
    return;
  }

  if (window.location.pathname.endsWith("login.html")) {
    const req = new URLSearchParams(window.location.search).get("required");
    const gate = $("login-gate-notice");
    if (req && gate) {
      const labels = {
        packs: "Packs",
        market: "Market",
        collection: "Collection",
        showcase: "Showcase"
      };
      const name = labels[req] || req;
      setFormNotice(
        gate,
        "You must log in to access " + name + ". Sign in below to continue."
      );
    }
  }

  if (window.location.pathname.endsWith("user.html")) {
    void loadProfileFromApi();
  } else {
    if ($("user-balance") || $("profile-balance")) {
      setBalanceDisplay(localStorage.getItem("balance") ?? "0");
    }
    void refreshBalance();
  }

  const showcaseUsername = $("showcase-username");
  if (showcaseUsername) showcaseUsername.textContent = localStorage.getItem("name") ?? "User";

  const closeModal = $("close-modal");
  if (closeModal) closeModal.onclick = () => $("pack-open-modal").close();

  handleLogin();
  handleRegister();

  loadMarket();
  loadCollection();
  loadShowcase();
  loadPacks();

  setupSellModal();
});