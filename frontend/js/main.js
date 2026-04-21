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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeImageUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.href);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch (e) {
    return "";
  }
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

/** Market banner: supports error vs success styling */
function setMarketNotice(message, variant = "error") {
  const el = $("market-notice");
  if (!el) return;
  if (!message) {
    el.textContent = "";
    el.hidden = true;
    el.classList.remove("form-notice--error", "form-notice--success");
    return;
  }
  el.textContent = message;
  el.hidden = false;
  el.classList.remove("form-notice--error", "form-notice--success");
  el.classList.add(variant === "success" ? "form-notice--success" : "form-notice--error");
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
      <img src="${safeImageUrl(card.image)}" alt="${escapeHtml(card.name)}" />
      <h3>${escapeHtml(card.name)}</h3>
      <p>${escapeHtml(card.rarity || "")}</p>
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
      if (res.is_admin) {
        localStorage.setItem("is_admin", "true");
        window.location.href = "admin.html";
      } else {
        localStorage.removeItem("is_admin");
        const next = new URLSearchParams(window.location.search).get("required");
        const dest = {
          packs: "packs.html",
          market: "market.html",
          collection: "collection.html",
          showcase: "showcase.html"
        }[next];
        window.location.href = dest || "market.html";
      }
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
/** @type {Array<object> | null} */
let marketListingsCache = null;

function populateMarketFilterSelects(cards) {
  const typeSel = $("filter-type");
  const raritySel = $("filter-rarity");
  if (!typeSel || !raritySel) return;

  const types = [...new Set(cards.map((c) => c.type).filter(Boolean))].sort();
  const rarities = [...new Set(cards.map((c) => c.level).filter(Boolean))].sort();

  const keepType = typeSel.value;
  const keepRarity = raritySel.value;

  typeSel.replaceChildren();
  typeSel.appendChild(new Option("All Types", ""));
  types.forEach((t) => typeSel.appendChild(new Option(t, t)));

  raritySel.replaceChildren();
  raritySel.appendChild(new Option("All Rarities", ""));
  rarities.forEach((r) => raritySel.appendChild(new Option(r, r)));

  if ([...typeSel.options].some((o) => o.value === keepType)) typeSel.value = keepType;
  if ([...raritySel.options].some((o) => o.value === keepRarity)) raritySel.value = keepRarity;
}

function getFilteredMarketListings() {
  if (!marketListingsCache) return [];
  const q = ($("search")?.value ?? "").trim().toLowerCase();
  const type = $("filter-type")?.value ?? "";
  const rarity = $("filter-rarity")?.value ?? "";
  const sort = $("sort-by")?.value ?? "price-asc";

  let list = [...marketListingsCache];

  if (q) {
    list = list.filter((c) => (c.card_name || "").toLowerCase().includes(q));
  }
  if (type) {
    list = list.filter((c) => c.type === type);
  }
  if (rarity) {
    list = list.filter((c) => c.level === rarity);
  }

  list.sort((a, b) => {
    const pa = Number(a.card_price);
    const pb = Number(b.card_price);
    if (sort === "price-desc") return pb - pa;
    return pa - pb;
  });

  return list;
}

function renderMarketGrid() {
  const grid = $("listings-grid");
  if (!grid) return;

  if (!marketListingsCache) return;

  if (marketListingsCache.length === 0) {
    grid.innerHTML = '<p class="muted">No listings yet.</p>';
    return;
  }

  const list = getFilteredMarketListings();
  if (list.length === 0) {
    grid.innerHTML = '<p class="muted">No listings match your filters.</p>';
    return;
  }

  const me = localStorage.getItem("username");
  grid.innerHTML = list
    .map((card) => {
      const isMine = Boolean(me && card.seller === me);
      const lid = Number(card.listing_id);
      const priceNum = Number(card.card_price);
      const priceBlock = isMine
        ? `<div class="market-price-row">
             <label for="listing-price-${lid}">Price (coins)</label>
             <input type="number" id="listing-price-${lid}" min="1" step="1" value="${priceNum}" />
             <button type="button" class="button-secondary" data-market-action="save-price" data-listing-id="${lid}">Save</button>
           </div>`
        : `<p>${priceNum} coins</p>`;
      const actionBlock = isMine
        ? `<button type="button" class="button-secondary" data-market-action="remove" data-listing-id="${lid}">Remove listing</button>`
        : `<button type="button" data-market-action="buy" data-listing-id="${lid}">Buy</button>`;
      return `
    <div class="card">
      <img src="${safeImageUrl(card.imageURL)}" alt="${escapeHtml(card.card_name)}" style="width:120px;border-radius:8px;" />
      <h3>${escapeHtml(card.card_name)}</h3>
      <p>${escapeHtml(card.type)} · ${escapeHtml(card.level)}</p>
      ${priceBlock}
      ${actionBlock}
    </div>
  `;
    })
    .join("");

  grid.querySelectorAll("[data-market-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const listingId = Number(button.dataset.listingId);
      if (!Number.isFinite(listingId)) return;

      if (button.dataset.marketAction === "save-price") {
        void saveListingPrice(listingId);
      } else if (button.dataset.marketAction === "remove") {
        void removeListing(listingId);
      } else if (button.dataset.marketAction === "buy") {
        void buyCard(listingId);
      }
    });
  });
}

function setupMarketFilters() {
  if (!$("listings-grid")) return;

  const rerender = () => renderMarketGrid();
  $("search")?.addEventListener("input", rerender);
  $("filter-type")?.addEventListener("change", rerender);
  $("filter-rarity")?.addEventListener("change", rerender);
  $("sort-by")?.addEventListener("change", rerender);
}

async function loadMarket() {
  const grid = $("listings-grid");
  if (!grid) return;

  const data = await fetchData("market.php");
  if (!data || data.error) {
    marketListingsCache = [];
    renderMarketGrid();
    return;
  }
  if (!Array.isArray(data)) {
    marketListingsCache = [];
    renderMarketGrid();
    return;
  }

  const tcgdex = new TCGdex("en");
  const cards = await Promise.all(
    data.map(async (listing) => {
      const id = listing.card_info_id;
      const card = id ? await tcgdex.card.get(id) : null;
      return { ...listing, imageURL: card?.getImageURL("low", "webp") ?? "" };
    })
  );

  marketListingsCache = cards;
  populateMarketFilterSelects(cards);
  renderMarketGrid();
}

async function removeListing(listingId) {
  const res = await fetchData("market.php?action=remove", {
    method: "POST",
    body: JSON.stringify({ listing_id: listingId })
  });
  if (res?.success) {
    loadMarket();
  } else {
    setMarketNotice(res?.error ?? "Could not remove listing.", "error");
  }
}

async function buyCard(listingId) {
  setMarketNotice("");

  const res = await fetchData("market.php?action=buy", {
    method: "POST",
    body: JSON.stringify({ listing_id: listingId })
  });

  if (res?.success) {
    if (res.balance != null) setBalanceDisplay(res.balance);
    else void refreshBalance();
    loadMarket();
    return;
  }

  const apiErr = res?.error ?? "";
  let msg =
    apiErr ||
    (res === null
      ? "Could not reach the server. Check that PHP is running and config.js API_BASE is correct."
      : "Purchase failed.");
  if (/cannot buy your own listing/i.test(apiErr) || /own listing/i.test(apiErr)) {
    msg = "You can't buy your own card.";
  }
  setMarketNotice(msg, "error");
  $("market-notice")?.scrollIntoView({ block: "start", behavior: "smooth" });
}

async function saveListingPrice(listingId) {
  const input = $(`listing-price-${listingId}`);
  const price = parseFloat(input?.value ?? "");
  if (!Number.isFinite(price) || price <= 0) {
    setMarketNotice("Enter a valid price greater than zero.", "error");
    $("market-notice")?.scrollIntoView({ block: "start", behavior: "smooth" });
    return;
  }

  setMarketNotice("");
  const res = await fetchData("market.php?action=update_price", {
    method: "POST",
    body: JSON.stringify({ listing_id: listingId, price })
  });

  if (res?.success) {
    const row = marketListingsCache?.find(
      (c) => Number(c.listing_id) === Number(listingId)
    );
    if (row) row.card_price = price;
    setMarketNotice("Price updated.", "success");
    $("market-notice")?.scrollIntoView({ block: "start", behavior: "smooth" });
    renderMarketGrid();
    return;
  }

  const msg =
    res?.error ||
    (res === null
      ? "Could not reach the server. Check that PHP is running and config.js API_BASE is correct."
      : "Could not update price.");
  setMarketNotice(msg, "error");
  $("market-notice")?.scrollIntoView({ block: "start", behavior: "smooth" });
}

// ---------- COLLECTION ----------
async function loadCollection() {
  const grid = $("collection-grid");
  if (!grid) return;

  const username = localStorage.getItem("username");
  if (!username) return;

  const data = await fetchData(`cards.php?username=${username}`);
  if (!data || data.length === 0 || data.error) {
    grid.innerHTML = '<p class="muted">No cards in your collection yet. <a href="packs.html">Open some packs</a> to get started!</p>';
    return;
  }

  const tcgdex = new TCGdex('en');
  const withImages = await Promise.all(data.map(async c => {
    const card = await tcgdex.card.get(c.card_info_id);
    return { ...c, imageURL: card?.getImageURL('low', 'webp') ?? '' };
  }));

  grid.innerHTML = withImages.map(c => `
    <div class="card-shell">
      <img src="${safeImageUrl(c.imageURL)}" alt="${escapeHtml(c.card_name)}" style="width:120px;border-radius:12px;" />
      <div>
        <h3>${escapeHtml(c.card_name)}</h3>
        <p class="muted">${escapeHtml(c.type)} · ${escapeHtml(c.level)}</p>
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
      <img src="${safeImageUrl(c.imageURL)}" alt="${escapeHtml(c.card_name)}" style="width:120px;border-radius:12px;" />
      <div style="margin-top:auto;">
        <h3>${escapeHtml(c.card_name)}</h3>
        <p class="muted">${escapeHtml(c.type)} · ${escapeHtml(c.level)}</p>
        <button data-showcase-action="remove" data-card-id="${Number(c.card_id)}">Remove</button>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll("[data-showcase-action='remove']").forEach((button) => {
    button.addEventListener("click", () => {
      const cardId = Number(button.dataset.cardId);
      if (Number.isFinite(cardId)) {
        void removeFromShowcase(cardId);
      }
    });
  });
}

async function removeFromShowcase(cardId) {
  await fetchData("showcase.php?action=remove", {
    method: "POST",
    body: JSON.stringify({ card_id: cardId })
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
    <div class="card-shell" style="cursor:pointer;" data-showcase-action="add" data-card-id="${Number(c.card_id)}">
      <img src="${safeImageUrl(c.imageURL)}" alt="${escapeHtml(c.card_name)}" style="border-radius:12px;" />
      <div><h3>${escapeHtml(c.card_name)}</h3><p class="muted">${escapeHtml(c.type)} · ${escapeHtml(c.level)}</p></div>
    </div>
  `).join("");

  list.querySelectorAll("[data-showcase-action='add']").forEach((item) => {
    item.addEventListener("click", () => {
      const cardId = Number(item.dataset.cardId);
      if (Number.isFinite(cardId)) {
        void addToShowcase(cardId);
      }
    });
  });

  $("add-to-showcase-modal").showModal();
}

async function addToShowcase(cardId) {
  const res = await fetchData("showcase.php?action=add", {
    method: "POST",
    body: JSON.stringify({ card_id: cardId })
  });
  if (res?.success) {
    $("add-to-showcase-modal").close();
    loadShowcase();
  } else {
    alert("Failed to add card: " + (res?.error ?? "Unknown error"));
  }
}

// ---------- TRAINER SEARCH ----------
function setupTrainerSearch() {
  const input = $("trainer-search");
  const suggestions = $("trainer-suggestions");
  if (!input) return;

  let debounce;
  input.addEventListener("input", () => {
    clearTimeout(debounce);
    const q = input.value.trim();
    if (!q) { suggestions.style.display = "none"; return; }
    debounce = setTimeout(async () => {
      const data = await fetchData(`auth.php?action=search&q=${encodeURIComponent(q)}`);
      if (!data || !data.length) { suggestions.style.display = "none"; return; }
      suggestions.innerHTML = data.map((u) => `
        <li style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <button type="button" data-trainer-username="${escapeHtml(u.username)}"
            style="padding:0.6rem 1rem;cursor:pointer;color:#eef2ff;background:transparent;border:0;width:100%;text-align:left;">
            <strong>${escapeHtml(u.name)}</strong> <span style="color:#a5b4d4;">@${escapeHtml(u.username)}</span>
          </button>
        </li>
      `).join("");
      suggestions.querySelectorAll("[data-trainer-username]").forEach((button) => {
        button.addEventListener("mousedown", (event) => event.preventDefault());
        button.addEventListener("click", () => {
          void loadTrainerProfile(button.dataset.trainerUsername || "");
        });
        button.addEventListener("mouseover", () => {
          button.style.background = "rgba(255,255,255,0.08)";
        });
        button.addEventListener("mouseout", () => {
          button.style.background = "transparent";
        });
      });
      suggestions.style.display = "block";
    }, 250);
  });

  input.addEventListener("blur", () => setTimeout(() => { suggestions.style.display = "none"; }, 150));
}

async function loadTrainerProfile(username) {
  $("trainer-suggestions").style.display = "none";
  $("trainer-search").value = username;

  const [profile, showcaseData] = await Promise.all([
    fetchData(`auth.php?action=profile&username=${encodeURIComponent(username)}`),
    fetchData(`showcase.php?username=${encodeURIComponent(username)}`)
  ]);

  if (!profile || profile.error) return;

  $("tp-name").textContent = profile.name;
  $("tp-username").textContent = profile.username;

  const profileSection = $("trainer-profile");
  profileSection.style.display = "block";

  const grid = $("tp-showcase-grid");
  const cards = (showcaseData || []).flatMap(s => s.cards);

  if (!cards.length) {
    grid.innerHTML = '<p class="muted">This trainer has no showcase cards yet.</p>';
    return;
  }

  const tcgdex = new TCGdex('en');
  const withImages = await Promise.all(cards.map(async c => {
    const card = await tcgdex.card.get(c.card_info_id);
    return { ...c, imageURL: card?.getImageURL('low', 'webp') ?? '' };
  }));

  grid.innerHTML = withImages.map(c => `
    <div class="card-shell">
      <img src="${safeImageUrl(c.imageURL)}" alt="${escapeHtml(c.card_name)}" style="width:120px;border-radius:12px;" />
      <div><h3>${escapeHtml(c.card_name)}</h3><p class="muted">${escapeHtml(c.type)} · ${escapeHtml(c.level)}</p></div>
    </div>
  `).join("");
}

// ---------- PACKS ----------
async function loadPacks() {
  const grid = $("packs-grid");
  if (!grid) return;

  const data = await fetchData("packs.php");
  if (data == null) {
    grid.innerHTML =
      '<p class="muted">Could not load packs. Check that PHP is running, <code>config.js</code> <code>API_BASE</code> matches your server (e.g. <code>http://localhost:8888/backend/api</code>), and the database is up.</p>';
    return;
  }
  if (data.error) {
    grid.innerHTML = `<p class="muted">${escapeHtml(String(data.error))}</p>`;
    return;
  }
  if (!Array.isArray(data) || data.length === 0) {
    grid.innerHTML =
      '<p class="muted">No pack types in the database yet. From the project root run: <code>php backend/scripts/seed_packs.php</code> (needs internet), then refresh this page.</p>';
    return;
  }

  grid.innerHTML = data.map(pack => `
    <div class="card-shell">
      <div class="card-image">${escapeHtml(pack.pack_type_name)}</div>
      <div style="margin-top:auto;">
        <h3 style="margin-bottom:0.4rem;">${escapeHtml(pack.pack_type_name)}</h3>
        <div class="card-meta" style="margin-bottom:0.75rem;"><span>${escapeHtml(pack.pack_price)} coins</span></div>
        <button type="button" data-pack-type-id="${escapeHtml(pack.pack_type_id)}">Open Pack</button>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll("[data-pack-type-id]").forEach((button) => {
    button.addEventListener("click", () => {
      void openPack(button.dataset.packTypeId || "");
    });
  });
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
      <img src="${safeImageUrl(c.imageURL)}" alt="${escapeHtml(c.card_name)}" style="width:120px;border-radius:12px;" />
      <div>
        <h3>${escapeHtml(c.card_name)}</h3>
        <p class="muted">${escapeHtml(c.type)} · ${escapeHtml(c.level)}</p>
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
  const select = $("sell-card");
  const sellNotice = $("sell-error");

  if (!openBtn || !modal) return;

  openBtn.onclick = async () => {
    setFormNotice(sellNotice, "");
    const username = localStorage.getItem("username");
    if (!username || !select) {
      alert("Log in to sell cards.");
      return;
    }

    const data = await fetchData(`cards.php?username=${encodeURIComponent(username)}`);
    select.innerHTML = "";

    if (!data || data.error) {
      select.innerHTML = '<option value="">Could not load collection</option>';
      modal.showModal();
      return;
    }
    if (!Array.isArray(data) || data.length === 0) {
      select.innerHTML = '<option value="">No cards in collection</option>';
      modal.showModal();
      return;
    }

    data.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = String(c.card_id);
      opt.textContent = `${c.card_name} (${c.type})`;
      select.appendChild(opt);
    });

    modal.showModal();
  };

  closeBtn.onclick = () => {
    setFormNotice(sellNotice, "");
    modal.close();
  };

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setFormNotice(sellNotice, "");
    const raw = Object.fromEntries(new FormData(form));
    const card_id = parseInt(raw.card_id, 10);
    const price = parseFloat(raw.price);

    let response;
    let body;
    try {
      response = await fetch(`${API_BASE}/sell.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ card_id, price })
      });
      body = await response.json().catch(() => ({}));
    } catch (err) {
      console.error(err);
      setFormNotice(sellNotice, "Could not list card.");
      sellNotice?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }

    if (body?.success) {
      void refreshBalance();
      setFormNotice(sellNotice, "");
      modal.close();
      loadMarket();
    } else if (response.status === 409 || /already listed/i.test(body?.error ?? "")) {
      setFormNotice(sellNotice, "This card is already listed for sale.");
      sellNotice?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else {
      setFormNotice(sellNotice, body?.error ?? "Could not list card.");
      sellNotice?.scrollIntoView({ block: "nearest", behavior: "smooth" });
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

  setupTrainerSearch();
  setupMarketFilters();
  loadMarket();
  loadCollection();
  loadShowcase();
  loadPacks();

  setupSellModal();

  if (localStorage.getItem("is_admin") === "true") {
    document.querySelectorAll(".admin-nav-link").forEach((el) => {
      el.style.display = "";
    });
  }
});
