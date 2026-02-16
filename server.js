const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const QRCode = require('qrcode');
const path = require('path');
const os = require('os');

app.use(express.static(__dirname));

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

app.get('/qr', (req, res) => {
    const localIP = getLocalIP();
    const port = server.address().port;
    const url = `http://${localIP}:${port}/controller.html`;
    
    QRCode.toDataURL(url, (err, src) => {
        if (err) res.send("Error generating QR code");
        res.send({ src, url });
    });
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
    });

    // Relay events from controller to display
    socket.on('rotate', (data) => {
        socket.broadcast.emit('rotate', data);
    });

    socket.on('zoom', (data) => {
        socket.broadcast.emit('zoom', data);
    });
    
    socket.on('tap', (data) => {
        socket.broadcast.emit('tap', data);
    });

    socket.on('pointerMove', (data) => {
        socket.broadcast.emit('pointerMove', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Access controller at http://${getLocalIP()}:${PORT}/controller.html`);
});