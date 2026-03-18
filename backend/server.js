const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Import routes
const messagesRouter = require("./routes/messages");
const usersRouter = require("./routes/users");
const directMessagesRouter = require("./routes/directMessages");
const eventsRouter = require("./routes/events");
const announcementsRouter = require("./routes/announcements");

// Mount routes
app.use("/api/messages", messagesRouter);
app.use("/api/users", usersRouter);
app.use("/api/direct-messages", directMessagesRouter);
app.use("/api/events", eventsRouter);
app.use("/api/announcements", announcementsRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
