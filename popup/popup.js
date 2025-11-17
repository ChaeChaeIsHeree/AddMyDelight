document.getElementById("sync-now").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "RUN_SYNC_ONCE" });
});
