const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const http = require("http");
const { Server } = require("socket.io");
const { supabase } = require("./utils/supabase");
const { createSocketRateLimiter } = require("./middleware/chatGuards");

const app = express();

const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
app.set("trust proxy", 1);
app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
);
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: frontendOrigin,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

app.set("io", io);

const socketRoomActionRateLimiter = createSocketRateLimiter({
  scope: "socket-room-action",
  windowMs: 10000,
  maxRequests: 30,
  errorMessage: "Too many room actions. Please slow down.",
});

const socketDmJoinRateLimiter = createSocketRateLimiter({
  scope: "socket-dm-join",
  windowMs: 10000,
  maxRequests: 12,
  errorMessage:
    "Too many direct message room join attempts. Please wait a moment.",
});

// Socket.IO middleware to verify JWT tokens
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return next(new Error("Unauthorized"));

    socket.userId = data.user.id;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

// Handle Socket.IO connections and room management
io.on("connection", (socket) => {
  socket.join(`user:${socket.userId}`);

  socket.on("room:join", (payload, ack) => {
    if (!socketRoomActionRateLimiter(socket, ack)) return;

    const room = payload?.room || "global";
    socket.join("room:" + room);

    if (typeof ack === "function") {
      ack({ ok: true, room });
    }
  });

  // Handle leaving a room
  socket.on("room:leave", (payload, ack) => {
    if (!socketRoomActionRateLimiter(socket, ack)) return;

    const room = payload?.room || "global";
    socket.leave("room:" + room);

    if (typeof ack === "function") {
      ack({ ok: true, room });
    }
  });

  // Handle joining a DM conversation room
  socket.on("dm:join", async (payload, ack) => {
    if (!socketDmJoinRateLimiter(socket, ack)) return;

    const conversationId = payload?.conversationId;
    if (!conversationId) {
      if (typeof ack === "function")
        ack({ ok: false, error: "Missing conversationId" });
      return;
    }

    // Verify the user is part of this conversation
    const { data, error } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", socket.userId)
      .maybeSingle();

    if (error || !data) {
      if (typeof ack === "function")
        ack({ ok: false, error: "Not authorized" });
      return;
    }

    socket.join("dm:" + conversationId);
    if (typeof ack === "function") ack({ ok: true });
  });

  socket.on("dm:leave", (payload, ack) => {
    if (!socketRoomActionRateLimiter(socket, ack)) return;

    const conversationId = payload?.conversationId;
    if (!conversationId) {
      if (typeof ack === "function") {
        ack({ ok: false, error: "Missing conversationId" });
      }
      return;
    }

    socket.leave("dm:" + conversationId);

    if (typeof ack === "function") {
      ack({ ok: true, conversationId });
    }
  });

  // Handle typing indicator
  socket.on("dm:typing", (payload) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;

    io.to(`dm:${conversationId}`).emit("dm:user-typing", {
      userId: socket.userId,
      conversationId,
      timestamp: Date.now(),
    });
  });
});

// Import routes from route folder
const messagesRouter = require("./routes/messages");
const usersRouter = require("./routes/users");
const directMessagesRouter = require("./routes/directMessages");
const eventsRouter = require("./routes/events");
const announcementsRouter = require("./routes/announcements");
const roomsRouter = require("./routes/rooms");

// Mount routes
app.use("/api/messages", messagesRouter);
app.use("/api/users", usersRouter);
app.use("/api/direct-messages", directMessagesRouter);
app.use("/api/events", eventsRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/rooms", roomsRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
