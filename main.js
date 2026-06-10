require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth.routes");
const linksRoutes = require("./routes/links.routes");
const settingsRoutes = require("./routes/settings.routes");
const pageRoutes = require("./routes/page.routes");
const qrRoutes = require("./routes/qr.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const redirectRoutes = require("./routes/redirect.routes");
const initializeSocket = require("./socket");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

app.set("trust proxy", 1);
app.set("io", io);

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

app.use("/api/auth", authRoutes);
app.use("/api/links", linksRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/pages", pageRoutes);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

initializeSocket(io);

// Keep redirect route LAST because /:shortCode can catch everything
app.use("/", redirectRoutes);

// Local development only
if (process.env.NODE_ENV !== "production") {
  server.listen(8080, "0.0.0.0", () => {
    console.log("=> URLIFY SOFTWARE DEVELOPED BY ZAKIR IMADULLAH");
    console.log("=> HTTP Server listening on PORT 8080");
    console.log("=> WebSocket Server Ready");
  });
}

// Required for Vercel
module.exports = app;