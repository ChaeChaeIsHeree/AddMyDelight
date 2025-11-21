
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