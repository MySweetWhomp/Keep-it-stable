/**
* @Author: Paul Joannon
* @Date:   2016-04-16T07:36:06+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   paulloz
* @Last modified time: 2016-04-17T15:34:52+02:00
*/

'use strict';

const UUIDGenerator = require('node-uuid');

const MemberManager = require('./members');
const logger = require('./logger');

class Room {
    constructor(UUID) {
        this.UUID = UUID || UUIDGenerator.v1();
        this.startedAt = Date.now();

        this.size = [6, 4];
        this.map = '';
        for (var i = 0; i < this.size[1]; ++i) {
            let line = '';
            for (var j = 0; j < this.size[0]; ++j) {
                line += '.';
            }
            this.map += `${line}\n`;
        }

        this.members = new MemberManager(this);

        var possibleTypes = [
            [0, 1, 2, 3],
            [0, 1, 1, 2],
            [0, 1, 1, 3],
            [0, 0, 1, 2],
            [0, 0, 1, 3]
        ];
        possibleTypes = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
        this.types = [
            { name: 'yellow', rules: null },
            { name: 'green', rules: null },
            { name: 'red', rules: null },
            { name: 'purple', rules: null }
        ];
        for (var i = 0; i < this.types.length; ++i) {
            var j = Math.floor(Math.random() * possibleTypes.length),
                type = possibleTypes[j];
            possibleTypes = possibleTypes.slice(0, j).concat(possibleTypes.slice(j + 1, possibleTypes.length));
            this.types[i].rules = type;
            if (this.types[i].rules === 1) {
                this.types[i].antagonist = this.types[i].name;
                while (this.types[i].antagonist === this.types[i].name) {
                    this.types[i].antagonist = this.types[Math.floor(Math.random() * this.types.length)].name;
                }
            }
        }

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
            if ((members[i].sock != null || members[i].dead)) {
                ++n[members[i].type.name];
                if (members[i].type.name === crew) {
                    this.crews[crew] += members[i].state;
                }
            }
        }
        this.crews[crew] /= n[crew];
        this.members.emit('updatedgauge', { score: this.crews[crew], crew: crew }, crew);

        this.world = this.crews['yellow'] + this.crews['green'] + this.crews['red'] + this.crews['purple'];
        var divisor = 0;
        if (n['yellow'] > 0) { divisor += 1; }
        if (n['green'] > 0) { divisor += 1; }
        if (n['red'] > 0) { divisor += 1; }
        if (n['purple'] > 0) { divisor += 1; }
        this.world /= divisor;
        this.members.emit('updatedgauge', { score: this.world });

        if (this.world < 20) {
            this.members.emit('gameover', { world: true });
            module.exports.remove(this.UUID);
        }
    }

    logMap() {
        // logger.debug(`\n${this.map}`);
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

    remove(UUID) {
        this.rooms[UUID] = undefined;
    }
}

module.exports = exports = new RoomManager();
