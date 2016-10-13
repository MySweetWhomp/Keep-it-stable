/**
* @Author: Paul Joannon
* @Date:   2016-04-16T07:36:06+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   paulloz
* @Last modified time: 2016-10-13T17:48:58+02:00
*/

'use strict';

const UUIDGenerator = require('node-uuid');

const MemberManager = require('./members');
const logger = require('./logger');
const utils = require('./utils');

class Room {
    constructor(UUID) {
        this.UUID = UUID || UUIDGenerator.v1();
        this.startedAt = Date.now();
        this.mustDelete = 0;

        this.societyDownLimit = 25;

        this.size = [6, 1];
        this.map = '';
        for (let i = 0; i < this.size[1]; ++i) {
            let line = '';
            for (let j = 0; j < this.size[0]; ++j) {
                line += '.';
            }
            this.map += `${line}\n`;
        }

        this.members = new MemberManager(this);
        this.states = {
            ACTIVE: 1,
            SLEEPING: 2,
            DEAD: 3,
            HAPPY: 4
        };

        let possibleTypes = [
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
        for (let i = 0; i < this.types.length; ++i) {
            let j = Math.floor(Math.random() * possibleTypes.length),
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

        this.lastupdatescore = null;
    }

    getInfo() {
        return {
            members: this.members.getAllInfo(),
            size: this.size,
            societyDownLimit: this.societyDownLimit,
            states: this.states
        }
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
        this.crews['yellow'] = 0;
        this.crews['green'] = 0;
        this.crews['red'] = 0;
        this.crews['purple'] = 0;
        for (let i = 0; i < members.length; ++i) {
            if (members[i].sock != null || members[i].state !== this.states.ACTIVE || members[i].score <= 0 || members[i].score >= 100) {
                ++n[members[i].type.name];
                this.crews[members[i].type.name] += members[i].score;
            }
        }
        this.crews['yellow'] /= (n['yellow'] || 1);
        this.crews['green'] /= (n['green'] || 1);
        this.crews['red'] /= (n['red'] || 1);
        this.crews['purple'] /= (n['purple'] || 1);
        this.members.emit('updatedgauge', { score: this.crews[crew], crew: crew }, crew);

        let now = Date.now();
        if (this.lastupdatescore == null || now - this.lastupdatescore > 500) {
            this.world = this.crews['yellow'] + this.crews['green'] + this.crews['red'] + this.crews['purple'];
            let divisor = 0;
            if (n['yellow'] > 0) { divisor += 1; }
            if (n['green'] > 0) { divisor += 1; }
            if (n['red'] > 0) { divisor += 1; }
            if (n['purple'] > 0) { divisor += 1; }
            this.world /= divisor;
            this.members.emit('updatedgauge', { score: this.world });
            this.lastupdatescore = now;
        }

        if (this.world < this.societyDownLimit) {
            this.members.emit('gameover', { world: true });
            module.exports.remove(this.UUID);
        }
    }

    grow() {
        ++this.size[1];
        let newLine = '';
        for (let i = 0; i < this.size[0]; ++i) {
            newLine += '.';
        }
        this.map += `${newLine}\n`;
        this.members.emit('grow');
    }

    countActivePlayers() {
        return this.members.getAllActive().length;
    }

    logMap() {
        // logger.debug(`\n${this.map}`);
    }
}

class RoomManager {
    constructor() {
        logger.debug('RoomManager construction');

        this.names = require('./names.json');

        // Dumb no database implementation
        this.rooms = { };
    }

    exists(UUID) {
        return this.rooms[UUID] != null;
    }

    create() {
        const createName = () => `${utils.getRandomItemFrom(this.names.nouns)}${utils.getRandomItemFrom(this.names.suffixes)}`;
        let UUID = createName(),
            i = 0;
        while (Object.keys(this.rooms).indexOf(UUID) >= 0) {
            UUID = createName();
            if (++i > 100) { break; }
        }
        let newRoom = new Room(UUID);

        this.rooms[newRoom.UUID] = newRoom;

        return newRoom;
    }

    getAll() {
        for (let UUID in this.rooms) {
            if (this.rooms[UUID].countActivePlayers() <= 0) {
                if (++this.rooms[UUID].mustDelete >= 5) {
                    this.remove(UUID);
                }
            } else {
                this.rooms[UUID].mustDelete = 0;
            }
        }
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
