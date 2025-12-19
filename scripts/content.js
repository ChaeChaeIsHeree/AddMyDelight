console.log("[CS] delight page loaded");

// =====================================================================
// A) 메인 페이지(/ko/) 접근 시 → complete 페이지 데이터 벗겨오기
// =====================================================================
function parseKoreanDateToISO(dateText) {
    // "2025-12-22(월) 09:30"
    const cleaned = dateText.replace(/\(.*?\)/, "").trim();
    // "2025-12-22 09:30"

    const [date, time] = cleaned.split(" ");
    return `${date}T${time}:00`;
}

(async () => {
    const href = location.href;

    // 1) 메인 페이지일 때만 실행 (중복 방지)
    // 조건: /ko/ 는 포함하지만 /mypage/complete 는 제외
    if (!(href.includes("/ko/") && !href.includes("/mypage/complete"))) return;

    console.log("📌 Delight 메인 페이지 감지됨 → complete 페이지 데이터를 가져오는 중...");

    try {
        // complete 페이지 HTML 가져오기
        const res = await fetch("https://delight.duksung.ac.kr/ko/mypage/complete/list/wait/1", {
            credentials: "include"
        });

        const html = await res.text();

        // HTML → DOM으로 변환
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // 데이터 추출
        const items = doc.querySelectorAll("li.tbody.application_list");
        const approved = [];

        // items.forEach((item, idx) => {
        //     console.log("=== ITEM", idx, "===");
        //     console.log(item.outerHTML);
        // });


        items.forEach((item) => {
            const status = item.querySelector("span.status")?.innerText
            .replace(/\s+/g, "")
            .trim();

            if (status !== "참여승인") return;

            const title = item.querySelector("span.title a")?.innerText.trim();
            const dateText = item.querySelector("span.date time")?.getAttribute("datetime");
            const place = item.querySelector("span.date p:nth-of-type(2)")?.innerText.trim();

            approved.push({
                title,
                dateISO: dateText,
                place
            });
});


        console.log("[FETCH] approved:", approved);
        // console.log(html);  // fetch로 받은 HTML 전체 보기
        // console.log(doc.body.innerHTML);

        // 백그라운드로 데이터 전송
       if (approved.length > 0) {
        chrome.runtime.sendMessage({
            type: "SYNC_APPROVED",
            data: approved
        });
} else {
    console.warn("⚠ 승인 데이터 없음 → 메시지 전송 생략");
}


    } catch (err) {
        console.error("[Error] complete 데이터 fetch 중 오류:", err);
    }
})();


function addToNaverCalendar(title, date, place) {
    const start = new Date(date);
    const yyyy = start.getFullYear();
    const mm = String(start.getMonth() + 1).padStart(2, "0");
    const dd = String(start.getDate()).padStart(2, "0");
    const hh = String(start.getHours()).padStart(2, "0");
    const min = String(start.getMinutes()).padStart(2, "0");

    const url = `https://calendar.naver.com/calendar/create?title=${encodeURIComponent(title)}&startDate=${yyyy}${mm}${dd}&startTime=${hh}${min}&endDate=${yyyy}${mm}${dd}&endTime=${hh}${min}&location=${encodeURIComponent(place)}`;

    window.open(url, "_blank");
}


// =====================================================================
// B) 실제 complete 페이지 방문 시 실행되는 코드
// =====================================================================

if (location.href.includes("/mypage/complete")) {
    syncFromPage();
}

function syncFromPage() {
    console.log("[CS] /mypage/complete 페이지 직접 접속 감지 → DOM 파싱 시작");

    const items = document.querySelectorAll("li.tbody.application_list");
    const approved = [];

    items.forEach((item) => {
        const status = item.querySelector("span.status")?.innerText
            .replace(/\s+/g, "")
            .trim();

        if (status !== "참여승인") return;

        const title = item.querySelector("span.title a")?.innerText.trim();
        const dateText = item.querySelector("span.date time")?.innerText.trim();
        const dateISO = parseKoreanDateToISO(dateText);

        const placeEl = item.querySelector("span.date p:nth-of-type(2)");
        const place = placeEl ? placeEl.textContent.trim() : "";

        approved.push({
            title,
            dateISO,
            place
        });
    });

    console.log("[CS] approved (DOM 기반):", approved);

    chrome.runtime.sendMessage({
        type: "SYNC_APPROVED",
        data: approved
    });
}
// ===============================

// -----------------------
// Google Calendar 등록 함수
// -----------------------
async function addProgramsToCalendar(programs) {
    try {
        const token = await getAuthToken();

        for (const p of programs) {
            await insertCalendarEvent(token, p);
            console.log("[CS] 캘린더 등록 완료:", p.title);
        }

    } catch (err) {
        console.error("[Error] 캘린더 등록 오류:", err);
    }
}

// ios 

// ===============================
// popup → content.js 요청 받기
// ===============================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "GET_EVENT_DATA") {
        const data = extractEventData();
        sendResponse(data);
    }
});


// ===============================
// 상세페이지 일정 데이터 추출 함수
// ===============================
function extractEventData() {
    // 🔹 1) 제목 <b> 안의 텍스트
    const rawTitle = document.querySelector("li .default label b")?.innerText.trim() || "";

    let title = rawTitle.replace(/m\d+\s*점/gi, "")
                        .replace(/p\d+\s*점/gi, "")
                        .replace(/\s+/g, " ")
                        .trim();

    // 🔹 2) time 태그 두 개 (시작 / 종료)
    const timeEls = document.querySelectorAll("li .default label time");
    const startDatetime = timeEls[0]?.getAttribute("datetime") || "";
    const endDatetime = timeEls[1]?.getAttribute("datetime") || "";

    // 🔹 3) 장소 <i class="fa fa-map-marker"> 옆 span
    const place =
        document.querySelector("i.fa-map-marker + span")?.innerText.trim() || "";

    // 🔹 4) 메모 (문의사항)
    const email = document.querySelector("i.fa.fa-envelope + span")?.innerText.trim() || "";
    const phone = document.querySelector("i.fa.fa-phone + span")?.innerText.trim() || "";

    let memo = "";
    if (email) memo += `문의 이메일: ${email} `;
    if (phone) memo += `문의 전화: ${phone}`;

    return {
        title,
        startDatetime,
        endDatetime,
        place,
        memo
    };
}
