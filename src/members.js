/**
* @Author: Paul Joannon <paulloz>
* @Date:   2016-04-16T11:06:33+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   paulloz
* @Last modified time: 2016-04-16T11:27:21+02:00
*/

'use strict';

const UUIDGenerator = require('node-uuid');

const logger = require('./logger');

class Member {
    constructor() {
        this.UUID = UUIDGenerator.v1();

        logger.debug(`Member construction, UUID is ${this.UUID}`);
    }
}

class MemberManager {
    constructor() {
        logger.debug('MemberManager construction');

        this.members = { };
    }

    create() {
        let newMember = new Member();

        this.members[newMember.UUID] = newMember;

        return newMember;
    }

    getAll() {
        return this.members;
    }

    get(UUID) {
        return this.members[UUID];
    }
}

module.exports = exports = MemberManager;
