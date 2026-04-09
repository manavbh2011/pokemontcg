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

    if (res?.username) {
      localStorage.setItem("balance", res.balance);
      localStorage.setItem("username", res.username);
      localStorage.setItem("name", res.name);
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
  const balanceEl = $("user-balance");
  if (balanceEl) balanceEl.textContent = localStorage.getItem("balance") ?? 0;

  const showcaseUsername = $("showcase-username");
  if (showcaseUsername) showcaseUsername.textContent = localStorage.getItem("name") ?? "User";

  handleLogin();
  handleRegister();

  loadMarket();
  loadCollection();
  loadShowcase();
  loadPacks();

  setupSellModal();
});