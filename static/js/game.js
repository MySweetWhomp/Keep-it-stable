/**
* @Author: Paul Joannon <paulloz>
* @Date:   2016-04-16T10:35:33+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   paulloz
* @Last modified time: 2016-04-17T17:00:04+02:00
*/

window.addEventListener('load', function() {
    var sock = io('http://' + window.location.hostname + ':3001'),
        musics = {
            slow: new Howl({
                urls: ['/static/assets/slow.mp3'],
                loop: true
            }),
            neutral: new Howl({
                urls: ['/static/assets/neutral.mp3'],
                loop: true
            }),
            rapid: new Howl({
                urls: ['/static/assets/rapid.mp3'],
                loop: true
            })
        },
        musicFadeTiming = 200,
        currentMusic,
        roomUUID = window.location.href.match(/\/([-\w]+)$/)[1],
        save = JSON.parse(window.localStorage.getItem('savedGame')),
        squareSize = 80,
        gauge = {
            me: document.querySelector('.megauge .gauge'),
            crew: document.querySelector('.crewgauge .gauge'),
            world: document.querySelector('.worldgauge .gauge')
        },
        instructions = document.querySelector('div.instructions'),
        me, room, map, room;

    document.body.addEventListener('click', function() {
        instructions.style.display = 'none';
    });

    document.querySelector('.info').addEventListener('click', function() {
        setTimeout(function() {
            instructions.style.display = 'block';
        }, 100);
    });

    window.addEventListener('beforeunload', function(){
        sock.close();
    });

    var scale = 20,
        scaleAssets = ['tomb', 'verysad', 'sad', 'neutral', 'happy', 'veryhappy', 'veryhappy'];

    var utils = {
        getRandomInt: function(min, max) { return Math.floor(Math.random() * (max - min)) + min; },
        getMemberIndex: function(UUID) {
            for (var i = 0; i < room.members.length; ++i) {
                if (UUID === room.members[i].UUID) {
                    return i;
                }
            }
        },
        getMember: function(UUID) {
            if (UUID === me.UUID) {
                return me;
            }
            return room.members[utils.getMemberIndex(UUID)];
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
                        positives.push(room.members[i]);
                }
            }
            return positives;
        },
        getAsset: function(member) {
            var stateAsset = member.state
                ? scaleAssets[parseInt(member.state / scale) + 1]
                : scaleAssets[0];
            return '/static/assets/' + member.type.name + stateAsset + '.gif';
        }
    };

    var computeScore = [
        function(input) {
            var score = 0;
            for (var i = 0; i < input.length; ++i) {
                score += input[i].type.name === me.type.name ? 1 : -2;
            }
            return score / (Math.abs(score) || 1);
        },
        function(input) {
            var score = 0;
            for (var i = 0; i < input.length; ++i) {
                score += input[i].type.name === me.type.antagonist ? -2 : 1;
            }
            return score / (Math.abs(score) || 1);
        },
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
            return -(computeScore[2](input));
        }
    ];

    if (save == null || save.roomUUID !== roomUUID || save.myUUID == null) {
        register();
    } else {
        register(save.myUUID);
    }

    function initMap() {
        cursor = document.querySelector('.cursor');
        map = document.querySelector('.map');
        map.style.width = String(squareSize * room.size[0] + 1) + 'px';
        map.style.height = String(squareSize * room.size[1] + 1) + 'px';

        map.parentNode.style.width = map.style.width;
        map.parentNode.querySelector('.left').style.height = map.style.height;
        map.parentNode.querySelector('.right').style.height = map.style.height;

        for (var i = 0; i < room.size[1]; ++i) {
            for (var j = 0; j < room.size[0]; ++j) {
                var square = document.createElement('div');
                square.classList.add('square', 'free');
                square.style.width = square.style.height = squareSize;
                map.appendChild(square);

                var onclick = (function(i, j, square) {
                    return function() {
                        if (square.classList.contains('free') && !me.dead && me.state > 0) {
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

    function changeMusic(oldMusic, force) {
        if (oldMusic) {
            musics[oldMusic].fade(1, 0, musicFadeTiming, function() {
                musics[oldMusic].stop();
            });
        }
        musics[currentMusic].play();
        musics[currentMusic].fade(0, 1, musicFadeTiming);
    }

    function register(myUUID) {
        sock.emit('register', { roomUUID: roomUUID, memberUUID: myUUID });
        sock.on('registered', function(data) {
            me = data.me;

            document.querySelector('.meicon').setAttribute('src', '/static/assets/icons' + me.type.name + '.gif');
            document.querySelector('.crewicon').setAttribute('src', '/static/assets/iconsgroup' + me.type.name + '.gif');

            save = { roomUUID: roomUUID, myUUID: me.UUID };
            window.localStorage.setItem('savedGame', JSON.stringify(save));

            sock.off('registered');

            sock.on('startedplay', start);
            instructions.querySelector('img').setAttribute('src', '/static/assets/instructions000' + String(me.type.rules) + '.png');
            instructions.querySelector('.instructionsme').setAttribute('src', '/static/assets/icons' + me.type.name + '.gif');
            if (me.type.rules === 1 && me.type.antagonist != null) {
                var antagonist = document.createElement('img');
                antagonist.classList.add('instructionsantagonist');
                antagonist.setAttribute('src', '/static/assets/icons' + me.type.antagonist + '.gif');
                instructions.appendChild(antagonist);
            }
            var startgame = function() {
                instructions.style.display = 'none';
                sock.emit('startplay');
            };
            document.body.addEventListener('click', startgame);
            document.body.addEventListener('touchend', startgame);

            function start(data) {
                sock.off('startedplay');
                document.querySelector('.game').style.display = document.querySelector('.hud').style.display = 'block';

                room = data.room;
                var meIndex = utils.getMemberIndex(me.UUID);
                room.members = room.members.slice(0, meIndex).concat(room.members.slice(meIndex + 1, room.members.length));
                initMap();
                me.picture = document.createElement('img');
                me.picture.classList.add('character');
                me.picture.setAttribute('src', utils.getAsset(me));
                map.appendChild(me.picture);

                moveToRandom();

                sock.on('connected', function(newMember) {
                    if (utils.getMember(newMember.UUID) == null) {
                        newMember.picture = document.createElement('img');
                        newMember.picture.classList.add('character');
                        newMember.picture.setAttribute('src', utils.getAsset(newMember));
                        map.appendChild(newMember.picture);
                        if (newMember.UUID !== me.UUID) {
                            room.members.push(newMember);
                        }
                    }
                });

                sock.on('disconnected', function(oldMember) {
                    var oldMemberIndex = utils.getMemberIndex(oldMember);
                    oldMember = room.members[oldMemberIndex];
                    if (oldMember && !oldMember.dead && oldMember.state > 0) {
                        map.removeChild(oldMember.picture);
                        utils.getMapCell(oldMember.pos.x, oldMember.pos.y).classList.add('free');
                        room.members = room.members.slice(0, oldMemberIndex).concat(room.members.slice(oldMemberIndex + 1, room.members.length));
                    }
                    updateState();
                });

                sock.on('moved', function(data) {
                    onmoved(data.member, data.instruction);
                });

                sock.on('changedstate', function(data) {
                    var member = utils.getMember(data.member);

                    member.state = data.state;
                    member.picture.setAttribute('src', utils.getAsset(member));
                });

                sock.on('updatedgauge', function(data) {
                    if (data.crew != null) {
                        gauge.crew.style.width = String(data.score) + '%';
                    } else {
                        gauge.world.style.width = String(data.score) + '%';
                    }
                });

                var timer;

                sock.on('gameover', function(data) {
                    if (data.world) {
                        document.querySelector('.gameover').style['background-image'] = 'url(/static/assets/gameoversociety.png)';
                    } else {
                        document.querySelector('.gameover').style['background-image'] = 'url(/static/assets/gameoverunhappy.png)';
                    }

                    document.querySelector('.game').style.display = 'none';
                    document.querySelector('.gameover').classList.remove('hidden');
                    setTimeout(function() {
                        sock.disconnect();
                    }, 3000);

                    var oldMusic = currentMusic;
                    currentMusic = 'slow';
                    changeMusic(oldMusic, true);

                    clearTimeout(timer);
                });

                var step = 5;
                function theStateUpdate() {
                    var cat = parseInt(me.state / scale);
                    me.state = Math.min(100, Math.max(0, me.state + (step * me.stateDirection)));
                    if (parseInt(me.state / scale) !== cat || (me.state === 0 && !me.dead)) {
                        updateState();
                    }
                    gauge.me.style['width'] = String(me.state) + '%';
                    if (!me.dead && me.state > 0) {
                        timer = setTimeout(theStateUpdate, 1000);
                    }
                };
                timer = setTimeout(theStateUpdate, 1000);
            }
        });
    }

    var isFirst = true;
    function updateState() {
        var newStateDirection = computeScore[me.type.rules](utils.getAdjacentMembers());
        if (me.stateDirection !== newStateDirection) {
            me.stateDirection = newStateDirection;
            if (!isFirst) {
                me.state = Math.min(100, Math.max(20, me.state + (scale * me.stateDirection)));
            }
        }
        gauge.me.style['width'] = String(me.state) + '%';
        changeState(me.state, me.stateDirection);
        isFirst = false;

        var oldMusic = currentMusic;
        if (me.state < 40) {
            currentMusic = 'slow';
        } else if (me.state >= 40 && me.state < 80) {
            currentMusic = 'neutral';
        } else {
            currentMusic = 'rapid';
        }
        if (oldMusic !== currentMusic) {
            changeMusic(oldMusic);
        }
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
                cursor.style.top = me.picture.style.top;
                cursor.style.left = me.picture.style.left;
            }

            if (!skipStateComputation) {
                // Update state
                updateState();
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

    function changeState(newState, newStateDirection) {
        sock.emit('changestate', { state: newState, direction: newStateDirection });
    }
});
