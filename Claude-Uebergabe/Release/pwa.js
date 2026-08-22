(() => {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // Die App bleibt auch ohne Service Worker normal nutzbar.
    });
  });
})();
