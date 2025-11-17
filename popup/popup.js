document.getElementById("login-naver").addEventListener("click", () => {
    startNaverLogin();
});

function startNaverLogin() {
    const clientId = "vYvDxIDPTQaD4PzbIDaG";
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
    const clientId = "vYvDxIDPTQaD4PzbIDaG";
    const clientSecret = "J54f1F3M_t";

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

document.getElementById("add-naver-calendar").addEventListener("click", () => {
    chrome.storage.local.get(["title", "date", "place", "naverToken"], data => {
        if (!data.naverToken?.access_token) {
            alert("먼저 네이버 로그인을 해주세요.");
            return;
        }
        addToNaverCalendarViaAPI(data);
    });
});

async function addToNaverCalendarViaAPI({ title, date, place, naverToken }) {
    const accessToken = naverToken.access_token;

    const url = "https://openapi.naver.com/calendar/createSchedule.json";
    const uid = "uid-" + Date.now();

    const start = new Date(date);
    const yyyy = start.getFullYear();
    const mm = String(start.getMonth()+1).padStart(2,"0");
    const dd = String(start.getDate()).padStart(2,"0");
    const hh = String(start.getHours()).padStart(2,"0");
    const mi = String(start.getMinutes()).padStart(2,"0");

    const dtstart = `${yyyy}${mm}${dd}T${hh}${mi}00`;

    const dtend = `${yyyy}${mm}${dd}T${String(start.getHours()+1).padStart(2,"0")}${mi}00`;

    const ical =
        "BEGIN:VCALENDAR\n" +
        "VERSION:2.0\n" +
        "CALSCALE:GREGORIAN\n" +
        "BEGIN:VEVENT\n" +
        `UID:${uid}\n` +
        `DTSTART;TZID=Asia/Seoul:${dtstart}\n` +
        `DTEND;TZID=Asia/Seoul:${dtend}\n` +
        `SUMMARY:${title}\n` +
        `LOCATION:${place}\n` +
        "END:VEVENT\n" +
        "END:VCALENDAR";

    const body = new URLSearchParams({
        calendarId: "defaultCalendarId",
        scheduleIcalString: ical
    });

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body
    });

    const result = await response.json();
    console.log(result);

    if (result.result === "success") alert("네이버 캘린더에 일정 등록 완료!");
    else alert("네이버 API 오류 발생");
}


// document.getElementById("add-naver-calendar").addEventListener("click", () => {
//     chrome.storage.local.get(["title", "date", "place", "naverToken"], data => {
//         if (!data.naverToken?.access_token) {
//             alert("먼저 네이버 로그인을 해주세요.");
//             return;
//         }
//         addToNaverCalendarViaAPI(data);
//     });
// });

// document.addEventListener("DOMContentLoaded", () => {
//     const btn = document.getElementById("add-naver-calendar");
    

//     if (!btn) {
//         console.error("❌ naver-btn element not found");
//         return;
//     }

//     btn.addEventListener("click", () => {
//         chrome.storage.local.get(["title", "date", "place"], data => {
//             if (!data.title) {
//                 console.error("❌ 저장된 데이터 없음");
//                 return;
//             }

//             console.log("📌 storage 데이터:", data);
//             addToNaverCalendar(data.title, data.date, data.place);
//         });
//     });
// });

// function addToNaverCalendar(title, datetime, place) {
//     const d = new Date(datetime);

//     const yyyy = d.getFullYear();
//     const mm = String(d.getMonth() + 1).padStart(2, "0");
//     const dd = String(d.getDate()).padStart(2, "0");

//     const HH = String(d.getHours()).padStart(2, "0");
//     const MM = String(d.getMinutes()).padStart(2, "0");

//     const startDate = `${yyyy}${mm}${dd}`;
//     const startTime = `${HH}${MM}`;

//     const url =
//         `https://calendar.naver.com/calendar/create`
//         + `?title=${encodeURIComponent(title)}`
//         + `&startDate=${startDate}`
//         + `&startTime=${startTime}`
//         + `&endDate=${startDate}`
//         + `&endTime=${startTime}`
//         + `&location=${encodeURIComponent(place)}`;

//     chrome.tabs.create({ url });
// }