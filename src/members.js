/**
* @Author: Paul Joannon <paulloz>
* @Date:   2016-04-16T11:06:33+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   paulloz
* @Last modified time: 2016-04-16T19:38:52+02:00
*/

'use strict';

const UUIDGenerator = require('node-uuid');

const logger = require('./logger');

const getRandomInt = function(min, max) { return Math.floor(Math.random() * (max - min)) + min; };
const getNRandomInts = function(min, max, n) {
    let x = []
    for (var i = 0; i < n; ++i) {
        x.push(getRandomInt(min, max));
    }
    return x;
}

class Member {
    constructor(room) {
        this.UUID = UUIDGenerator.v1();
        this.room = room;
        this.pos = { x: -1, y: -1 };
        this.state = 0;

        this.lastaction = Date.now();

        var possibleTypes = getNRandomInts(0, Object.keys(this.room.types).length, 100);
        this.type = this.room.types[possibleTypes[getRandomInt(0, possibleTypes.length)]];
        // Must generate a surname

        logger.debug(`Member construction, UUID is ${this.UUID}`);
    }

    getInfo() {
        return {
            UUID: this.UUID,
            pos: this.pos,
            type: this.type,
            state: this.state
        };
    }

    freeCellPos() {
        if (this.pos.x >= 0 && this.pos.y >= 0) {
            this.room.freeCell(this.pos.x, this.pos.y);
        }
    }

    move(instruction) {
        this.freeCellPos();
        this.pos.x = instruction.x;
        this.pos.y = instruction.y;
        this.room.occupyCell(this.pos.x, this.pos.y);

        logger.info(`Player ${this.UUID}@${this.room.UUID} moved to (${this.pos.x}, ${this.pos.y})`);
    }

    disconnect() {
        this.sock = undefined;
        this.freeCellPos();
    }
}

class MemberManager {
    constructor(room) {
        logger.debug('MemberManager construction');

        this.room = room;

        this.members = [ ];
        this.membersMap = { };
    }

    create() {
        let newMember = new Member(this.room);

        this.members.push(newMember);
        this.membersMap[newMember.UUID] = this.members.length - 1;

        return newMember;
    }

    getAll() {
        return this.members;
    }

    getAllInfo() {
        let members = [];
        for (var i = 0; i < this.members.length; ++i) {
            if (this.members[i].sock != null) {
                members.push(this.members[i].getInfo());
            }
        }
        return members;
    }

    get(UUID) {
        return this.members[this.membersMap[UUID]];
    }

    emit(type, data) {
        for (var i = 0; i < this.members.length; ++i) {
            if (this.members[i].sock != null) {
                this.members[i].sock.emit(type, data);
            }
        }
    }
}

module.exports = exports = MemberManager;
