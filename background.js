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
        syncCalendar(msg.data);
    }
});

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

    const text = await res.text();

    if (!res.ok) {
        console.error("[Error] Google API Error:", text);
        throw new Error(text);
    }

    const created = JSON.parse(text);
    return created.id;  // ⬅ eventId를 syncCalendar에 넘겨 저장하게 함

}

// -----------------------
// Google Calendar API: 이벤트 삭제
// -----------------------
async function deleteCalendarEvent(token, eventId) {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

    const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 204) {
        console.log("🗑 삭제 완료:", eventId);
        return true;
    }

    console.warn("[Error] 삭제 실패:", await res.text());
    return false;
}

// =============================================================
//   승인 일정 동기화 (추가 + 중복방지 + 취소삭제)
// =============================================================
async function syncCalendar(approvedPrograms) {
    try {
        const token = await getGoogleToken();

        // 저장된 이벤트 불러오기
        const stored = await chrome.storage.local.get("savedEvents");
        const savedEvents = stored.savedEvents || {};

        // Delight 승인 목록 key 생성
        const approvedKeys = approvedPrograms.map(p => `${p.title}_${p.date}`);

        // 1) 승인된 프로그램 중 "새로운" 일정만 추가
        for (const p of approvedPrograms) {
            const key = `${p.title}_${p.date}`;

            const start = new Date(p.date);
            const end = new Date(start.getTime() + 60 * 60 * 1000);

            p.startISO = start.toISOString();
            p.endISO = end.toISOString();

            if (savedEvents[key]) {
                console.log("⏭ 이미 존재 → 스킵:", key);
                continue;
            }

            console.log("➕ 새 일정 추가:", p.title);

            const eventId = await insertCalendarEvent(token, p);
            if (!eventId) continue;

            savedEvents[key] = {
                eventId,
                title: p.title,
                date: p.date,
                place: p.place,
                startISO: p.startISO,
                endISO: p.endISO
            };
        }

        // 2) Delight에서 사라진 일정 = 취소된 일정
        for (const key of Object.keys(savedEvents)) {
            if (!approvedKeys.includes(key)) {
                const eventId = savedEvents[key].eventId;
                console.log("🗑 취소됨 → 캘린더 삭제:", key);

                const ok = await deleteCalendarEvent(token, eventId);
                if (ok) delete savedEvents[key];
            }
        }

        await chrome.storage.local.set({ savedEvents });
        console.log("✨ 캘린더 동기화 완료");

    } catch (err) {
        console.error("[ERROR] syncCalendar:", err);
    }
}

// Token 가져오기 helper
function getGoogleToken() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, token => {
            if (chrome.runtime.lastError || !token) return reject(chrome.runtime.lastError);
            resolve(token);
        });
    });
}
