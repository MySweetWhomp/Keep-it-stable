/**
* @Author: Paul Joannon
* @Date:   2016-04-16T07:36:06+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   paulloz
* @Last modified time: 2016-04-16T16:09:17+02:00
*/

'use strict';

const UUIDGenerator = require('node-uuid');

const MemberManager = require('./members');
const logger = require('./logger');

class Room {
    constructor(UUID) {
        this.UUID = UUID || UUIDGenerator.v1();
        this.startedAt = Date.now();

        this.size = [7, 7];
        this.map = '';
        for (var i = 0; i < this.size[0]; ++i) {
            let line = '';
            for (var j = 0; j < this.size[1]; ++j) {
                line += '.';
            }
            this.map += `${line}\n`;
        }

        this.members = new MemberManager(this);

        this.types = {
            yellow: { },
            green: { },
            red: { },
            purple: { }
        };

        logger.debug(`Room construction, UUID is ${this.UUID}`);
        this.logMap();
    }

    connect(userUUID) {
        this.members.push(userUUID);
    }

    registerMember(member) {
        member = member || this.members.create();

        return member;
    }

    getCellIndex(x, y) {
        return (y * this.size[0]) + y + x;
    }

    isCellFree(x, y) {
        return this.map[this.getCellIndex(x, y)] === '.';
    }

    freeCell(x, y) {
        this.map = `${this.map.substr(0, this.getCellIndex(x, y))}.${this.map.substr(this.getCellIndex(x, y) + 1)}`;
        this.logMap();
    }

    occupyCell(x, y) {
        this.map = `${this.map.substr(0, this.getCellIndex(x, y))}x${this.map.substr(this.getCellIndex(x, y) + 1)}`;
        this.logMap();
    }

    logMap() {
        logger.debug(`\n${this.map}`);
    }
}

class RoomManager {
    constructor() {
        logger.debug('RoomManager construction');

        // Dumb no database implementation
        this.rooms = { };
        this.create('test-room');
    }

    exists(UUID) {
        return this.rooms[UUID] != null;
    }

    create(UUID) {
        let newRoom = new Room(UUID);

        this.rooms[newRoom.UUID] = newRoom;

        return newRoom;
    }

    getAll() {
        return this.rooms;
    }

    get(UUID) {
        return this.rooms[UUID];
    }
}

module.exports = exports = new RoomManager();
