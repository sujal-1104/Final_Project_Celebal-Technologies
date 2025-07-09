// backend/app.js
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const Message = require('./models/Message');
const moment = require('moment');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

// Routes placeholder
app.get('/', (req, res) => {
  res.send("API is running...");
});

// Socket.io setup
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('register', (username) => {
    socket.username = username;
  });

  // Send all previous messages when user connects
  Message.find().sort({ createdAt: 1 }).then((messages) => {
    socket.emit('loadMessages', messages);
  });

  socket.on('sendFile', ({ sender, fileName, fileData }) => {
    io.emit('receiveFile', { sender, fileName, fileData });
  });

  // Listen for new messages
  socket.on('sendMessage', async (data) => {
    const { sender, message } = data;
    const newMessage = new Message({
      sender,
      message,
      time: moment().format('h:mm A')
    });

    await newMessage.save();
    io.emit('receiveMessage', newMessage);
  });

  // UNDO 
  socket.on('undoMessage', async ({ id }) => {
    const msg = await Message.findById(id);
    if (msg) {
    msg.archived = true;
    await msg.save();
    io.emit('messageUndone', { id });
    }
  });

// DELETE (permanent)
  socket.on('deleteMessage', async ({ id }) => {
    const msg = await Message.findById(id);
    if (msg) {
    await msg.deleteOne();
    io.emit('messageDeleted', { id }); // notify all clients
    }
  });

    // Mark message as read
  socket.on('markAsRead', async ({ messageId, reader }) => {
    try {
      const msg = await Message.findById(messageId);
      if (msg && !msg.seenBy?.includes(reader)) {
        msg.seenBy = [...(msg.seenBy || []), reader];
        await msg.save();
        io.emit('messageSeen', { messageId, reader }); // notify all clients
      }
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  });


  socket.on('callUser', ({ offer, caller }) => {
    socket.broadcast.emit('callUser', { offer, caller });
  });

  socket.on('callRejected', () => {
    socket.broadcast.emit('callRejected');
  });


  socket.on('answerCall', ({ answer }) => {
    socket.broadcast.emit('answerCall', { answer });
  });

  socket.on('iceCandidate', ({ candidate }) => {
    socket.broadcast.emit('iceCandidate', { candidate });
  });

  socket.on('hangUp', () => {
    socket.broadcast.emit('hangUp');
  });



  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
