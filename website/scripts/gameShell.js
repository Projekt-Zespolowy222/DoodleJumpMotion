// конфиг ОБНОВЛЕННЫЙ website
const SESSION_SERVICE_HTTP = "https://164-68-111-100.sslip.io/api/session";
const SESSION_SERVICE_WS = "wss://164-68-111-100.sslip.io/ws";

// ------- helpers -------
const getJwt = () => localStorage.getItem("jwt");
const getUser = () => JSON.parse(localStorage.getItem("user") || "{}");

// откуда берём sessionId
function getSessionId() {
  const q = new URLSearchParams(location.search).get("sessionId");
  if (q) return q;
  return localStorage.getItem("sessionId");
}

// ------- WS -------
let ws;
let sessionId;
let userId;

function openWS(sid) {
  return new Promise((resolve, reject) => {
    // headers НЕЛЬЗЯ ставить во второй параметр new WebSocket
    // для браузеров они передаются ЧЕРЕЗ query-string
    const url = `${SESSION_SERVICE_WS}?session_id=${sid}&token=${encodeURIComponent(
      getJwt(),
    )}`;
    ws = new WebSocket(url); // ← второй параметр убрали

    ws.onopen = () => console.log("[WS] connected");
    ws.onerror = (e) => reject(e);
    ws.onclose = () => console.log("[WS] closed");

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        console.log("[WS] <--", msg); // Теперь вы увидите входящие счета!

        const gameIframe = document.getElementById("gameIframe");
        if (!gameIframe) return;

        // Если пришел счет от сервера (не важно, ваш или чужой)
        if (msg.type === "score" || msg.type === "opponent_score") {
          // Извлекаем ID отправителя и значение
          // Подстраиваемся под формат вашего Go: msg.value.score или msg.value
          const scoreValue =
            typeof msg.value === "object" ? msg.value.score : msg.value;
          const senderId =
            typeof msg.value === "object" ? msg.value.user_id : msg.userId;

          // Пробрасываем в игру
          gameIframe.contentWindow.postMessage(
            {
              type: "OPPONENT_SCORE", // Игра должна слушать этот тип!
              value: scoreValue,
              userId: senderId,
            },
            "*",
          );
        }

        // Обработка смерти оппонента
        if (msg.type === "opponent_death") {
          gameIframe.contentWindow.postMessage(
            {
              type: "OPPONENT_DEATH",
              userId: msg.value,
            },
            "*",
          );
        }
      } catch (e) {
        console.error("Ошибка парсинга сообщения:", e);
      }
    };
  });
}
// ------- отправки -------
export function sendScore(val) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const msg = JSON.stringify({ type: "score", value: val });
  ws.send(msg);
  console.log("[WS] -->", msg);
}

export function sendDeath(uid) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const msg = JSON.stringify({ type: "player_death", value: uid });
  ws.send(msg);
  console.log("[WS] -->", msg);
}

// ------- подключение к готовой сессии -------
async function connectToReadySession() {
  userId = getUser().user_id;
  sessionId = getSessionId();

  if (!sessionId) {
    alert("Не задан sessionId (?session=42 или localStorage)");
    return;
  }

  // 1. получаем seed
  const res = await fetch(`${SESSION_SERVICE_HTTP}/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${getJwt()}` },
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  const seed = data.seed;
  const arenaId = data.arena_id;

  window.GAME_SEED = seed;
  window.ARENA_ID = arenaId;
  console.log("[INIT] подключаемся к сессии", sessionId, "seed", seed);

  const gameIframe = document.getElementById("gameIframe");

  const sendInitData = () => {
    gameIframe.contentWindow.postMessage(
      {
        type: "INIT_GAME", // Создадим специальный тип для инициализации
        seed: seed,
        userId: userId,
      },
      "*",
    );
  };

  if (gameIframe.contentWindow) {
    console.log("AP: ", gameIframe.contentWindow);
    sendInitData();
  } else {
    console.log("AP onload: ", gameIframe.contentWindow);
    gameIframe.onload = sendInitData;
  }

  // 2. открываем WS
  await openWS(sessionId);

  // 3. прокси postMessage от игры
  window.addEventListener("message", (e) => {
    if (e.origin !== "https://164-68-111-100.sslip.io/game-view") return;
    const { type, value } = e.data;
    if (type === "score") sendScore(value);
    if (type === "death") sendDeath(value);
  });

  // 4. опциональный join
  ws.send(JSON.stringify({ type: "join", user_id: userId }));
}

// ------- старт -------
document.addEventListener("DOMContentLoaded", () => {
  if (!getJwt()) {
    alert("Вы не авторизованы");
    location.href = "login.html";
    return;
  }
  connectToReadySession().catch((e) => {
    console.error("[INIT] failed", e);
    alert("Не удалось подключиться к сессии");
  });
});
