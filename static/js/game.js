/**
* @Author: Paul Joannon <paulloz>
* @Date:   2016-04-16T10:35:33+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   paulloz
* @Last modified time: 2016-04-16T17:45:47+02:00
*/

window.addEventListener('load', function() {
    var sock = io('http://' + window.location.hostname + ':3001'),
        roomUUID = window.location.href.match(/\/([-\w]+)$/)[1],
        save = JSON.parse(window.localStorage.getItem('savedGame')),
        squareSize = 80,
        me, room, map, room;

    window.addEventListener('beforeunload', function(){
        sock.close();
    });

    var utils = {
        getRandomInt: function(min, max) { return Math.floor(Math.random() * (max - min)) + min; },
        getMember: function(UUID) {
            for (var i = 0; i < room.members.length; ++i) {
                if (UUID === room.members[i].UUID) {
                    return room.members[i];
                }
            }
        },
        getMapCell: function(x, y) {
            return map.querySelectorAll('.square')[(y * room.size[0]) + x];
        },
        getAdjacentMembers: function(member) {
            member = member || me;
            var positives = [],
                refX = member.pos.x,
                refY = member.pos.y;
            for (var i = 0; i < room.members.length; ++i) {
                var x = room.members[i].pos.x,
                    y = room.members[i].pos.y;
                if ((y >= refY - 1) && (y <= refY + 1) &&
                    (x >= refX - 1) && (x <= refX + 1) &&
                    (member.UUID !== room.members[i].UUID)) {
                        positives.push(member);
                }
            }
            return positives;
        },
        getAsset: function(member) {
            return '/static/assets/' + member.type.name + '.png';
        }
    };

    var computeScore = [
        function(input) {
            var total = 8;
            if (me.pos.x <= 0 || me.pos.x >= room.size[0] - 1){
                total -= (me.pos.y <= 0 || me.pos.y >= room.size[1] - 1) ? 5 : 3;
            } else if (me.pos.y <= 0 || me.pos.y >= room.size[1] - 1) {
                total -= (me.pos.x <= 0 || me.pos.x >= room.size[0] - 1) ? 5 : 3;
            }
            return input.length >= (total / 2) ? -1 : 1;
        },
        function(input) {
            return -(computeScore[0](input));
        },
        function(input) {
            var score = 0;
            for (var i = 0; i < input.length; ++i) {
                score += input[i].type.name === me.type.name ? 1 : -1;
            }
            return score;
        },
        function(input) {
            return -(computeScore[0](input));
        }
    ];

    if (save == null || save.roomUUID !== roomUUID || save.myUUID == null) {
        register();
    } else {
        register(save.myUUID);
    }

    function initMap() {
        map = document.querySelector('.map');
        map.style.width = String(squareSize * room.size[0] + 1) + 'px';
        map.style.height = String(squareSize * room.size[0] + 1) + 'px';

        for (var i = 0; i < room.size[0]; ++i) {
            for (var j = 0; j < room.size[1]; ++j) {
                var square = document.createElement('div');
                square.classList.add('square', 'free');
                square.style.width = square.style.height = squareSize;
                map.appendChild(square);

                var onclick = (function(i, j, square) {
                    return function() {
                        if (square.classList.contains('free')) {
                            move(j, i);
                        }
                    };
                })(i, j, square);
                square.addEventListener('click', onclick);
                square.addEventListener('touchEnd', onclick);
            }
        }

        for (var i = 0; i < room.members.length; ++i) {
            var member = room.members[i];
            member.picture = document.createElement('img');
            member.picture.classList.add('character');
            member.picture.setAttribute('src', utils.getAsset(member));
            map.appendChild(member.picture);
            if (member.pos.x >= 0 && member.pos.y >= 0) {
                onmoved(member.UUID, member.pos, true);
            }
        }
    };

    function register(myUUID) {
        sock.emit('register', { roomUUID: roomUUID, memberUUID: myUUID });
        sock.on('registered', function(data) {
            me = data.me;
            me.state = 1;

            save = { roomUUID: roomUUID, myUUID: me.UUID };
            window.localStorage.setItem('savedGame', JSON.stringify(save));

            sock.off('registered');

            room = data.room;
            initMap();

            if (myUUID == null || me.pos.x < 0 || me.pos.y < 0) {
                moveToRandom();
            }

            sock.on('connected', function(newMember) {
                if (newMember.UUID !== me.UUID && utils.getMember(newMember.UUID) == null) {
                    newMember.picture = document.createElement('img');
                    newMember.picture.classList.add('character');
                    newMember.picture.setAttribute('src', utils.getAsset(newMember));
                    map.appendChild(newMember.picture);
                    room.members.push(newMember);
                }
            });

            sock.on('moved', function(data) {
                onmoved(data.member, data.instruction);
            });
        });
    }

    function onmoved(UUID, newPos, skipStateComputation) {
        var personWhoMoved = utils.getMember(UUID);

        if (personWhoMoved != null) {
            if (personWhoMoved.pos.x >= 0 && personWhoMoved.pos.y >= 0) {
                utils.getMapCell(personWhoMoved.pos.x, personWhoMoved.pos.y).classList.add('free');
            }
            personWhoMoved.pos = newPos;
            utils.getMapCell(personWhoMoved.pos.x, personWhoMoved.pos.y).classList.remove('free');
            personWhoMoved.picture.style.top = (personWhoMoved.pos.y * squareSize) + (squareSize / 2);
            personWhoMoved.picture.style.left = (personWhoMoved.pos.x * squareSize) + (squareSize / 2);

            if (UUID === me.UUID) {
                me = personWhoMoved;
            }

            if (!skipStateComputation) {
                // Update state
                var newState = computeScore[me.type.rules](utils.getAdjacentMembers());
                if (me.state !== newState) {
                    var colors = { '-1': 'red', '0': 'transparent', '1': 'green' };
                    me.state = newState;
                    me.picture.style['background-color'] = colors[String(me.state)];
                }
            }
        }
    }

    function move(x, y) {
        sock.emit('move', { x: x, y: y });
        sock.on('nomoved', function() {
            sock.off('nomoved');
        });
    }

    function moveToRandom() {
        var x, y, ok = false;
        while (!ok) {
            x = utils.getRandomInt(0, room.size[0]);
            y = utils.getRandomInt(0, room.size[1]);
            if (utils.getMapCell(x, y).classList.contains('free')) {
                ok = true;
            }
        }
        move(x, y);
    }
});
