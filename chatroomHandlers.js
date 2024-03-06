const { writeFile, readFile } = require('fs');

const BOT = 'bot';
let allUsers = [];

module.exports = (io, socket) => {
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
            callback(null, 'Room joined successfully');
            socket.join(room);
        }

        io.emit('chatrooms', [...new Set(allUsers.map(user => user.room))]);

        allUsers.push({ id: socket.id, username, room });
        chatRoomUsers = allUsers.filter((user) => user.room === room);
        io.to(room).emit('chatroom_users', chatRoomUsers);

        io.to(room).emit('receive_message', {
            message: `${username} has joined the chat room`,
            username: BOT,
        });
    });

    socket.on('send_message', (data) => {
        const { room } = data;
        io.to(room).emit('receive_message', data);
    });

    socket.on('upload_file', ({ file, ext, username, room }, callback) => {
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
        callback([...new Set(allUsers.map(user => user.room))])
    });

    socket.on('leave_room', (socketId, room) => {
        allUsers = allUsers.filter(user => (user.id !== socketId && user.room !== room));
    });

    socket.on('typing', ({ room, username }) => {
        console.log(room ,username, 'typeing')
        socket.to(room).emit('user_typing', { username });
    });
}