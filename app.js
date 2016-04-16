/**
* @Author: Paul Joannon
* @Date:   2016-04-15T23:45:19+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   Paul Joannon
* @Last modified time: 2016-04-16T07:34:19+02:00
*/

'use strict';

const logger = require('tracer').colorConsole({
    format: "{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})",
    dateformat: "HH:MM:ss"
});
const express = require('express');

let app = express();

app.get('/404', function(req, res) {
    // Oops, it seems that you're looking for something that doesn't exist.
    // Link to /
    res.send('404');
});

app.get('/', function(req, res) {
    // List rooms w/ uptime and population
    // User can join a room or create a new one
    res.send('Hello world!');
});

app.post('/r', function(req, res) {
    // Create new room
    // Redirect to /r/<new-room_UUID>
});

app.get('/r/:ruuid', function(req, res) {
    const roomUUID = req.params.ruuid;
    logger.debug(`Trying to access ${roomUUID} room`);

    // Check if room exists
    if (false) {
        res.send(`You\'re in ${roomUUID}`);
    } else {
        logger.error(`Room ${roomUUID} does not exist`);
        res.redirect('/404');
    }
});

app.listen(3000, function() {
    logger.info('Listening on 0.0.0.0:3000...');
});
