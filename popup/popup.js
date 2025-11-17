
// iOS 캘린더에 일정 추가 (ICS 파일 다운로드)

document.getElementById("ios-btn").addEventListener("click", () => {
    chrome.storage.local.get(["title", "date", "place"], data => {
        if (!data.title) {
            alert("저장된 일정이 없습니다!");
            return;
        }

        addToAppleCalendar(
            data.title,
            data.date,
            data.place,
            "덕성 Delight 프로그램 자동 등록"
        );
    });
});


function addToAppleCalendar(title, datetime, place, description = "") {
    const start = new Date(datetime);

    // UTC 기준으로 변환 (ICS 표준)
    function toUTC(dt) {
        return {
            yyyy: dt.getUTCFullYear(),
            mm: String(dt.getUTCMonth() + 1).padStart(2, "0"),
            dd: String(dt.getUTCDate()).padStart(2, "0"),
            hh: String(dt.getUTCHours()).padStart(2, "0"),
            mi: String(dt.getUTCMinutes()).padStart(2, "0"),
            ss: "00"
        };
    }

    const s = toUTC(start);
    const e = toUTC(new Date(start.getTime() + 60 * 60 * 1000)); // 1시간 뒤 종료

    const dtstart = `${s.yyyy}${s.mm}${s.dd}T${s.hh}${s.mi}${s.ss}Z`;
    const dtend   = `${e.yyyy}${e.mm}${e.dd}T${e.hh}${e.mi}${e.ss}Z`;

    const uid = `duk-${Date.now()}@auto-calendar`;

    // macOS에서는 줄바꿈을 CRLF로 넣어야 호환성이 더 좋음
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
DESCRIPTION:${description}
END:VEVENT
END:VCALENDAR`.replace(/\n/g, "\r\n");

    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);

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
