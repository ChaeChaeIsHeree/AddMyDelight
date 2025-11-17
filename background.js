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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "NAVER_LOGIN") {
        startNaverLogin();
    }
    return true;
});

function startNaverLogin() {
    const clientId = "네이버 Client ID";
    const redirectURI = encodeURIComponent(chrome.identity.getRedirectURL("callback"));
    const state = Math.random().toString(36).substring(2);

    const loginUrl =
        `https://nid.naver.com/oauth2.0/authorize?response_type=code` +
        `&client_id=${clientId}` +
        `&redirect_uri=${redirectURI}` +
        `&state=${state}`;

    chrome.identity.launchWebAuthFlow({
        url: loginUrl,
        interactive: true
    }, redirect => {
        if (chrome.runtime.lastError || !redirect) {
            console.error("❌ OAuth 실패:", chrome.runtime.lastError);
            return;
        }

        const url = new URL(redirect);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        exchangeToken(code, state);
    });
}

function exchangeToken(code, state) {
    const clientId = "네이버 Client ID";
    const clientSecret = "네이버 Client Secret";

    const tokenUrl =
        `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code` +
        `&client_id=${clientId}` +
        `&client_secret=${clientSecret}` +
        `&code=${code}&state=${state}`;

    fetch(tokenUrl)
        .then(res => res.json())
        .then(token => {
            console.log("🟢 Access Token:", token);

            chrome.storage.local.set({ naverToken: token }, () => {
                console.log("토큰 저장 완료");
            });
        });
}
