/**
* @Author: Paul Joannon <paulloz>
* @Date:   2016-04-16T10:35:33+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   paulloz
* @Last modified time: 2016-04-16T14:53:29+02:00
*/

window.addEventListener('load', function() {

    var sock = io('http://' + window.location.hostname + ':3001'),
        roomUUID = window.location.href.match(/\/([-\w]+)$/)[1],
        save = JSON.parse(window.localStorage.getItem('savedGame')),
        squareSize = 96,
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
        getAsset: function() {
            return '/static/assets/blob.png';
        }
    };

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
                square.addEventListener('click', (function(i, j) {
                    return function() {
                        if (square.classList.contains('free')) {
                            move(j, i);
                        }
                    };
                })(i, j));
                map.appendChild(square);
            }
        }

        for (var i = 0; i < room.members.length; ++i) {
            var member = room.members[i];
            if (member.pos.x >= 0 && member.pos.y >= 0) {
                member.picture = document.createElement('img');
                member.picture.classList.add('character');
                member.picture.setAttribute('src', utils.getAsset());
                map.appendChild(member.picture);
                onmoved(member.UUID, member.pos);
            }
        }
    };

    function register(myUUID) {
        sock.emit('register', { roomUUID: roomUUID, memberUUID: myUUID });
        sock.on('registered', function(data) {
            me = data.me;

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
                    room.members.push(newMember);
                }
            });

            sock.on('moved', function(data) {
                onmoved(data.member, data.instruction);
            });
        });
    }

    function onmoved(UUID, newPos) {
        var personWhoMoved = utils.getMember(UUID);

        if (personWhoMoved != null) {
            if (personWhoMoved.pos.x >= 0 && personWhoMoved.pos.y >= 0) {
                utils.getMapCell(personWhoMoved.pos.x, personWhoMoved.pos.y).classList.add('free');
            }
            personWhoMoved.pos = newPos;
            utils.getMapCell(personWhoMoved.pos.x, personWhoMoved.pos.y).classList.remove('free');
            personWhoMoved.picture.style.top = personWhoMoved.pos.y * squareSize;
            personWhoMoved.picture.style.left = personWhoMoved.pos.x * squareSize;
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
