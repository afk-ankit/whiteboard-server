import http from "http";
import express from "express";
import { Server } from "socket.io";
import cors from "cors";
const app = express();

app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: "http://92.168.155.187:5173/",
});

io.on("connection", (socket) => {
  console.log("someone connected");
  socket.on("mouse-move", (data) => {
    socket.broadcast.emit("mouse movement", data);
  });
  socket.on("drawing", (data) => {
    socket.broadcast.emit("user drawn", data);
  });
  socket.on("disconnect", () => {
    console.log("someone disconnected");
    socket.broadcast.emit("user disconnected", null);
  });
});

server.listen(process.env.PORT || 800, () => {
  console.log("server running at http://localhost:8000 🔥");
});
