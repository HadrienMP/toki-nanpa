Toki Nanpa
==========

__toki nanpa__: _toki pona:_ digital talk

The simplest description of it is: __a chat server for machines__

This back end uses _Socket IO_ (websocket + polyfills) to allow __peer to peer__ webapp communication.
It's a __minimal protocol__ that is usefull to me. It __only transmits the messages__. It does not save them or log them.


Protocol
--------
```
===> 'join', {room: 'room name'}
<=== 'message', {type: 'joined', room: 'room name', from: 'socket id', data: {}}
<=== 'history', {room: 'room name', data: []}

===> 'message', {room: 'room name', data: xxx}
<=== 'message', {type: 'joined', room: 'room name', from: 'socket id', data: {}}
<=== 'message', {type: 'message', room: 'room name', from: 'socket id', data: xxx}

===> 'direct-message', {to: 'socket id', data: xxx}
<=== 'direct-message', {to: 'socket id', from: 'other socket id', data: xxx}

auto: 'disconnecting'
<=== 'message', {type: 'left', room: 'room name', peer: 'peerId123', data: {}}
```

Client example
--------------

### Installation
- Via CDN: 
```
<script src="https://cdn.socket.io/4.5.0/socket.io.min.js" integrity="sha384-7EyYLQZgWBi67fBtVxw60/OWl1kjsfrPFcaU0pp0nAh+i8FD068QogUvg85Ewy1k" crossorigin="anonymous"></script>
```
- With a package manager: 
```
npm install socket.io-client
import io from 'socket.io-client
```

### Code

```javascript
const socket = io("https://toki-nanpa.onrender.com");

// Send message
socket.emit('message', { room: 'my current room', data: 'whatever you want' })

// Receive messages
socket.on('message', (msg) => {
    const {room, type, data, peer} = msg;
    switch(type) {
        case 'message':
            console.debug('<=== message', {data});
            break;
        case 'left':
            console.debug('<=== left', peer);
            break;
        default:
            console.error('unknown peer event: ' + JSON.stringify(msg))
            break;
    }
});
```