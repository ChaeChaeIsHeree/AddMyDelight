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

        const title = item.querySelector("span.title")?.innerText.trim();
        const dateText = item.querySelector("span.complete_condition")?.innerText.trim();
        const place = item.querySelector("span.online")?.innerText.trim();

        approved.push({ title, dateText, place });
    });

    console.log("[CS] approved:", approved);

    chrome.runtime.sendMessage({
        type: "SYNC_APPROVED",
        data: approved
    });
}
