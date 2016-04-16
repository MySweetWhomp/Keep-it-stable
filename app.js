/**
* @Author: Paul Joannon
* @Date:   2016-04-15T23:45:19+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   paulloz
* @Last modified time: 2016-04-16T10:07:00+02:00
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
    logger.debug(`Trying to access ${roomUUID} room`);

    // Check if room exists
    if (roomManager.exist(roomUUID)) {
        res.send(`You\'re in ${roomUUID}`);
    } else {
        logger.error(`Room ${roomUUID} does not exist`);
        res.redirect('/404');
    }
});

app.set('view engine', 'pug');
app.use(express.static('static'));

app.listen(3000, function() {
    logger.info('Listening on 0.0.0.0:3000...');
});
