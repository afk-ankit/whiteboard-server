import http from "http";
import express from "express";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";
import { connectDb } from "./db/db.js";
import { User } from "./schema/useSchema.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

connectDb();
const app = express();
app.use(cors());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.get("/", (_, res) => {
  res.send("Hello world");
});

app.post("/login", async (req, res) => {
  try {
    const { password, email } = req.body;
    console.log(email);
    const user = await User.findOne({ email: email });
    console.log(user);
    if (!user) {
      throw new Error("User doesn't exist");
    } else {
      const passwordDoesMatch = await bcrypt.compare(password, user.password);
      if (passwordDoesMatch) {
        const token = jwt.sign(
          { username: user.username, email: user.email },
          process.env.JWT_SECRET,
        );
        res.send({
          token,
          user: { username: user.username, email: user.email },
        });
      } else {
        throw new Error("password doesn't match");
      }
    }
  } catch (error) {
    res.status(403).send({ message: error.message });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { password, email, username } = req.body;
    const hashed_password = await bcrypt.hash(password, 3);
    const newUser = new User({
      password: hashed_password,
      email,
      username,
    });
    const data = await newUser.save();
    res.status(201).send(data);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

app.post("/verify", (req, res) => {
  const { token } = req.body;
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    res.send({ ...user });
  } catch {
    res.sendStatus(403);
  }
});

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
