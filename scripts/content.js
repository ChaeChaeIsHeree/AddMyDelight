console.log("[CS] delight page loaded");

// 이수내역 페이지일 때만 동작하게 설정 가능
if (location.href.includes("/mypage/complete")) {
    syncFromPage();
}

function syncFromPage() {
    const items = document.querySelectorAll("li.tbody.application_list");
    const approved = [];

    items.forEach((item) => {
        const status = item.querySelector("span.status")?.innerText.replace(/\s+/g, "");
        if (status !== "참여승인") return;

        const title = item.querySelector("span.title a")?.innerText.trim();

        const dateText = item.querySelector("span.date time")?.innerText.trim();

        const placeEl = item.querySelector("span.date p:nth-of-type(2)");
        const place = placeEl ? placeEl.textContent.replace(/\s+/g, "").trim() : "";

        const place2 = item.querySelector("span.date p:nth-of-type(2)")?.innerText
        .replace(/\s*\S+\s*/, "").trim();

        approved.push({ title, dateText, place });
    });

    console.log("[CS] approved:", approved);

    chrome.runtime.sendMessage({
        type: "SYNC_APPROVED",
        data: approved
    });
}
