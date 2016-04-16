/**
* @Author: Paul Joannon <paulloz>
* @Date:   2016-04-16T10:35:33+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   paulloz
* @Last modified time: 2016-04-16T11:34:53+02:00
*/

window.addEventListener('load', function() {
    var sock = io('http://' + window.location.hostname + ':3001'),
        roomUUID = window.location.href.match(/\/([-\w]+)$/)[1],
        save = JSON.parse(window.localStorage.getItem('savedGame'));

    window.addEventListener('beforeunload', function(){
        sock.close();
    });

    if (save == null || save.roomUUID !== roomUUID || save.myUUID == null) {
        register();
    } else {
        register(save.myUUID);
    }

    function register(myUUID) {
        sock.emit('register', { roomUUID: roomUUID, memberUUID: myUUID });
        sock.on('registered', function(data) {
            save = { roomUUID: roomUUID, myUUID: data.me.UUID };
            window.localStorage.setItem('savedGame', JSON.stringify(save));
            sock.off('registered');

            initMap();

            if (myUUID == null) {
                move();
            }
        });
    }

    function move() {
        console.debug('MOVE');
    }
});
