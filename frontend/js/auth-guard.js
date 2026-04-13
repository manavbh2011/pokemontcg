(function () {
  var file = (window.location.pathname.split("/").pop() || "").toLowerCase();

  if (file === "admin.html") {
    if (localStorage.getItem("is_admin") !== "true") {
      window.location.replace("login.html");
    }
    return;
  }

  if (localStorage.getItem("username")) return;
  var map = {
    "packs.html": "packs",
    "market.html": "market",
    "collection.html": "collection",
    "showcase.html": "showcase"
  };
  var key = map[file];
  if (!key) return;
  window.location.replace("login.html?required=" + encodeURIComponent(key));
})();
