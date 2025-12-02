import WebSocket from "ws";

export class WSClient {
  private ws: WebSocket;
  private userId: number;
  private sessionId: number;

  constructor(url: string, userId: number, sessionId: number, token: string) {
    this.userId = userId;
    this.sessionId = sessionId;

    // Добавляем JWT и session_id в query params
    this.ws = new WebSocket(`${url}?session_id=${sessionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    this.ws.on("open", () => {
      console.log(`User ${userId} connected to session ${sessionId}`);
    });

    this.ws.on("message", (msg) => {
      console.log(`User ${userId} received: ${msg.toString()}`);
    });

    this.ws.on("close", () => {
      console.log(`User ${userId} disconnected`);
    });

    this.ws.on("error", (err) => {
      console.error(`User ${userId} error:`, err.message);
    });
  }

  sendMessage(message: string) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      console.log(`User ${this.userId} cannot send message, WS not open`);
    }
  }
}
