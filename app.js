import http from "http";
import express from "express";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: process.env.FRONTEND_URL || "http://92.168.155.187:5173/",
});

let sessions = new Map(); // Map to store sessionId: [socketIds]
let drawings = new Map(); // Map to store sessionId: [drawings]

io.on("connection", (socket) => {
  console.log("someone connected");

  socket.on("create-session", () => {
    let sessionId = uuidv4();
    sessions.set(sessionId, [socket.id]);
    drawings.set(sessionId, null);
    socket.emit("session-created", sessionId);
  });

  socket.on("join-session", (sessionId) => {
    if (sessions.has(sessionId)) {
      sessions.get(sessionId).push(socket.id);
      console.log(drawings.get(sessionId));
      socket.emit("drawing-data", drawings.get(sessionId));
    }
  });

  socket.on("rejoin-session", (data) => {
    let sessionId = data;
    if (sessions.has(sessionId)) {
      sessions.get(sessionId).push(socket.id);
      socket.emit("drawing-data", drawings.get(sessionId));
    }
  });

  socket.on("drawing", (data) => {
    let sessionId = data.sessionId;
    if (sessions.has(sessionId)) {
      drawings.set(sessionId, data.data);
      sessions.get(sessionId).forEach((socketId) => {
        if (socketId !== socket.id) {
          io.to(socketId).emit("drawing", data);
        }
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("someone disconnected");
    sessions.forEach((socketIds, sessionId) => {
      let index = socketIds.indexOf(socket.id);
      if (index !== -1) {
        socketIds.splice(index, 1);
      }
      if (socketIds.length === 0) {
        sessions.delete(sessionId);
        drawings.delete(sessionId);
      }
    });
  });
});

server.listen(process.env.PORT || 8000, () => {
  console.log("listening on http://localhost:8000");
});
