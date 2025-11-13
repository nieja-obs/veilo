const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

// Serwowanie plików statycznych z katalogu "public"
app.use(express.static('public'));

// ---- Zarządzanie użytkownikami ----
let users = []; // { socketId, nickname, room }

function addUser(socketId, nickname, room) {
  const user = { socketId, nickname, room };
  users.push(user);
  return user;
}

function removeUser(socketId) {
  const index = users.findIndex(u => u.socketId === socketId);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
  return null;
}

function getUser(socketId) {
  return users.find(u => u.socketId === socketId);
}

function getUsersInRoom(room) {
  return users.filter(u => u.room === room).map(u => u.nickname);
}

// ---- Socket.IO ----
io.on('connection', (socket) => {
  let currentUser = null;

  // Dołączenie do pokoju
  socket.on('join', ({ nickname, room }) => {
    if (!nickname || !room) return;

    currentUser = addUser(socket.id, nickname, room);
    socket.join(room);

    // Powiadomienie o nowych użytkownikach i dołączeniu
    io.to(room).emit('user list', getUsersInRoom(room));
    io.to(room).emit('user joined', nickname);

    console.log(`${nickname} dołączył do pokoju ${room}`);
  });

  // Wiadomości
  socket.on('chat message', (msg) => {
    if (!msg || !msg.text || !msg.user || !msg.room) return;

    io.to(msg.room).emit('chat message', msg);
    console.log(`Wiadomość od ${msg.user} w ${msg.room}: ${msg.text}`);
  });

  // Typing indicator
  socket.on('typing', (nick) => {
    if (!currentUser) return;
    socket.to(currentUser.room).emit('typing', nick);
  });

  socket.on('stop typing', (nick) => {
    if (!currentUser) return;
    socket.to(currentUser.room).emit('stop typing', nick);
  });

  // Rozłączenie
  socket.on('disconnect', () => {
    if (currentUser) {
      removeUser(socket.id);
      io.to(currentUser.room).emit('user list', getUsersInRoom(currentUser.room));
      io.to(currentUser.room).emit('user left', currentUser.nickname);
      console.log(`${currentUser.nickname} opuścił czat`);
    }
  });
});

// Start serwera
http.listen(PORT, () => {
  console.log(`✅ Serwer działa na http://localhost:${PORT}`);
});
