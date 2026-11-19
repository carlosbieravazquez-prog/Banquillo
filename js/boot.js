/* ===== Arranque ===== */
(function boot() {
  document.documentElement.lang = "es";
  UI.route = parseHash();
  if (UI.route.name === "clubes") { openClubManagement({ replace: true }); return; }
  render(true);
  Auth.start();
})();
