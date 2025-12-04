import WebSocket from "ws";

export class WSClient {
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
