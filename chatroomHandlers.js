const { writeFile, readFile } = require('fs');

const BOT = 'bot';
let allUsers = [];
let allMeetings = [];

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
        // TODO - return any ongoing meeting in the room
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
        socket.to(room).emit('user_typing', { username });
    });

    socket.on('create_meeting', ({ room, username }, callback) => {
        let existingMeeting = allMeetings.find(ele => ele.roomName == room);
        if (existingMeeting) {
            return callback(true);
        }

        let newMeeting = {
            roomName: room,
            meetingName: `${room}-meeting`,
            members: [username],
            createdBy: username
        };
        allMeetings.push(newMeeting)
        io.to(room).emit('meeting_created', newMeeting)
        io.to(room).emit('receive_message', {
            username: BOT,
            message: `${username} has started a meeting.`
        })
    });

    socket.on('join_meeting', ({ meetingName, username }, callback) => {
        let existingMeeting = allMeetings.find(ele => ele.meetingName == meetingName);
        if (!existingMeeting) {
            return callback(true);
        }

        existingMeeting.members.push(username);
        io.to(existingMeeting.roomName).emit('meeting_joined', existingMeeting);
        io.to(existingMeeting.roomName).emit('receive_message', {
            username: BOT,
            message: `${username} has joined the meeting.`
        })
    });

    socket.on('end_meeting', ({ meetingName }, callback) => {
        let existingMeeting = allMeetings.find(ele => ele.meetingName === meetingName)
        if (!existingMeeting) {
            return callback(true);
        }
        try {
            allMeetings = allMeetings.filter(ele => ele.meetingName !== existingMeeting.meetingName);
            io.to(existingMeeting.roomName).emit('meeting_ended');
            io.to(existingMeeting.roomName).emit('receive_message', {
                username: BOT,
                message: `${existingMeeting.createdBy} has ended the meeting`
            });
            return callback(false)
        } catch (error) {
            return callback(true, error)
        }
    });

    socket.on('leave_meeting', ({ meetingName, username }, callback) => {
        let existingMeeting = allMeetings.find(ele => ele.meetingName === meetingName)
        if (!existingMeeting) {
            return callback(true);
        } else if (!existingMeeting.members.includes(username)) {
            return callback(true);
        }

        try {
            existingMeeting.members = existingMeeting.members.filter(ele => ele !== username)
            io.to(existingMeeting.roomName).emit('meeting_left', existingMeeting);
            io.to(existingMeeting.roomName).emit('receive_message', {
                username: BOT,
                message: `${username} has left the meeting`
            });

            return callback(false)
        } catch (error) {
            return callback(true, error)
        }
    });
};