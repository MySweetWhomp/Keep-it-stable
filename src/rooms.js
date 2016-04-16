/**
* @Author: Paul Joannon
* @Date:   2016-04-16T07:36:06+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   Paul Joannon
* @Last modified time: 2016-04-16T07:45:54+02:00
*/

'use strict';

const UUIDGenerator = require('node-uuid');

const logger = require('./logger');

class Room {
    constructor() {
        this.UUID = UUIDGenerator.v1();

        logger.debug(`Room construction, UUID is ${this.UUID}`);
    }
}

class RoomManager {
    constructor() {
        logger.debug('RoomManager construction');

        // Dumb no database implementation
        this.rooms = { };
        this.create();
    }

    exist(UUID) {
        return this.rooms[UUID] != null;
    }

    create() {
        let newRoom = new Room();

        this.rooms[newRoom.UUID] = newRoom;

        return newRoom;
    }
}

module.exports = exports = new RoomManager();
