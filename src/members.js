
/**
* @Author: Paul Joannon <paulloz>
* @Date:   2016-04-16T11:06:33+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   Paul Joannon
* @Last modified time: 2016-04-21T21:07:15+02:00
*/

'use strict';

const UUIDGenerator = require('node-uuid');

const logger = require('./logger');

const utils = require('./utils');

class Member {
    constructor(room) {
        this.UUID = UUIDGenerator.v1();
        this.room = room;
        this.pos = { x: -1, y: -1 };
        this.score = 50;
        this.scoreDynamic = 0;

        this.state = room.memberStates.SLEEPING;
        this.lastaction = Date.now();

        var possibleTypes = utils.getNRandomInts(0, Object.keys(this.room.types).length, 100);
        this.type = this.room.types[utils.getRandomItemFrom(possibleTypes)];

        logger.debug(`Member construction, UUID is ${this.UUID}`);
    }

    getInfo() {
        return {
            UUID: this.UUID,
            pos: this.pos,
            type: this.type,
            score: this.score,
            scoreDynamic: this.scoreDynamic,
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

    connect() {
        this.state = this.room.memberStates.ACTIVE;
        this.room.members.emit('connected', this.getInfo());
    }

    disconnect() {
        this.sock = undefined;
        this.lastaction = Date.now();
        this.state = this.room.memberStates.SLEEPING;

        this.room.members.emit('disconnected', this.UUID);
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
            if (this.members[i].sock != null || this.members[i].dead) {
                members.push(this.members[i].getInfo());
            }
        }
        return members;
    }

    get(UUID) {
        return this.members[this.membersMap[UUID]];
    }

    emit(type, data, crew) {
        for (var i = 0; i < this.members.length; ++i) {
            if (this.members[i].sock != null) {
                if (crew == null || this.members[i].type.name === crew) {
                    this.members[i].sock.emit(type, data);
                }
            }
        }
    }

    count(disconnected, dead) {
        let n = 0;
        for (let i = 0; i < this.members.length; ++i) {
            if (this.members[i].sock != null || disconnected || (dead && this.members[i].dead)) {
                ++n;
            }
        }
        return n;
    }

    countActives() {
        return this.count(false, false);
    }
}

module.exports = exports = MemberManager;
