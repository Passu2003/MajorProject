const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3001;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Map to track distinct users in a room
  // roomID -> [socketID, ...]
  const users = {};

  // Socket to Room mapping
  const socketToRoom = {};

  // Socket to Username mapping
  const socketToName = {};

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-room", ({ roomID, username }) => {
      socket.join(roomID);
      if (users[roomID]) {
        users[roomID].push(socket.id);
      } else {
        users[roomID] = [socket.id];
      }

      socketToRoom[socket.id] = roomID;
      socketToName[socket.id] = username || "Guest";

      // Get other users in this room
      const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);

      // Prepare payload with usernames
      const usersPayload = usersInThisRoom.map(id => ({
        id,
        username: socketToName[id]
      }));

      // Send the list of existing users to the new user
      socket.emit("all-users", usersPayload);

      console.log(`User ${socket.id} (${username}) joined room ${roomID}.`);
    });

    socket.on("sending-signal", (payload) => {
      // payload: { userToSignal, callerID, signal }
      io.to(payload.userToSignal).emit("user-joined", {
        signal: payload.signal,
        callerID: socket.id, // Ensure we send the actual sender's ID
        username: socketToName[socket.id]
      });
    });

    socket.on("returning-signal", (payload) => {
      // payload: { callerID, signal }
      io.to(payload.callerID).emit("receiving-returned-signal", {
        signal: payload.signal,
        id: socket.id
      });
    });

    socket.on("send-message", (payload) => {
      console.log(`Server: send-message from ${socket.id} to room ${socketToRoom[socket.id]}`, payload);
      // payload: { roomID, message, sender, timestamp }
      const roomID = socketToRoom[socket.id];
      if (roomID) {
        // Broadcast to others in the room
        socket.to(roomID).emit("receive-message", {
          ...payload,
          senderID: socket.id
        });
        console.log(`Server: broadcasted to room ${roomID}`);
      } else {
        console.warn(`Server: Message received but user ${socket.id} is not in a room!`);
      }
    });

    socket.on("delete-message", (payload) => {
      console.log(`Server: delete-message from ${socket.id}`, payload);
      // payload: { roomID, messageID }
      const roomID = socketToRoom[socket.id];
      if (roomID) {
        // Broadcast to ALL users in the room (including sender, though sender usually updates optimistically)
        // Actually, broadcast to others, sender handles local state.
        socket.to(roomID).emit("message-deleted", {
          messageID: payload.messageID
        });
      }
    });

    socket.on("edit-message", (payload) => {
      console.log(`Server: edit-message from ${socket.id}`, payload);
      // payload: { roomID, messageID, newText }
      const roomID = socketToRoom[socket.id];
      if (roomID) {
        socket.to(roomID).emit("message-edited", {
          messageID: payload.messageID,
          newText: payload.newText
        });
      }
    });


    socket.on("subtitle-update", (payload) => {
      // payload: { text, speaker, language, timestamp }
      const roomID = socketToRoom[socket.id];
      if (roomID) {
        socket.to(roomID).emit("subtitle-received", {
          ...payload,
          senderID: socket.id
        });
      }
    });

    socket.on("disconnect", () => {
      const roomID = socketToRoom[socket.id];
      console.log(`Socket disconnected: ${socket.id} (Room: ${roomID})`);

      let room = users[roomID];
      if (room) {
        // Remove user from room array
        room = room.filter((id) => id !== socket.id);
        users[roomID] = room;

        // Notify others
        console.log(`Broadcasting user-left for ${socket.id} to ${room.length} peers`);
        room.forEach(socketId => {
          io.to(socketId).emit("user-left", socket.id);
        });

        // Cleanup socket map
        delete socketToRoom[socket.id];
        delete socketToName[socket.id];
      }
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
