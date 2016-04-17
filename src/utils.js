/**
* @Author: Paul Joannon
* @Date:   2016-04-17T21:25:30+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   Paul Joannon
* @Last modified time: 2016-04-17T21:28:10+02:00
*/

'use strict';

module.exports = exports = {
    getRandomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    },

    getNRandomInts: function(min, max, n) {
        let x = [];
        for (var i = 0; i < n; ++i) {
            x.push(module.exports.getRandomInt(min, max));
        }
        return x;
    }

};
