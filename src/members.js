/**
* @Author: Paul Joannon <paulloz>
* @Date:   2016-04-16T11:06:33+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   paulloz
* @Last modified time: 2016-04-16T14:08:42+02:00
*/

'use strict';

const UUIDGenerator = require('node-uuid');

const logger = require('./logger');

class Member {
    constructor(room) {
        this.UUID = UUIDGenerator.v1();
        this.room = room;
        this.pos = { x: -1, y: -1 };
        // Must generate a surname

        logger.debug(`Member construction, UUID is ${this.UUID}`);
    }

    getInfo() {
        return {
            UUID: this.UUID,
            pos: this.pos
        };
    }

    move(instruction) {
        if (this.pos.x >= 0 && this.pos.y >= 0) {
            this.room.freeCell(this.pos.x, this.pos.y);
        }
        this.pos.x = instruction.x;
        this.pos.y = instruction.y;
        this.room.occupyCell(this.pos.x, this.pos.y);

        logger.info(`Player ${this.UUID}@${this.room.UUID} moved to (${this.pos.x}, ${this.pos.y})`);
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
            members.push(this.members[i].getInfo());
        }
        return members;
    }

    get(UUID) {
        return this.members[this.membersMap[UUID]];
    }

    emit(type, data) {
        for (var i = 0; i < this.members.length; ++i) {
            this.members[i].sock.emit(type, data);
        }
    }
}

module.exports = exports = MemberManager;
