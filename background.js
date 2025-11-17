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
const COMPLETE_URL = "https://delight.duksung.ac.kr/ko/mypage/complete";

chrome.runtime.onInstalled.addListener(setupAlarm);
chrome.runtime.onStartup.addListener(setupAlarm);

function setupAlarm() {
  chrome.alarms.create("syncComplete", {
    delayInMinutes: 1,
    periodInMinutes: 30,   // 30분마다 한 번씩
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncComplete") {
    syncCompletePage();
  }
});

async function syncCompletePage() {
  try {
    const res = await fetch(COMPLETE_URL, { credentials: "include" });
    const html = await res.text();

    // 로그인 안 돼 있으면 그냥 조용히 스킵 (알림 X, 콘솔만)
    if (isLoginPage(html)) {
      console.log("[Delight] 로그인 안 된 상태, 동기화 생략");
      return;
    }

    // ✅ 여기서 '참여승인'만 골라냄
    const approved = parseApprovedPrograms(html);
    console.log("[Delight] 참여승인 항목 개수:", approved.length);

    await syncApprovedToCalendar(approved);
  } catch (e) {
    console.error("[Delight] 동기화 오류:", e);
  }
}

function isLoginPage(html) {
  // 실제 Delight 로그인 페이지 열어보고 공통 문구로 바꿔주면 됨
  return html.includes("로그인") && html.includes("아이디");
}
function parseApprovedPrograms(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // 신청 1건씩 감싸는 li
  const items = doc.querySelectorAll("li.tbody.application_list");
  const result = [];

  items.forEach((item) => {
    // 상태: <span class="status">승인대기</span> / <span class="status">참여승인</span> ...
    const rawStatus =
      item.querySelector("span.status")?.textContent.trim() || "";

    // 공백/줄바꿈 정리 (ex. "참여승인 " 이런 거)
    const statusText = rawStatus.replace(/\s+/g, ""); // 공백 제거

    // ✅ 참여승인만 캘린더 대상
    if (statusText !== "참여승인") return;

    // 제목: <span class="title">...</span>
    const title =
      item.querySelector("span.title")?.textContent.trim() || "";

    // 🔻 날짜/장소는 실제 클래스 이름 보고 한 번만 바꿔주면 됨
    // 이수내역 카드 안에서 "2025-12-22(월) 09:30" 텍스트가 들어있는 span을 검사해서
    // class 이름이 예를 들어 complete_date 라면 아래처럼 바꿔줘
    const dateText =
      item.querySelector("span.complete_date, span.date")?.textContent.trim() ||
      "";

    // 마찬가지로 "대면강의(차326)" 같은 위치 텍스트가 들어 있는 span의 class로 수정
    const place =
      item.querySelector("span.complete_place, span.place")?.textContent.trim() ||
      "";

    result.push({
      title,
      dateText,
      place,
      status: statusText,
    });
  });

  return result;
}


async function syncApprovedToCalendar(programs) {
  const stored = await chrome.storage.local.get("syncedPrograms");
  const prev = stored.syncedPrograms || [];

  const isSame = (a, b) => a.title === b.title && a.dateText === b.dateText;

  const newlyApproved = programs.filter(
    (p) => !prev.some((old) => isSame(old, p))
  );

  console.log("[Delight] 새로 캘린더 넣을 개수:", newlyApproved.length);

  // TODO: 구글 캘린더 API 호출 자리
  for (const p of newlyApproved) {
    console.log("[Calendar] 추가 예정:", p.title);
  }

  await chrome.storage.local.set({ syncedPrograms: programs });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "RUN_SYNC_ONCE") {
    syncCompletePage();
  }
});
