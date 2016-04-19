/**
* @Author: Paul Joannon <paulloz>
* @Date:   2016-04-16T09:46:07+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   Paul Joannon
* @Last modified time: 2016-04-19T20:10:22+02:00
*/

window.addEventListener('load', function() {
    var now = parseInt(document.querySelector('.content').getAttribute('x-attr-page-loaded'));

    function update() {
        [].slice.call(document.querySelectorAll('.time[x-attr-since]')).forEach(function(element) {
            var timeDiff = (now - parseInt(element.getAttribute('x-attr-since'))) / 1000;
            if (timeDiff / 60 > 1) {
                element.innerText = `${parseInt(timeDiff / 60)} min ${parseInt(timeDiff % 60)} sec`;
            } else {
                element.innerText = `${parseInt(timeDiff)} sec`;
            }
        });

        now += 1000;
        setTimeout(update, 1000);
    }

    update();
});
