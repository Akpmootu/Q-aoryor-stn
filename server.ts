import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";

interface QueueState {
  prefix: string; // "W" or "O"
  numbers: {
    W: number;
    O: number;
  };
  counter: string;
}

const queueState: QueueState = {
  prefix: "W",
  numbers: {
    W: 1,
    O: 1,
  },
  counter: "1",
};

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });
  
  const PORT = 3000;

  // Socket.IO logic
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    // Send current state to newly connected client
    socket.emit("queue:state", queueState);

    socket.on("queue:call", (data: { counter: string, prefix: string }) => {
      queueState.counter = data.counter || queueState.counter;
      queueState.prefix = data.prefix || queueState.prefix;
      
      // Broadcast to all clients
      io.emit("queue:state", queueState);
      io.emit("queue:play", queueState);
    });

    socket.on("queue:next", (data: { counter: string, prefix: string }) => {
      queueState.counter = data.counter || queueState.counter;
      queueState.prefix = data.prefix || queueState.prefix;
      if (queueState.prefix === "W" || queueState.prefix === "O") {
          queueState.numbers[queueState.prefix] += 1;
      }
      
      io.emit("queue:state", queueState);
      io.emit("queue:play", queueState);
    });

    socket.on("queue:recall", () => {
      io.emit("queue:play", queueState);
    });
    
    socket.on("queue:reset", () => {
      queueState.numbers.W = 1;
      queueState.numbers.O = 1;
      queueState.prefix = "W";
      queueState.counter = "1";
      io.emit("queue:state", queueState);
    });

    socket.on("queue:set", (data: { number: number, counter: string, prefix: string }) => {
      queueState.prefix = data.prefix || queueState.prefix;
      queueState.counter = data.counter || queueState.counter;
      if (queueState.prefix === "W" || queueState.prefix === "O") {
          queueState.numbers[queueState.prefix] = data.number;
      }
      io.emit("queue:state", queueState);
      io.emit("queue:play", queueState);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // API endpoints
  app.get("/api/queue", (req, res) => {
    res.json(queueState);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
