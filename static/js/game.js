/**
* @Author: Paul Joannon <paulloz>
* @Date:   2016-04-16T10:35:33+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   Paul Joannon
* @Last modified time: 2016-04-21T22:27:43+02:00
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
        sounds = {
            plop: new Howl({
                urls: ['/static/assets/plop.mp3'],
                loop: false
            })
        },
        musicFadeTiming = 200,
        currentMusic,
        roomUUID,
        save = JSON.parse(window.localStorage.getItem('savedGame')),
        squareSize = 80,
        gauge = {
            me: document.querySelector('.megauge .gauge'),
            crew: document.querySelector('.crewgauge .gauge'),
            world: document.querySelector('.worldgauge .gauge')
        },
        instructions = document.querySelector('div.instructions'),
        me, room, map;

        roomUUID = window.location.href.match(/\/([-\w]+)$/);
        if (roomUUID != null) {
            roomUUID = roomUUID[1]
        } else if (window.location.search.match(/^\?[-\w]+$/) != null) {
            roomUUID = window.location.search.replace(/^\?/, '');
        } else {
            window.location.href = '/';
        }
        // document.querySelector('title').innerText.replace(/ -.*$/, ' - ' + roomUUID);

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
        scaleAssets = ['eliminated', 'verysad', 'sad', 'neutral', 'happy', 'veryhappy', 'veryhappy'];

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
            if (member.state !== room.states.SLEEPING) {
                var scoreAsset = member.score
                    ? scaleAssets[parseInt(member.score / scale) + 1]
                    : scaleAssets[0];
                return '/static/assets/' + member.type.name + scoreAsset + '.gif';
            } else {
                return '/static/assets/' + member.type.name + 'sleeping.gif';
            }
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
            if (room.size[1] > 1) {
                if (me.pos.x <= 0 || me.pos.x >= room.size[0] - 1) {
                    total -= (me.pos.y <= 0 || me.pos.y >= room.size[1] - 1) ? 5 : 3;
                } else if (me.pos.y <= 0 || me.pos.y >= room.size[1] - 1) {
                    total -= (me.pos.x <= 0 || me.pos.x >= room.size[0] - 1) ? 5 : 3;
                }
            } else {
                total = (me.pos.x <= 0 || me.pos.x >= room.size[0] - 1) ? 1 : 2;
            }
            if (total === 1) { return -1; }
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

    function createSquare(map, i, j) {
        var square = document.createElement('div');
        square.classList.add('square', 'free');
        square.style.width = square.style.height = squareSize;
        if (Math.floor(Math.random() * 3) === 0) {
            square.classList.add('square-' + String(Math.floor(Math.random()* 8) + 1));
        }
        map.appendChild(square);

        var onclick = (function(i, j, square) {
            return function() {
                if (square.classList.contains('free') && me.state === room.states.ACTIVE && me.score > 0) {
                    move(j, i);
                    sounds.plop.play();
                }
            };
        })(i, j, square);
        square.addEventListener('click', onclick);
        square.addEventListener('touchEnd', onclick);
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
                createSquare(map, i, j);
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

                me.state = room.states.ACTIVE;

                var meIndex = utils.getMemberIndex(me.UUID);
                room.members = room.members.slice(0, meIndex).concat(room.members.slice(meIndex + 1, room.members.length));
                initMap();
                me.picture = document.createElement('img');
                me.picture.classList.add('character');
                me.picture.setAttribute('src', utils.getAsset(me));
                map.appendChild(me.picture);
                me.feedback = document.createElement('div');
                me.feedback.classList.add('feedback');
                me.feedback.picture = document.createElement('div');
                me.feedback.appendChild(me.feedback.picture);
                map.appendChild(me.feedback);

                if (me.pos.x < 0 || me.pos.y < 0) {
                    moveToRandom();
                } else {
                    onmoved(me.UUID, me.pos);
                }

                sock.on('connected', function(newMember) {
                    var member = utils.getMember(newMember.UUID);
                    if (member == null) {
                        newMember.picture = document.createElement('img');
                        newMember.picture.classList.add('character');
                        newMember.picture.setAttribute('src', utils.getAsset(newMember));
                        map.appendChild(newMember.picture);
                        if (newMember.UUID !== me.UUID) {
                            room.members.push(newMember);
                        }
                    } else {
                        member.state = newMember.state;
                        member.score = newMember.score;
                        member.picture.setAttribute('src', utils.getAsset(newMember));
                    }
                });

                sock.on('disconnected', function(data) {
                    var oldMember = room.members[utils.getMemberIndex(data.member)];
                    if (oldMember != null) {
                        oldMember.state = data.state;
                        if (oldMember.state === room.states.DEAD) {
                            oldMember.score = 0;
                        }
                        console.debug(oldMember);
                        oldMember.picture.setAttribute('src', utils.getAsset(oldMember));
                        updateScore();
                    }
                });

                sock.on('moved', function(data) {
                    onmoved(data.member, data.instruction);
                });

                sock.on('changedscore', function(data) {
                    var member = utils.getMember(data.member);

                    member.score = data.score;
                    member.picture.setAttribute('src', utils.getAsset(member));
                });

                sock.on('updatedgauge', function(data) {
                    if (data.crew != null) {
                        gauge.crew.style.width = String(data.score) + '%';
                    } else {
                        gauge.world.style.width = String(
                            (((data.score - room.societyDownLimit) * (100 - 0)) / (100 - room.societyDownLimit)) + 0
                        ) + '%';
                    }
                });

                var timer;

                sock.on('gameover', function(data) {
                    if (data.world) {
                        document.querySelector('.gameover').style['background-image'] = 'url(/static/assets/gameoversociety.png)';
                    } else {
                        document.querySelector('.gameover').style['background-image'] = 'url(/static/assets/gameoverunhappy.png)';
                    }

                    document.querySelector('.game').style.display = document.querySelector('.hud').style.display = document.querySelector('.info').style.display = document.querySelector('.instructions').style.display = 'none';
                    document.querySelector('.gameover').classList.remove('hidden');
                    setTimeout(function() {
                        sock.disconnect();
                    }, 3000);

                    var oldMusic = currentMusic;
                    currentMusic = 'slow';
                    changeMusic(oldMusic, true);

                    clearTimeout(timer);
                });

                sock.on('grow', function() {
                    ++room.size[1];

                    var map = document.querySelector('.map');

                    for (var i = 0; i < room.size[0]; ++i) {
                        createSquare(map, room.size[1] - 1, i);
                    }
                    document.querySelector('.game').classList.add('shake', 'shake-constant');
                    map.style.height = String(squareSize * room.size[1] + 1) + 'px';
                    map.parentNode.querySelector('.left').style.height = map.style.height;
                    map.parentNode.querySelector('.right').style.height = map.style.height;
                    setTimeout(function() {
                        document.querySelector('.game').classList.remove('shake', 'shake-constant');
                    }, 510);
                });

                var step = 5;
                function theScoreUpdate() {
                    var cat = parseInt(me.score / scale);
                    me.score = Math.min(100, Math.max(0, me.score + (step * me.scoreDynamic)));
                    if (parseInt(me.score / scale) !== cat || (me.score === 0 && me.state !== room.states.DEAD)) {
                        updateScore();
                    }
                    gauge.me.style['width'] = String(me.score) + '%';
                    if (me.score > 0 && me.state !== room.states.DEAD) {
                        timer = setTimeout(theScoreUpdate, 1000);
                    }
                };
                timer = setTimeout(theScoreUpdate, 1000);
            }
        });
    }

    var isFirst = true;
    function updateScore() {
        var newScoreDynamic = computeScore[me.type.rules](utils.getAdjacentMembers());
        if (me.scoreDynamic !== newScoreDynamic) {
            me.scoreDynamic = newScoreDynamic;

            me.feedback.classList.remove('p1', 'm1');
            gauge.me.classList.remove('p1', 'm1');
            if (me.scoreDynamic !== 0) {
                if (me.scoreDynamic > 0) {
                    me.feedback.classList.add('p1');
                    gauge.me.classList.add('p1');
                } else {
                    me.feedback.classList.add('m1');
                    gauge.me.classList.add('m1');
                }
            }

            if (!isFirst) {
                me.score = Math.min(100, Math.max(20, me.score + (scale * me.scoreDynamic)));
            }
        }
        gauge.me.style['width'] = String(me.score) + '%';
        changeScore(me.score, me.scoreDynamic);
        isFirst = false;

        var oldMusic = currentMusic;
        if (me.score < 40) {
            currentMusic = 'slow';
        } else if (me.score >= 40 && me.score < 80) {
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
                cursor.style.left = me.feedback.style.left = me.picture.style.left;
                me.feedback.style.top = parseInt(me.picture.style.top) - (squareSize * 0.75);
            }

            if (!skipStateComputation) {
                // Update state
                updateScore();
            }

            personWhoMoved.picture.style.display = 'block';
        }
    }

    function move(x, y, onnomoved) {
        sock.emit('move', { x: x, y: y });
        sock.on('nomoved', function() {
            sock.off('nomoved');
            if (onnomoved != null) {
                onnomoved();
            }
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
        move(x, y, moveToRandom);
    }

    function changeScore(newScore, newScoreDynamic) {
        sock.emit('changescore', { score: newScore, direction: newScoreDynamic });
    }
});
