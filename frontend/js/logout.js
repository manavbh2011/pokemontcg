(function () {
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-logout]");
    if (!a) return;
    e.preventDefault();
    var dest = a.getAttribute("href") || "login.html";
    fetch(API_BASE + "/auth.php?action=logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    })
      .catch(function () {})
      .finally(function () {
        localStorage.removeItem("username");
        localStorage.removeItem("name");
        localStorage.removeItem("balance");
        window.location.href = dest;
      });
  });
})();
