const restify = require('restify');
const socketIo = require('socket.io');
const registerChatroomHandlers = require('./chatroomHandlers');

const server = restify.createServer();

const io = socketIo(server.server, {
    cors: {
        origin: "http://localhost:3000"
    }
});

const onConnection = (socket) => {
    registerChatroomHandlers(io, socket);
}

// Socket.io connections
io.on('connection', onConnection);

// Start server
const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
