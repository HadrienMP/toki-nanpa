Toki Nanpa
==========

__toki nanpa__: _toki pona:_ digital talk

This back end uses _Socket IO_ (websocket + poklyfills) to allow __peer to peer__ webapp communication.
It's a __minimal protocol__ that is usefull to me. It __only transmits the messages__. It does not save them or log them.


Protocol
--------

===> 'join', 'room name'
<=== 'peer', {room: 'room name', message: ..., peer: 'peerId123', type: 'joined'}

===> 'message', {room: 'room name', data: xxx}
<=== 'message', {room: 'room name', data: xxx, peer: 'peerId123'}

auto: 'disconnecting'
<=== 'peer', {room: 'room name', message: ..., type: 'disconnecting', peer: 'peerId123'}


Client example
--------------

### Installation
- Via CDN: `<script src="https://cdn.socket.io/4.5.0/socket.io.min.js" integrity="sha384-7EyYLQZgWBi67fBtVxw60/OWl1kjsfrPFcaU0pp0nAh+i8FD068QogUvg85Ewy1k" crossorigin="anonymous"></script>`
- With a package manager: `npm install socket.io-client` and then `import io from 'socket.io-client'`

### Code

```javascript
const socket = io("https://toki-nanpa.onrender.com");

// Send message
socket.emit('message', { room: 'my current room', data: 'whatever you want' })

// Receive messages
socket.on('message', (msg) => {
    const {room, data} = msg;
    console.debug('<=== message', JSON.stringify(msg));
});

// Receive peer changes
socket.on('peer', msg => {
    switch (msg.type) {
        case "joined":
            console.log('<=== joined:', msg.peer);
            break;
        case "disconnecting":
            console.log('<=== disconnecting', msg.peer);
            break;
        default:
            console.error('unknown peer event: ' + JSON.stringify(msg))
            break;
    }
})
```