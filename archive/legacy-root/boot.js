/* ===== Arranque ===== */
(function boot() {
  document.documentElement.lang = "es";
  UI.route = parseHash();
  render(true);
  Auth.start();
})();
