const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;


// Serwujemy pliki statyczne z katalogu "public"
app.use(express.static('public'));

let users = [];  // lista nicków aktualnie zalogowanych

io.on('connection', (socket) => {
  let userNick = '';

  // Użytkownik dołącza do czatu
  socket.on('join', (nick) => {
    userNick = nick;
    users.push(nick);
    io.emit('user list', users);
    console.log(`${nick} dołączył do czatu`);
  });

  // Odbieramy i rozsyłamy wiadomość
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
    console.log(`Wiadomość od ${msg.user}: ${msg.text}`);
  });

  // Użytkownik zaczął pisać
  socket.on('typing', (nick) => {
    socket.broadcast.emit('typing', nick);
  });

  // Użytkownik przestał pisać
  socket.on('stop typing', (nick) => {
    socket.broadcast.emit('stop typing', nick);
  });

  // Użytkownik rozłącza się
  socket.on('disconnect', () => {
    if (userNick) {
      users = users.filter(u => u !== userNick);
      io.emit('user list', users);
      console.log(`${userNick} opuścił czat`);
    }
  });
});

// Start serwera
http.listen(PORT, () => {
  console.log(`✅ Serwer działa na http://localhost:${PORT}`);
});
