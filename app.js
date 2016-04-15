/**
* @Author: Paul Joannon
* @Date:   2016-04-15T23:45:19+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   Paul Joannon
* @Last modified time: 2016-04-16T00:24:21+02:00
*/

'use strict';

const logger = require('tracer').colorConsole({
    format: "{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})",
    dateformat: "HH:MM:ss"
});
const express = require('express');

let app = express();

app.get('/', function(req, res) {
    res.send('Hello world!');
});

app.listen(3000, function() {
    logger.info('Listening on 0.0.0.0:3000');
});
