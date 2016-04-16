/**
* @Author: Paul Joannon
* @Date:   2016-04-16T07:37:50+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   Paul Joannon
* @Last modified time: 2016-04-16T07:38:50+02:00
*/

'use strict';

module.exports = exports = require('tracer').colorConsole({
    format: "{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})",
    dateformat: "HH:MM:ss"
});
