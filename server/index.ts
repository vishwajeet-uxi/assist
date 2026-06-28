import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { Server as SocketIOServer } from "socket.io";
import http from "http";
import { handleDemo } from "./routes/demo";
import { createMeeting, getMeeting, endMeeting, getTranscript, addTranscriptChunk } from "./routes/transcript";
import { generateSummary, answerQuestion, extractKeyPoints } from "./routes/ai";

declare global {
  var io: SocketIOServer | undefined;
}

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/meeting-assistant";
  try {
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.warn("⚠️  MongoDB connection failed - using in-memory storage", error);
  }
}

export function createServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Store io globally for use in routes
  globalThis.io = io;

  // Connect to MongoDB (async, non-blocking)
  if (process.env.NODE_ENV !== "development" || process.env.MONGODB_URI) {
    connectDatabase().catch(console.error);
  }

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Transcript routes
  app.post("/api/meetings", createMeeting);
  app.get("/api/meetings/:meetingId", getMeeting);
  app.post("/api/meetings/:meetingId/end", endMeeting);
  app.get("/api/meetings/:meetingId/transcript", getTranscript);
  app.post("/api/meetings/:meetingId/transcript-chunk", addTranscriptChunk);

  // AI routes
  app.post("/api/ai/summary", generateSummary);
  app.post("/api/ai/question", answerQuestion);
  app.post("/api/ai/key-points", extractKeyPoints);

  // Socket.IO events for real-time collaboration
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("join-meeting", (meetingId: string) => {
      socket.join(`meeting-${meetingId}`);
      console.log(`Socket ${socket.id} joined meeting ${meetingId}`);
      io.to(`meeting-${meetingId}`).emit("user-joined", {
        userId: socket.id,
        timestamp: new Date(),
      });
    });

    socket.on("transcript-chunk", async (data: { meetingId: string; text: string; duration?: number }) => {
      try {
        // Persist to database
        const meeting = await mongoose.model("Meeting").findByIdAndUpdate(
          data.meetingId,
          {
            $push: {
              transcriptChunks: {
                text: data.text,
                timestamp: new Date(),
                duration: data.duration || 0,
              },
            },
            updatedAt: new Date(),
          }
        );

        if (meeting) {
          // Update full transcript
          const currentTranscript = (meeting as any).fullTranscript || "";
          const updatedTranscript = currentTranscript + " " + data.text;
          await mongoose.model("Meeting").updateOne(
            { _id: data.meetingId },
            { fullTranscript: updatedTranscript }
          );
        }

        // Broadcast to all clients in this meeting room
        io.to(`meeting-${data.meetingId}`).emit("transcript-update", {
          text: data.text,
          timestamp: new Date(),
          duration: data.duration || 0,
        });
      } catch (error) {
        console.error("Error processing transcript chunk:", error);
        socket.emit("error", { message: "Failed to process transcript chunk" });
      }
    });

    socket.on("ask-question", async (data: { meetingId: string; question: string; transcript: string }) => {
      try {
        // This can be handled by making an HTTP request to the AI endpoint from the client
        socket.emit("question-received", { id: socket.id, timestamp: new Date() });
      } catch (error) {
        console.error("Error handling question:", error);
        socket.emit("error", { message: "Failed to process question" });
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return { app, httpServer, io } as const;
}
