(function () {
  if (localStorage.getItem("username")) return;
  var file = (window.location.pathname.split("/").pop() || "").toLowerCase();
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
