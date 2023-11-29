const socket = io('ws://localhost:3500')

const msgInput = document.querySelector('#message')
const nameInput = document.querySelector('#name')
const invitedNameInput = document.querySelector('#invited-name')
const chatRoom = document.querySelector('#room')
const activity = document.querySelector('.activity')
const usersList = document.querySelector('.user-list')
const roomList = document.querySelector('.room-list')
const chatDisplay = document.querySelector('.chat-display')

function sendMessage(e) {
  e.preventDefault()
  if (nameInput.value && msgInput.value && chatRoom.value) {
    socket.emit('message', {
      name: nameInput.value,
      text: msgInput.value
    })
    msgInput.value = ""
  }
  msgInput.focus()
}

function enterRoom(e) {
  e.preventDefault()
  if (nameInput.value && chatRoom.value) {
    socket.emit('enterRoom', {
      name: nameInput.value,
      room: chatRoom.value
    })
  }
}

function inviteUser(e) {
  e.preventDefault();
  console.log('0.0');
  if (invitedNameInput.value && nameInput.value && chatRoom.value) {
    socket.emit('invite', {
      invitedName: invitedNameInput.value,
      room: chatRoom.value
    })
  }
}

document.querySelector('.form-msg')
  .addEventListener('submit', sendMessage)

document.querySelector('.form-join')
  .addEventListener('submit', enterRoom)

document.querySelector('.invite')
  .addEventListener('click', inviteUser);

msgInput.addEventListener('keypress', () => {
  socket.emit('activity', nameInput.value)
})

// Listen for messages 
socket.on("message", (data) => {
  activity.textContent = ""
  const { name, text, time } = data
  const li = document.createElement('li')
  li.className = 'post'
  if (name === nameInput.value) li.className = 'post post--left'
  if (name !== nameInput.value && name !== 'admin') li.className = 'post post--right'
  if (name !== 'admin') {
    li.innerHTML = `<div class="post__header ${name === nameInput.value
      ? 'post__header--user'
      : 'post__header--reply'
      }">
        <span class="post__header--name">${name}</span> 
        <span class="post__header--time">${time}</span> 
        </div>
        <div class="post__text">${text}</div>`
  } else {
    li.innerHTML = `<div class="post__text">${text}</div>`
  }
  document.querySelector('.chat-display').appendChild(li)

  chatDisplay.scrollTop = chatDisplay.scrollHeight
})

socket.on('invite', ({ name, room }) => {
  // 邀請人發送邀請時
  // const inviteeSocketId = '被邀請者的 Socket ID'; // 被邀請者的 Socket ID，這裡假設您有被邀請者的 Socket ID

  // 邀請人邀請被邀請者加入房間
  // const roomName = '指定的房間名稱'; // 指定的房間名稱
  // io.sockets.sockets[inviteeSocketId].join(roomName);
});

let activityTimer
socket.on("activity", (name) => {
  activity.textContent = `${name} is typing...`

  // Clear after 3 seconds 
  clearTimeout(activityTimer)
  activityTimer = setTimeout(() => {
    activity.textContent = ""
  }, 3000)
})

socket.on('userList', ({ users }) => {
  showUsers(users)
})

socket.on('roomList', ({ rooms }) => {
  showRooms(rooms)
})

function showUsers(users) {
  usersList.textContent = ''
  if (users) {
    usersList.innerHTML = `<em>Users in ${chatRoom.value}:</em>`
    users.forEach((user, i) => {
      usersList.textContent += ` ${user.name}`
      if (users.length > 1 && i !== users.length - 1) {
        usersList.textContent += ","
      }
    })
  }
}

function showRooms(rooms) {
  roomList.textContent = ''
  if (rooms) {
    roomList.innerHTML = '<em>Active Rooms:</em>'
    rooms.forEach((room, i) => {
      roomList.textContent += ` ${room}`
      if (rooms.length > 1 && i !== rooms.length - 1) {
        roomList.textContent += ","
      }
    })
  }
}