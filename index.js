import { Server } from 'socket.io';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

//todo: 加上邀請功能

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3500;
const ADMIN = "admin";

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(
  PORT,
  () => console.log('Server listening on port ' + PORT)
);

// state
const UsersState = {
  users: [],
  setUsers: function (newUsers) {
    this.users = newUsers;
  }
};

const io = new Server(server,
  {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5500']
    },
  }
)

io.on('connection', socket => {
  console.log(`User ${socket.id} connected`)

  // Upon connection - only to user 
  socket.emit('message', buildMsg(ADMIN, "Welcome to Chat App!"))

  socket.on('enterRoom', ({ name, room }) => {

    // leave previous room 
    const prevRoom = getUser(socket.id)?.room

    if (prevRoom) {
      socket.leave(prevRoom)
      io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`))
    }

    const user = activateUser(socket.id, name, room)

    // Cannot update previous room users list until after the state update in activate user 
    if (prevRoom) {
      io.to(prevRoom).emit('userList', {
        users: getUsersInRoom(prevRoom)
      })
    }

    // join room 
    socket.join(user.room)

    // To user who joined 
    socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`))

    // To everyone else 
    socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`))

    // Update user list for room 
    io.to(user.room).emit('userList', {
      users: getUsersInRoom(user.room)
    })

    // Update rooms list for everyone 
    io.emit('roomList', {
      rooms: getAllActiveRooms()
    })
  })

  // When user disconnects - to all others 
  socket.on('disconnect', () => {
    const user = getUser(socket.id)
    userLeavesApp(socket.id)

    if (user) {
      io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`))

      io.to(user.room).emit('userList', {
        users: getUsersInRoom(user.room)
      })

      io.emit('roomList', {
        rooms: getAllActiveRooms()
      })
    }

    console.log(`User ${socket.id} disconnected`)
  })

  // Listening for a message event 
  socket.on('message', ({ name, text }) => {
    const room = getUser(socket.id)?.room
    if (room) {
      io.to(room).emit('message', buildMsg(name, text))
    }
  })

  // Listen for activity 
  socket.on('activity', (name) => {
    const room = getUser(socket.id)?.room

    if (room) {
      socket.broadcast.to(room).emit('activity', name)
    }
  })

  // Invite the user
  socket.on('invite', ({ invitedName, room }) => {
    const prevUser = getUserByName(invitedName);

    if (!prevUser) {
      return;
    }

    if (prevUser.room) {
      io.to(prevUser.room).emit('message', buildMsg(ADMIN, `${invitedName} has left the room`))
    }

    const invitedSocket = io.sockets.sockets[prevUser.id];
    if (invitedSocket) {
      invitedSocket.join(room)
    }

    const user = activateUser(prevUser.id, invitedName, room)

    if (prevUser.room) {
      io.to(prevUser.room).emit('userList', {
        users: getUsersInRoom(prevUser.room)
      })
    }

    io.to(user.room).emit('userList', {
      users: getUsersInRoom(user.room)
    })

    console.log(`${user.name} has invited the room`);

    io.to(user.room)
      .emit('message', buildMsg(ADMIN, `${user.name} has invited the room`));

  });
})

function buildMsg(name, text) {
  return {
    name,
    text,
    time: new Intl.DateTimeFormat('default', {
      month: 'numeric',
      day: 'numeric',
      time: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    }).format(new Date())
  };
}

// User functions 
function activateUser(id, name, room) {
  const user = { id, name, room }
  UsersState.setUsers([
    ...UsersState.users.filter(user => user.id !== id),
    user
  ])
  return user
}

function userLeavesApp(id) {
  UsersState.setUsers(
    UsersState.users.filter(user => user.id !== id)
  )
}

function getUser(id) {
  return UsersState.users.find(user => user.id === id)
}

function getUserByName(name) {
  return UsersState.users.find(user => user.name === name)
}

function getUsersInRoom(room) {
  return UsersState.users.filter(user => user.room === room)
}

function getAllActiveRooms() {
  return Array.from(new Set(UsersState.users.map(user => user.room)))
}