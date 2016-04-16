/**
* @Author: Paul Joannon
* @Date:   2016-04-16T07:36:06+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   paulloz
* @Last modified time: 2016-04-16T11:32:14+02:00
*/

'use strict';

const UUIDGenerator = require('node-uuid');

const MemberManager = require('./members');
const logger = require('./logger');

class Room {
    constructor(UUID) {
        this.UUID = UUID || UUIDGenerator.v1();
        this.startedAt = Date.now();

        this.members = new MemberManager();

        logger.debug(`Room construction, UUID is ${this.UUID}`);
    }

    connect(userUUID) {
        this.members.push(userUUID);
    }

    registerMember(member) {
        member = member || this.members.create();

        return member;
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
