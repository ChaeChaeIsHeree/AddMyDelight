
// iOS 캘린더에 일정 추가 (ICS 파일 다운로드)

document.getElementById("ios-btn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {

        const currentURL = tabs[0].url;   // ←🔥 여기서 진짜 페이지 URL을 얻는다!

        // content script에서 일정 정보 요청
        chrome.tabs.sendMessage(tabs[0].id, { type: "GET_EVENT_DATA" }, data => {
            if (!data || !data.title) {
                alert("이 페이지에서는 일정을 찾을 수 없습니다.");
                return;
            }

            // ICS 생성
            createICS(data, currentURL);
        });
    });
});


// ==========================
// iOS/macOS ICS 파일 생성
// ==========================

  function createICS({ title, startDatetime, endDatetime, place, memo }, currentURL) {
    const start = new Date(startDatetime);
    const end = new Date(endDatetime);

    const formatUTC = d => {
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const hh = String(d.getUTCHours()).padStart(2, "0");
        const mi = String(d.getUTCMinutes()).padStart(2, "0");
        return `${yyyy}${mm}${dd}T${hh}${mi}00Z`;
    };

    const dtstart = formatUTC(start);
    const dtend = formatUTC(end);
    const uid = `ds-${Date.now()}@duk`;

    const ics =
`BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstart}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${title}
LOCATION:${place}
DESCRIPTION:${memo}
URL:${currentURL}
END:VEVENT
END:VCALENDAR`.replace(/\n/g, "\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    // 다운로드 트리거
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.ics`;
    a.click();

    URL.revokeObjectURL(url);
}




// 네이버 코드 
document.getElementById("login-naver").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "NAVER_LOGIN" });
});

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
