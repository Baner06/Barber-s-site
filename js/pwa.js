// Registro del service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.error("SW error:", err));
  });
}

// Banner de instalación (Añadir a pantalla de inicio)
let deferredPrompt = null;
const banner = document.getElementById("installBanner");
const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (banner) banner.classList.add("visible");
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    banner.classList.remove("visible");
  });
}

window.addEventListener("appinstalled", () => {
  if (banner) banner.classList.remove("visible");
});
