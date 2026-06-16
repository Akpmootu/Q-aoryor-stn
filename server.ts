import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";

interface QueueState {
  currentNumber: number;
  lastCalledNumber: number;
  counter: string;
}

const queueState: QueueState = {
  currentNumber: 1,
  lastCalledNumber: 0,
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

    socket.on("queue:call", (data: { counter: string }) => {
      queueState.counter = data.counter;
      queueState.lastCalledNumber = queueState.currentNumber;
      
      // Broadcast to all clients
      io.emit("queue:state", queueState);
      io.emit("queue:play", queueState);
    });

    socket.on("queue:next", (data: { counter: string }) => {
      queueState.currentNumber += 1;
      queueState.counter = data.counter;
      queueState.lastCalledNumber = queueState.currentNumber;
      
      io.emit("queue:state", queueState);
      io.emit("queue:play", queueState);
    });

    socket.on("queue:recall", () => {
      io.emit("queue:play", queueState);
    });
    
    socket.on("queue:reset", () => {
      queueState.currentNumber = 1;
      queueState.lastCalledNumber = 0;
      queueState.counter = "1";
      io.emit("queue:state", queueState);
    });

    socket.on("queue:set", (data: { number: number, counter: string }) => {
      queueState.currentNumber = data.number;
      queueState.counter = data.counter;
      queueState.lastCalledNumber = data.number;
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

  app.use(express.json());

  app.post("/api/tts", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      // Check if API key exists
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
      }

      // Dynamically import to keep it isolated
      const { GoogleGenAI, Modality } = await import("@google/genai");
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO], // Use AUDIO enum from Modality
          speechConfig: {
            voiceConfig: {
              // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is a distinct clear voice
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        res.json({ audio: base64Audio });
      } else {
        res.status(500).json({ error: "No audio generated" });
      }
    } catch (error) {
      console.error("TTS generation error:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
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
