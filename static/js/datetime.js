/**
* @Author: Paul Joannon <paulloz>
* @Date:   2016-04-16T09:46:07+02:00
* @Email:  hello@pauljoannon.com
* @Last modified by:   paulloz
* @Last modified time: 2016-04-16T09:59:10+02:00
*/

window.addEventListener('load', function() {
    function update() {
        var now = Date.now();
        [].slice.call(document.querySelectorAll('.time[x-attr-since]')).forEach(function(element) {
            var timeDiff = now - parseInt(element.getAttribute('x-attr-since'));
            element.innerText = `${timeDiff}ms`;
        });

        setTimeout(update, 6000);
    }

    update();
});
