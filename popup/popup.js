console.log("[POPUP] popup.js 로드됨");

const btn = document.getElementById("sync-now");
const logEl = document.getElementById("log");

btn.addEventListener("click", () => {
  logEl.textContent += "버튼 클릭됨\n";

  chrome.runtime.sendMessage({ type: "RUN_SYNC_ONCE" });
});
