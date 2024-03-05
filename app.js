const restify = require('restify');
const socketIo = require('socket.io');

const BOT = 'bot';
let allUsers = [];

const server = restify.createServer();

const io = socketIo(server.server, {
    cors: {
        origin: "http://localhost:3000"
    }
});

// Socket.io connections
io.on('connection', (socket) => {
    console.log('User connected ', socket.id);

    io.emit('chatrooms', [...new Set(allUsers.map(user => user.room))]);

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    socket.on('disconnecting', () => {
        const [userId, room] = [...socket.rooms]
        const username = allUsers.find(user => user.id === userId)?.username; 
        io.to(room).emit('receive_message', {
            message: `${username} has left the chat room`,
            username: BOT,
        });
        allUsers = allUsers.filter(user => (user.id !== userId));
        const updatedChatRoomUsers = allUsers.filter((user) => user.room === room);
        io.to(room).emit('chatroom_users', updatedChatRoomUsers);

    })

    socket.on('join_room', (data, callback) => {
        const { username, room, isNewRoom } = data;

        let currentRooms = allUsers.map(user => user.room);
        if (isNewRoom && currentRooms.includes(room)) {
            return callback('Room already exists');
        } else {
            socket.join(room)
            callback(null, 'Room created successfully');
        }

        io.to(room).emit('receive_message', {
            message: `${username} has joined the chat room`,
            username: BOT,
        });

        allUsers.push({ id: socket.id, username, room });
        chatRoomUsers = allUsers.filter((user) => user.room === room);
        io.to(room).emit('chatroom_users', chatRoomUsers);
        console.log('sending all available rooms')
        console.log('allUsers - ', allUsers)
        io.emit('chatrooms', [...new Set(allUsers.map(user => user.room))]);
        console.log('sent')
    });

    socket.on('send_message', (data) => {
        const { room } = data;
        io.to(room).emit('receive_message', data);
    });
});

// Start server
const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
