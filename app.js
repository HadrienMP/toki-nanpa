import express from 'express'
const app = express()
import http from 'http';
const server = http.createServer(app);
import { Server } from 'socket.io';
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.get('/', (req, res) => {
  res.send('Welcome to toki nanpa ! Work in progress');
})

io.on('connection', (socket) => {
  const userId = socket.id
  io.to(userId).emit('info', `Welcome!`, { socketId: userId });

  socket.on('join', data => {
    try {
      join(data.room);
    } catch (e) {
      console.error(userId, e, data);
      io.to(userId).emit('error', {
        message: `You could not join because your message is corrupted.\n\nTo join a room, use this: socket.emit("join", '{"room":"my-room"}')`,
        details: e.message,
      })
    }
  });

  socket.on('message', data => {
    try {
      const { room, data: innerData } = data;
      if (!socket.rooms.has(room)) join(room);
      io.to(room).emit("message", { sender: userId, innerData });
    } catch (e) {
      console.error(userId, e, data);
      io.to(userId).emit('error', {
        message:
          `You could not send a message to this room because your message is corrupted.\n\n` +
          `To send a message to a room, use this: socket.emit("message", '{"room":"my-room", "data":...}')`,
        details: e.message,
      })
    }
  });

  socket.on("disconnecting", _ => {
    socket.rooms.forEach(room => {
      io.to(room).emit('info', `${userId} is leaving ${room}`);
    });
  })

  function join(room) {
    socket.join(room);
    io.to(room).emit('info', `${userId} has joined ${room}`);
  }
});

const port = process.env.PORT || 9876;
server.listen(port, () => {
  console.log(`Server started: http://0.0.0.0:${port}`)
})