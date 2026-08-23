(() => {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // Die App bleibt auch ohne Service Worker normal nutzbar.
    });
  });

  // Ohne das hier läuft eine bereits offene/installierte Seite nach einem
  // Update mit dem ALTEN Code weiter, bis sie komplett geschlossen und neu
  // geöffnet wird — ein einfaches "Neu laden" reicht dafür oft nicht, weil
  // der alte Service Worker die Seite bis dahin noch kontrolliert. Sobald
  // der neue Service Worker übernimmt, laden wir deshalb einmalig automatisch
  // neu, damit Nutzer:innen davon nichts mitbekommen müssen.
  let reloadedForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadedForUpdate) return;
    reloadedForUpdate = true;
    window.location.reload();
  });
})();
