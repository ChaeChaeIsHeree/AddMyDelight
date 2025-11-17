console.log("[CS] delight page loaded");

// =====================================================================
// A) 메인 페이지(/ko/) 접근 시 → complete 페이지 데이터 벗겨오기
// =====================================================================

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

            // 1. 참여승인 여부 체크
            // const status = item.querySelector("span.status")?.innerText.replace(/\s+/g, "");
            const status = item.querySelector("span.status")?.innerText || "";
            if (!status.includes("참여승인")) return;
            console.log(status);

            // 2. 제목
            const title = item.querySelector("span.title a")?.innerText.trim();

            // 3. 날짜(datetime)
            const date = item.querySelector("span.date time")?.getAttribute("datetime");

            // 4. 장소
            const place = item.querySelector("span.date p:nth-of-type(2)")?.innerText.trim();

            approved.push({ title, date, place });
            chrome.storage.local.set({ title, date, place }, () => {
                console.log("📌 저장 완료:", { title, date, place });
                if (chrome.runtime.lastError) {
                        console.error("Storage error:", chrome.runtime.lastError);
                    }
                });

        });

        console.log("📌 [FETCH] approved:", approved);
        // console.log(html);  // fetch로 받은 HTML 전체 보기
        // console.log(doc.body.innerHTML);

        // 백그라운드로 데이터 전송
        chrome.runtime.sendMessage({
            type: "SYNC_APPROVED",
            data: approved
        });

    } catch (err) {
        console.error("❌ complete 데이터 fetch 중 오류:", err);
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
    console.log("📌 /mypage/complete 페이지 직접 접속 감지 → DOM 파싱 시작");

    const items = document.querySelectorAll("li.tbody.application_list");
    const approved = [];

    items.forEach((item) => {
        const status = item.querySelector("span.status")?.innerText.replace(/\s+/g, "");
        if (status !== "참여승인") return;

        const title = item.querySelector("span.title a")?.innerText.trim();
        const dateText = item.querySelector("span.date time")?.innerText.trim();

        const placeEl = item.querySelector("span.date p:nth-of-type(2)");
        const place = placeEl ? placeEl.textContent.trim() : "";

        approved.push({ title, dateText, place });
    });

    console.log("[CS] approved (DOM 기반):", approved);

    chrome.runtime.sendMessage({
        type: "SYNC_APPROVED",
        data: approved
    });
}
