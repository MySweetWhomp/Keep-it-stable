/**
* @Author: Paul Joannon
* @Date:   2016-04-15T23:45:19+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   paulloz
* @Last modified time: 2016-04-16T10:51:29+02:00
*/

'use strict';

const express = require('express');

const logger = require('./src/logger');


let app = express();
let roomManager = require('./src/rooms');

app.get('/404', function(req, res) {
    // Oops, it seems that you're looking for something that doesn't exist.
    // Link to /
    res.send('404');
});

app.get('/', function(req, res) {
    // List rooms w/ uptime and population
    // User can join a room or create a new one
    res.render('index', { rooms: roomManager.getAll() });
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
    if (roomManager.exist(roomUUID)) {
        res.render('room', { room : roomManager.get(roomUUID) });
    } else {
        logger.error(`Room ${roomUUID} does not exist`);
        res.redirect('/404');
    }
});

app.set('view engine', 'pug');
app.use('/static', express.static('static/'));
app.use('/static/lib/socket-io', express.static('node_modules/socket.io-client/', { extensions: ['js'] }));

app.listen(3000, function() {
    logger.info('Listening on 0.0.0.0:3000...');

    const server = require('http').createServer(app);
    server.listen(3001);
    logger.info('Listening on socket 0.0.0.0:3001...');
    let io = require('socket.io')(server);
    io.on('connection', function() {
        logger.debug('LOL')
    });
});
