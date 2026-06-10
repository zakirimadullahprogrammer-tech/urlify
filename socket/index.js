const jwt = require("jsonwebtoken");

const {
  formatCompactNumber
} = require("../utils/numberFormatter");

function initializeSocket(io) {
  io.use((socket, next) => {
    try {
      const cookieHeader =
        socket.handshake.headers.cookie || "";

      const token = cookieHeader
        .split("; ")
        .find(row =>
          row.startsWith("token=")
        )
        ?.split("=")[1];

      if (!token) {
        return next(
          new Error("Unauthorized")
        );
      }

      const decoded =
        jwt.verify(
          token,
          process.env.JWT_SECRET
        );

      socket.user = decoded;

      return next();

    } catch (error) {
      return next(
        new Error("Unauthorized")
      );
    }
  });

  io.on("connection", socket => {
    const userId =
      socket.user.id;

    socket.join(
      `user:${userId}`
    );

    console.log(
      `=> User ${userId} connected to live analytics:`,
      socket.id
    );

  

    socket.on(
      "disconnect",
      () => {
        console.log(
          `=> User ${userId} disconnected from live analytics:`,
          socket.id
        );
      }
    );
  });
}

module.exports =
  initializeSocket;