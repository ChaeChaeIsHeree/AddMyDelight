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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "SYNC_APPROVED") {
        console.log("[BG] received approved:", msg.data);
        addProgramsToCalendar(msg.data);
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "NAVER_LOGIN") {
        startNaverLogin();
    }
    return true;
});

function startNaverLogin() {
    const clientId = window._ENV_.NAVER_CLIENT_ID;
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
    const clientId = window._ENV_.NAVER_CLIENT_ID;;
    const clientSecret = window._ENV_.NAVER_CLIENT_SECRET;

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

// -----------------------
// Google OAuth 토큰 가져오기
// -----------------------
chrome.identity.getAuthToken({interactive: true}, async (token) => {
  console.log("TOKEN:", token);

  const event = {
    summary: "테스트 일정",
    start: { dateTime: new Date().toISOString(), timeZone: "Asia/Seoul" },
    end: { dateTime: new Date(Date.now()+3600000).toISOString(), timeZone: "Asia/Seoul" }
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    }
  );

  console.log("API RESULT:", await res.text());
});


// -----------------------
// Google Calendar API 호출
// -----------------------
async function insertCalendarEvent(token, program) {

    const event = {
        summary: program.title,
        location: program.place || "",
        start: {
            dateTime: program.startISO,
            timeZone: "Asia/Seoul"
        },
        end: {
            dateTime: program.endISO,
            timeZone: "Asia/Seoul"
        }
    };

    const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(event)
        }
    );

    if (!res.ok) {
        const text = await res.text();
        console.error("[Error] Google API Error:", text);
        throw new Error(text);
    }
}
// -----------------------
// 여러 프로그램을 캘린더에 넣는 함수
// -----------------------
async function addProgramsToCalendar(programs) {
    try {
        // 토큰 가져오기
        const token = await new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError || !token) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(token);
            });
        });

        console.log("[TOKEN] (for approved programs):", token);

        // 승인된 프로그램 하나씩 추가
        for (const program of programs) {
            // 시작 ISO
            const start = new Date(program.date);

            // 종료 시간 없으면 +1시간
            const end = new Date(start.getTime() + 60 * 60 * 1000);

            program.startISO = start.toISOString();
            program.endISO = end.toISOString();

            console.log("Final Event Time:", program.startISO, program.endISO);

            await insertCalendarEvent(token, program);
        }

        console.log("[Success] All approved programs added to calendar");

    } catch (err) {
        console.error("[Error] addProgramsToCalendar ERROR:", err);
    }
}

