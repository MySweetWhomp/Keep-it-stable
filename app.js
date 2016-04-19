
/**
* @Author: Paul Joannon
* @Date:   2016-04-15T23:45:19+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   Paul Joannon
* @Last modified time: 2016-04-19T22:32:53+02:00
*/

'use strict';

const express = require('express');

const logger = require('./src/logger');


let app = express();
let roomManager = require('./src/rooms');

app.get('/404', function(req, res) {
    // Oops, it seems that you're looking for something that doesn't exist.
    // Link to /
    res.redirect('/');
});

app.get('/', function(req, res) {
    // List rooms w/ uptime and population
    // User can join a room or create a new one
    res.render('index', { rooms: roomManager.getAll(), now: Date.now() });
});

app.post('/r', function(req, res) {
    // Create new room
    let newRoom = roomManager.create();

    if (newRoom != null) {
        res.redirect(`/r/${newRoom.UUID}`);
    }
});

app.get('/r/:ruuid', function(req, res) {
    const roomUUID = req.params.ruuid;
    logger.debug(`Trying to access room ${roomUUID}`);

    // Check if room exists
    if (roomManager.exists(roomUUID)) {
        res.render('room', { room : roomManager.get(roomUUID) });
    } else {
        logger.error(`Room ${roomUUID} does not exist`);
        res.redirect('/404');
    }
});

app.set('view engine', 'pug');
app.use('/static', express.static('static/'));
app.use('/static/lib/socket-io', express.static('node_modules/socket.io-client/', { extensions: ['js'] }));
app.use('/static/lib/howler', express.static('node_modules/howler/', { extensions: ['js'] }));
app.use('/static/lib/csshake', express.static('node_modules/csshake/dist/', { extensions: ['min.css'] }));

app.listen(3000, function() {
    logger.info('Listening on 0.0.0.0:3000...');

    const server = require('http').createServer(app);
    server.listen(3001);
    logger.info('Listening on socket 0.0.0.0:3001...');
    let io = require('socket.io')(server);

    io.on('connection', function(sock) {
        logger.debug('New socket connection')

        sock.on('register', function(data) {
            if (roomManager.exists(data.roomUUID)) {
                let room = roomManager.get(data.roomUUID),
                    member;

                let mustRegisterMember = function() {
                    logger.debug(`Ask register for ${data.roomUUID}`);
                    if (room.members.count(false, true) >= (room.size[0] * room.size[1]) / 2) {
                        room.grow();
                        logger.info(`${room.UUID} must grow!`);
                    }
                    return room.registerMember();
                };

                if (data.memberUUID != null) {
                    logger.debug(`Ask register for ${data.memberUUID}@${data.roomUUID}`);

                    member = room.members.get(data.memberUUID) || room.registerMember();
                    if (member.dead || Date.now() - member.lastaction >= 30000) {
                        member = mustRegisterMember();
                    }
                } else {
                    member = mustRegisterMember();
                }

                member.sock = sock;
                member.sock.emit('registered', {
                    me: member.getInfo(),
                });

                member.sock.on('startplay', function() {
                    member.sock.emit('startedplay', {
                        room: {
                            members: room.members.getAllInfo(),
                            size: room.size,
                            societyDownLimit: room.societyDownLimit
                        }
                    });
                    room.members.emit('connected', member.getInfo());
                });

                member.sock.on('move', function(instruction) {
                    if (room.isCellFree(instruction.x, instruction.y)) {
                        member.move(instruction);
                        room.members.emit('moved', { member: member.UUID, instruction: instruction });
                    } else {
                        member.sock.emit('nomoved');
                    }
                });

                member.sock.on('changestate', function(data) {
                    member.state = data.state;
                    member.stateDirection = data.stateDirection;
                    if (member.state <= 0) {
                        member.dead = true;
                        member.sock.emit('gameover', { world: false });
                    }
                    room.updateScores(member.type.name);
                    room.members.emit('changedstate', { member: member.UUID, state: data.state });
                });

                member.sock.on('disconnect', function() {
                    logger.debug(`${member.UUID} disconnected`);

                    room.members.emit('disconnected', member.UUID);

                    member.disconnect();
                    setTimeout(function() {
                        if (room.members.countActives() <= 0) {
                            roomManager.remove(room.UUID);
                        }
                    }, 5000);
                });
            }
        });
    });
});
