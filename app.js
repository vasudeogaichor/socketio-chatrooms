const restify = require('restify');
const socketIo = require('socket.io');
const { writeFile, readFile } = require('fs');

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
        io.emit('chatrooms', [...new Set(allUsers.map(user => user.room))]);
            });

    socket.on('send_message', (data) => {
        const { room } = data;
        io.to(room).emit('receive_message', data);
    });

    socket.on('upload_file', (file, ext, username, room, callback) => {
        const newFileName = `${__dirname}/tmp/uploads/${Date.now()}.${ext}`;
        writeFile(newFileName, file, (err) => {
            callback({ message: err ? "failure" : "success" });
        });
        io.to(room).emit('receive_message', {
            message: `${username} uploaded a file`,
            username: BOT
        });

        io.to(room).emit('receive_message', {
            username: username,
            fileName: `${newFileName.split('/').slice(-1)[0]}`
        });
    });

    socket.on('request_file', (fileName, callback) => {
        const filePath = `${__dirname}/tmp/uploads/${fileName}`;
        readFile(filePath, (err, data) => {
            if (err) {
                return callback(err);
            } else {
                callback(null, data);
            }
        });
    });

    socket.on('request_available_rooms', (callback) => {
        console.log('requested available rooms')
        callback([...new Set(allUsers.map(user => user.room))])
    })
});

// Start server
const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
