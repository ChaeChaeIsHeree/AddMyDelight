// background/background.js
/**
 * 
알람(30분마다 동기화)

Delight 이수내역 페이지 fetch

로그인 여부 판단

참여승인만 파싱

(나중에 캘린더 API 추가)
 * 
 * 
 * 
 */
console.log("[BG] background.js loaded");

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "SYNC_APPROVED") {
    const items = msg.data;
    console.log("[BG] received approved:", items);

    // TODO: 구글 캘린더 저장
  }
});