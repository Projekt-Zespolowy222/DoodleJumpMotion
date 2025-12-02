import WebSocket from "ws";
import axios from "axios";

// WS сервер и ID сессии
const SESSION_SERVICE_URL = "http://localhost:8083";
const WS_URL = "ws://localhost:8083/ws";

// Игроки с JWT
const players = [
  {
    id: 2,
    jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjQ5NDA5ODksInJvbGUiOiJwbGF5ZXIiLCJ1c2VyX2lkIjoyLCJ1c2VybmFtZSI6InRlc3R1c2VyMiJ9.dq89m3riiq3xzU4ol9acU2WJl0VovQbtK1VMG_BNHIM",
  },
  {
    id: 11,
    jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjQ5NDEwMTUsInJvbGUiOiJwbGF5ZXIiLCJ1c2VyX2lkIjoxMSwidXNlcm5hbWUiOiJ0ZXN0RGFuaWlsIn0.P9NMmWNe-cYFOPNui7Djgcblx9g4e-yZxqVFB4s-W-o",
  },
];

// 1️⃣ Создаём сессию через API
async function createSession(player1Id: number, player2Id: number) {
  const response = await axios.post(
    `${SESSION_SERVICE_URL}/sessions`,
    { player1_id: player1Id, player2_id: player2Id },
    { headers: { Authorization: `Bearer ${players[0].jwt}` } } // можно любой JWT
  );
  return response.data.ID; // вернёт ID сессии
}

async function startTest() {
  const sessionId = await createSession(players[0].id, players[1].id);
  console.log("Created session with ID:", sessionId);

  // 2️⃣ Подключаем игроков к WS с заголовками
  const wsClients = players.map((p) => {
    const ws = new WebSocket(`${WS_URL}?session_id=${sessionId}`, {
      headers: {
        Authorization: `Bearer ${p.jwt}`,
      },
    });

    ws.on("open", () => console.log(`User ${p.id} connected`));
    ws.on("message", (msg) => console.log(`User ${p.id} received: ${msg}`));
    ws.on("close", () => console.log(`User ${p.id} disconnected`));
    ws.on("error", (err) => console.error(`User ${p.id} error:`, err));

    return ws;
  });

  // 3️⃣ Отправляем тестовое сообщение после подключения
  setTimeout(() => {
    wsClients.forEach((ws, i) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(`Привет от игрока ${players[i].id}!`);
      } else {
        console.log(`User ${players[i].id} cannot send message, WS not open`);
      }
    });
  }, 2000);
}

startTest();
