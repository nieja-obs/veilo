const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

// Serwowanie plików statycznych z katalogu "public"
app.use(express.static('public'));

let users = []; // { socketId, nickname, room }

// Połączenie nowego klienta
io.on('connection', (socket) => {
  let currentUser = null;

  // Dołączenie do czatu
  socket.on('join', ({ nickname, room }) => {
    currentUser = { socketId: socket.id, nickname, room };
    users.push(currentUser);

    socket.join(room);

    // Aktualizacja listy użytkowników tylko w tej samej sali
    const roomUsers = users.filter(u => u.room === room).map(u => u.nickname);
    io.to(room).emit('user list', roomUsers);

    // Powiadomienie o dołączeniu
    io.to(room).emit('user joined', nickname);
    console.log(`${nickname} dołączył do czatu w pokoju ${room}`);
  });

  // Wiadomości
  socket.on('chat message', (msg) => {
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
    socket.to(currentUser.room).emit('stop typing');
  });

  // Rozłączenie
  socket.on('disconnect', () => {
    if (currentUser) {
      users = users.filter(u => u.socketId !== socket.id);
      const roomUsers = users.filter(u => u.room === currentUser.room).map(u => u.nickname);
      io.to(currentUser.room).emit('user list', roomUsers);
      io.to(currentUser.room).emit('user left', currentUser.nickname);
      console.log(`${currentUser.nickname} opuścił czat`);
    }
  });
});

// Start serwera
http.listen(PORT, () => {
  console.log(`✅ Serwer działa na http://localhost:${PORT}`);
});
