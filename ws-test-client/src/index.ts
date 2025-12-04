import WebSocket from "ws";
import axios from "axios";

const SESSION_SERVICE_URL = "http://localhost:8083";
const WS_URL = "ws://localhost:8083/ws";

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

// // ========== WS CLIENT ==========

// class WSClient {
//   ws: WebSocket;
//   userId: number;
//   sessionId: number;

//   constructor(url: string, userId: number, sessionId: number, token: string) {
//     this.userId = userId;
//     this.sessionId = sessionId;

//     this.ws = new WebSocket(`${url}?session_id=${sessionId}`, {
//       headers: { Authorization: `Bearer ${token}` },
//     });

//     this.ws.on("open", () => {
//       console.log(`User ${userId} connected → sending JOIN`);
//       this.join();
//     });

//     this.ws.on("message", (msg) =>
//       console.log(`User ${userId} received: ${msg.toString()}`)
//     );

//     this.ws.on("close", () =>
//       console.log(`User ${userId} disconnected (WS closed)`)
//     );

//     this.ws.on("error", (err) =>
//       console.error(`User ${userId} error:`, err.message)
//     );
//   }

//   join() {
//     this.ws.send(JSON.stringify({ type: "join", user_id: this.userId }));
//   }

//   sendScore(score: number) {
//     this.ws.send(JSON.stringify({ type: "score", value: score }));
//   }

//   sendDeath() {
//     this.ws.send(JSON.stringify({ type: "player_death", value: this.userId }));
//   }

//   close() {
//     this.ws.close();
//   }
// }

// ========== CREATE SESSION ==========

async function createSession(player1Id: number, player2Id: number) {
  const res = await axios.post(
    `${SESSION_SERVICE_URL}/sessions`,
    { player1_id: player1Id, player2_id: player2Id },
    { headers: { Authorization: `Bearer ${players[0].jwt}` } }
  );
  return res.data.ID;
}

// ========== STATIC TEST SCENARIO ==========

async function simulateGame() {
  const sessionId = await createSession(players[0].id, players[1].id);
  console.log("Created session:", sessionId);

  const clients = players.map(
    (p) => new WSClient(WS_URL, p.id, sessionId, p.jwt)
  );

  // Ждём подключения и обработки join
  await new Promise((res) => setTimeout(res, 500));

  console.log("=== STARTING STATIC GAME SCENARIO ===");

  // ---------- PLAYER 1 ----------
  clients[0].sendScore(100);
  await wait(300);

  clients[0].sendScore(140);
  await wait(300);

  clients[0].sendScore(167);
  await wait(300);

  console.log("Player 1 died");
  clients[0].sendDeath();
  await wait(500);

  // ---------- PLAYER 11 ----------
  clients[1].sendScore(90);
  await wait(300);

  clients[1].sendScore(160);
  await wait(300);

  clients[1].sendScore(176);
  await wait(300);

  clients[1].sendScore(456);
  await wait(500);

  console.log("=== CLOSING CLIENTS ===");
  clients.forEach((c) => c.close());
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

class WSClient {
  ws: WebSocket;
  userId: number;
  sessionId: number;

  constructor(url: string, userId: number, sessionId: number, token: string) {
    this.userId = userId;
    this.sessionId = sessionId;

    this.ws = new WebSocket(`${url}?session_id=${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    this.ws.on("open", () => {
      console.log(`[INFO] User ${userId} connected to session ${sessionId}`);
      this.join();
    });

    this.ws.on("message", (msg) => {
      console.log(`[IN] User ${userId} received: ${msg.toString()}`);
    });

    this.ws.on("close", () => {
      console.log(`[INFO] User ${userId} disconnected (WS closed)`);
    });

    this.ws.on("error", (err) => {
      console.error(`[ERROR] User ${userId} error:`, err.message);
    });

    console.log("[DEBUG] NEW WSClient loaded with [IN]/[OUT] logging");
  }

  join() {
    const msg = JSON.stringify({ type: "join", user_id: this.userId });
    console.log(`[OUT] User ${this.userId} sending: ${msg}`);
    this.ws.send(msg);
  }

  sendScore(score: number) {
    const msg = JSON.stringify({ type: "score", value: score });
    console.log(`[OUT] User ${this.userId} sending: ${msg}`);
    this.ws.send(msg);
  }

  sendDeath() {
    const msg = JSON.stringify({ type: "player_death", value: this.userId });
    console.log(`[OUT] User ${this.userId} sending: ${msg}`);
    this.ws.send(msg);
  }

  close() {
    this.ws.close();
  }
}

// Start
simulateGame();
