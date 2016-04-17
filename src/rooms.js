/**
* @Author: Paul Joannon
* @Date:   2016-04-16T07:36:06+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   paulloz
* @Last modified time: 2016-04-17T10:41:53+02:00
*/

'use strict';

const UUIDGenerator = require('node-uuid');

const MemberManager = require('./members');
const logger = require('./logger');

class Room {
    constructor(UUID) {
        this.UUID = UUID || UUIDGenerator.v1();
        this.startedAt = Date.now();

        this.size = [11, 7];
        this.map = '';
        for (var i = 0; i < this.size[1]; ++i) {
            let line = '';
            for (var j = 0; j < this.size[0]; ++j) {
                line += '.';
            }
            this.map += `${line}\n`;
        }

        this.members = new MemberManager(this);

        this.types = [
            { name: 'yellow', rules: 0 },
            { name: 'green', rules: 1 },
            { name: 'red', rules: 2 },
            { name: 'purple', rules: 3 }
        ];

        this.world = 0;
        this.crews = {
            yellow: 0,
            green: 0,
            red: 0,
            purple: 0
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

    updateScores(crew) {
        let members = this.members.getAll();
        let n = { yellow: 0, green: 0, red: 0, purple: 0 };
        this.crews[crew] = 0;
        for (var i = 0; i < members.length; ++i) {
            if ((members[i].sock != null || members[i].dead) && members[i].type.name === crew) {
                this.crews[crew] += members[i].state;
                ++n[crew];
            }
        }
        this.crews[crew] /= n[crew];
        this.members.emit('updatedgauge', { score: this.crews[crew], crew: crew });

        this.world = this.crews[crew];
        if (crew !== 'yellow' && n['yellow'] > 0) {
            this.world = (this.world + this.crews['yellow']) / 2;
        }
        if (crew !== 'green' && n['green'] > 0) {
            this.world = (this.world + this.crews['green']) / 2;
        }
        if (crew !== 'red' && n['red'] > 0) {
            this.world = (this.world + this.crews['red']) / 2;
        }
        if (crew !== 'purple' && n['purple'] > 0) {
            this.world = (this.world + this.crews['purple']) / 2;
        }
        this.members.emit('updatedgauge', { score: this.world });
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
