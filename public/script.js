// connect to ui and backend
var socket = io();
var mainSocket = new WebSocket('ws://' + (window.location.hostname ? window.location.hostname : "localhost") + ':9002');

var selected = null, // Object of the element to be moved
    lineIn = null,
    lineOut = null,
    x_pos = 0,
    y_pos = 0, // Stores x & y coordinates of the mouse pointer
    x_elem = 0,
    y_elem = 0; // Stores top, left values (edge) of the element
var s_width = 0;
var s_height = 0;
var gap = 50;
var x_min = gap;
var x_max = 0;
var y_min = gap;
var y_max = 0;
var lastReceivedOutputMsg;

var nowPlayingUpdatePeriod = 5000; // ms to update nowplaying
setInterval(function () {
    socket.emit('nowplaying');
}, nowPlayingUpdatePeriod);

function refresh() {
    // load page
    var url = new URL(document.location);
    // get URL parameter for page
    var page = url.searchParams.get('page');
    // if page query is empty
    if (page == null) {
        // change page parameter to URL path
        var paths = url.pathname.split('/');
        page = paths[1];
    }
    switch (page) {
        case 'editor':
            socket.emit('loadeditor', url.searchParams.get('disk'));
            break;
        case 'channel':
            var params = {};
            params.name = url.searchParams.get('channel');
            params.sort = url.searchParams.get('sort');
            if (params.sort == null) {
                // default
                params.sort = 'new';
            }
            socket.emit('loadchannel', params);
            break;
        case 'settings':
            // request configuration form from server
            socket.emit('loadoutput');
            break;
        default:
            // check if index page is loaded
            if (document.getElementById("diskFeedContainer") && document.getElementById("diskFeedContainer").childNodes.length === 0) {
                var params = {};
                params.sort = url.searchParams.get('sort');
                if (params.sort == null) {
                    // default
                    params.sort = 'new';
                }
                socket.emit('load', params);
            } else {
                // show feed div and hide other containers
                changeStyleToView('feed');
            }
            break;
    }
}

function setConfig(msg = lastReceivedOutputMsg) {
    // add svg to HTML
    var outputGraphicElement = document.getElementById("outputGraphic");
    if (outputGraphicElement) {
        outputGraphicElement.innerHTML = msg;
        // 2D euclidean distance helper
        function distanceBetweenPoints(p1, p2) {
            return Math.sqrt((p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]));
        }
        // try to get shortest distance between points (for SVG styling)
        var min_distance = 9999;
        var circles = document.getElementsByClassName('circle');
        for (var i = 1; i < circles.length; i++) {
            var p1 = [circles[i].getAttribute('x1'), circles[i].getAttribute('y1')];
            var p2 = [circles[0].getAttribute('x1'), circles[0].getAttribute('y1')];
            var dist = distanceBetweenPoints(p1, p2);
            if (dist < min_distance) min_distance = dist;
        }
        // use calculated min_distance between points as SVG circle width
        var circleWidth = Math.min(0.8 * min_distance, 25);
        // style SVG
        var svgStyle = document.createElement('style');
        svgStyle.innerHTML = `
        .circle{stroke:white;stroke-width:` + circleWidth.toString() + `px;stroke-linecap:round;}
        .circle:hover{stroke-width:` + (circleWidth + 5).toString() + `px;}
        .line{stroke:white;stroke-width:` + (0.25 * circleWidth).toString() + `px;}
    `;
        document.body.appendChild(svgStyle);
        // get SVG width+height
        s_width = document.querySelector("svg").width.baseVal.value;
        s_height = document.querySelector("svg").height.baseVal.value;
        // set boundary values for SVG interaction
        gap = 0.5 * min_distance;
        x_min = gap;
        y_min = gap;
        x_max = s_width - gap;
        y_max = s_height - gap;
    }
}

function changeStyleToView(view) {
    // show/hide containers, argument should be 'feed', 'channel' or 'editor'
    // document.getElementById("indexContainer").style.display = (view == "editor" ? "none" : "block");
    // document.getElementById("diskChannelContainer").style.display = (view == "channel" ? "grid" : "none");
    // document.getElementById("diskFeedContainer").style.display = (view == "feed" ? "grid" : "none");
    // document.getElementById("diskContainer").style.display = (view == "editor" ? "block" : "none");
}

// event handlers
document.addEventListener('DOMContentLoaded', function () {
    // load page
    refresh();
}, false);

document.addEventListener('change', function (event) {
    // handle input change events
    if (event.target.matches('.blurAmount')) {
        // get blur value
        var data = {
            "blur": parseInt(event.target.value)
        };
        // // get disk
        // if (true) {
        //     data.directory = event.target.parentElement.dataset.directory;
        // }
        // send msg to server
        socket.emit('setblur', data);
    } else if (event.target.matches('.desaturationInput')) {
        // get desaturation value
        var data = {
            "desaturation": parseFloat(event.target.value)
        }
        // send msg to server
        socket.emit('setdesaturation', data);
    } else if (event.target.matches('.gammaInput')) {
        // get gamma value
        var data = {
            "gamma": parseFloat(event.target.value)
        }
        // send msg to server
        socket.emit('setgamma', data);
    } else if (event.target.matches('#brightnessInput')) {
        // get brightness value
        var data = {
            "brightness": parseFloat(event.target.value)
        }
        // send msg to server
        socket.emit('setbrightness', data);
    } else if (event.target.matches('#autoplayMinRange') || event.target.matches('#autoplayMaxRange')) {
        // get autoplay time range values
        var data = {
            [event.target.getAttribute('id')]: parseInt(event.target.value)
        };
        console.log(`Sending autoplay range update: ${JSON.stringify(data)}`);
        // send msg to server
        socket.emit('setautoplaytimerange', data);
    } else if (event.target.matches('#crossfadeRange')) {
        // get crossfade duration value
        var data = {
            "fade": parseInt(event.target.value)
        }
        // send message to server
        socket.emit('setcrossfadetime', data);
        console.log(`sending crossfade time to server ${parseInt(event.target.value)}`);
    } else if (event.target.matches('select[name="sort"]')) {
        //
        console.log(`Changed to sort by ${event.target.value}`);
        // load page
        var url = new URL(document.location);
        var params = new URLSearchParams(url.search);
        // get URL parameter for page
        params.set('sort', event.target.value);
        //
        window.history.pushState(Object.assign({
            'sort': event.target.value
        }, window.history.state), '', `?${params.toString()}`);
        // clear loaded content before reloading
        document.getElementById("diskFeedContainer").innerHTML = '';
        document.getElementById("diskChannelContainer").innerHTML = '';
        refresh();
    }
});

document.addEventListener('click', function (event) {
    // handle mouseclick events
    var channelName, diskDirectory, data;
    // mouseclick events
    if (event.target.matches('.viewChannelButton')) {
        //
        channelName = event.target.parentElement.parentElement.dataset.channel;
        window.history.pushState({
            page: 'channel'
        }, channelName, "?page=channel&channel=" + channelName);
        refresh();
    // } else if (event.target.matches('.playDiskButton')) {
    //     //
    //     diskDirectory = event.target.parentElement.parentElement.dataset.directory;
    //     socket.emit('play', {
    //         directory: diskDirectory
    //     });
    // } else if (event.target.matches('.editDiskButton')) {
    //     //
    //     diskDirectory = event.target.parentElement.parentElement.dataset.directory;
    //     window.history.pushState({
    //         page: 'editor',
    //         disk: diskDirectory
    //     }, diskDirectory, "?page=editor&disk=" + diskDirectory);
    //     refresh();
    } else if (event.target.matches('.newDiskButton')) {
        //
        channelName = event.target.parentElement.parentElement.dataset.channel;
        socket.emit('createmedia', channelName);
    } else if (event.target.matches('.duplicateMediaButton')) {
        // create new media as a copy of existing
        diskDirectory = event.target.parentElement.dataset.diskDirectory;
        socket.emit('duplicatemedia', diskDirectory);
    } else if (event.target.matches('#newChannelButton')) {
        // get new channel name
        var name = document.getElementById("editorChannelsInput").value;
        // todo: add disk open in editor to new channel...
        // also todo: add new channel list element
        //var directory = this.parentElement.children[1].innerHTML;
        socket.emit('createchannel', name);
    } else if (event.target.matches('.editorConnectedChannelItem')) {
        // disconnect
        diskDirectory = event.target.parentElement.parentElement.parentElement.dataset.diskDirectory;
        channelName = event.target.innerHTML;
        socket.emit('deleteconnection', [diskDirectory, channelName]);
    } else if (event.target.matches('.editorDisconnectedChannelItem')) {
        // connect
        diskDirectory = event.target.parentElement.parentElement.parentElement.dataset.diskDirectory;
        channelName = event.target.innerHTML;
        socket.emit('createconnection', [diskDirectory, channelName]);
    } else if (event.target.matches('#editorCreateFileButton')) {
        // new file
        diskDirectory = event.target.parentElement.dataset.diskDirectory;
        socket.emit('createfile', diskDirectory);
    } else if (event.target.matches('.editorUpdateFileButton')) {
        // get data
        var filename, fileindex, text;
        diskDirectory = event.target.parentElement.parentElement.dataset.diskDirectory;
        filename = event.target.parentElement.firstElementChild.innerHTML;
        fileindex = event.target.parentElement.dataset.rowId;
        text = event.target.parentElement.getElementsByTagName("textarea")[0].value;
        // format
        data = {
            directory: diskDirectory,
            filename: filename,
            fileID: fileindex,
            text: text
        };
        // send to server
        socket.emit('updatefile', data);
    } else if (event.target.matches('.editorRemoveFileButton')) {
        // get data
        var filename, fileindex;
        diskDirectory = event.target.parentElement.parentElement.dataset.diskDirectory;
        filename = event.target.parentElement.firstElementChild.innerHTML;
        fileindex = event.target.parentElement.dataset.rowId;
        // format
        data = {
            directory: diskDirectory,
            filename: filename,
            fileID: fileindex
        };
        // send to server
        socket.emit('removefile', data);
    } else if (event.target.matches('#editorSaveButton')) {
        // commit/save version event
        diskDirectory = event.target.parentElement.dataset.diskDirectory;
        socket.emit('saveversion', diskDirectory);
    } else if (event.target.matches('#editorCloseButton')) {
        // return to channel if window.history.back() is possible, else to index
        if (window.history.length > 2)
            window.history.back();
        else {
            window.history.pushState({
                page: 'index'
            }, "Home", "/");
            refresh();
        }
    } else if (event.target.matches('.editorVersionButton')) {
        // edit version event
        var version = event.target.dataset.id;
        diskDirectory = event.target.parentElement.parentElement.parentElement.dataset.diskDirectory;
        socket.emit('play', {
            directory: diskDirectory,
            version: +version
        });
    } else if (event.target.matches('#saveOutputButton')) {
        // save output button
        socket.emit('saveconfig');
    } else if (event.target.matches('#updateOutputButton')) {
        // update config (data structure resembles host's config.json)
        data = {
            "window": {},
            "outputs": []
        };
        // get window properties
        document.querySelectorAll("#outputForm .window input").forEach(function (windowProperty) {
            data.window[windowProperty.className] = parseInt(windowProperty.value);
        });
        // get output properties (except LEDs)
        document.querySelectorAll("#outputForm .outputs > div").forEach(function (outputDiv) {
            var output = {
                "index": parseInt(outputDiv.dataset.outputId),
                "properties": {}
            };
            outputDiv.querySelectorAll(".properties textarea").forEach(function (propertyInput) {
                output.properties[propertyInput.className] = propertyInput.value;
            });
            outputDiv.querySelectorAll(".properties input").forEach(function (propertyInput) {
                output.properties[propertyInput.className] = parseInt(propertyInput.value);
            });
            data.outputs.push(output);
        });
        // send to server
        socket.emit('updateconfig', data);
    } else if (event.target.matches('#resetOutputButton')) {
        // reset output
        setConfig();
    } else if (event.target.matches('#restartBackendButton')) {
        // restart backend process
        socket.emit('restartservice', 'disk-backend-daemon.service');
    } else if (event.target.matches('#restartRendererButton')) {
        // restart renderer process
        socket.emit('restartservice', 'disk-renderer-daemon.service');
    } else if (event.target.matches('#getLogsButton')) {
        // get process logs
        socket.emit('getlogs');
    } else if (event.target.matches('#shutdownButton')) {
        socket.emit('systempower', 'shutdown');
    } else if (event.target.matches('#rebootButton')) {
        socket.emit('systempower', 'reboot');
    } else if (event.target.matches('#takeScreenshotButton')) {
        // test to save screenshot on click
        if (mainSocket.readyState != 1) {
            mainSocket = new WebSocket('ws://' + (window.location.hostname ? window.location.hostname : "localhost") + ':9002');
            console.log("main socket not connected");
        }
        mainSocket.send(JSON.stringify({
            "command": "screenshot"
        }));
    } else if (event.target.matches('.autoplayButton')) {
        // check shuffle type
        if (event.target.parentElement.parentElement && event.target.parentElement.parentElement.dataset.channel) {
            // get channel name
            var channelName = event.target.parentElement.parentElement.dataset.channel;
            // send autoplay msg with channel name
            socket.emit('autoplay', channelName);
        } else {
            // send msg to autoplay
            socket.emit('autoplay');
        }
    } else if (event.target.matches('.Navbar__Link-toggle')) {
        // navbar dropdown
        const navs = document.querySelectorAll('.Navbar__Items');
        navs.forEach(nav => nav.classList.toggle('Navbar__ToggleShow'));
    } else if (event.target.matches('#reloadCurrentPageButton')) {
        // send msg to reload page
        socket.emit('reloadpage');
        // refresh iframe // TODO: make work with svelte
        //document.getElementById('previewFrame').src = document.getElementById('previewFrame').src;
    }
}, false);
document.addEventListener('mousedown', function (event) {
    // click circle event, will be called when user starts dragging LED
    if (event.target.matches('.circle')) {
        // Store the object of the element which needs to be moved
        selected = event.target;
        var circleId = selected.dataset.circleId;
        // get connected lines
        lineOut = selected.parentElement.querySelector('[data-from-circle-id="' + circleId + '"]');
        lineIn = selected.parentElement.querySelector('[data-from-circle-id="' + (circleId - 1) + '"]');
        // store element's top left coord
        x_elem = x_pos - selected.x1.baseVal.value;
        y_elem = y_pos - selected.y1.baseVal.value;
        return false;
    }
}, false);
document.addEventListener('mouseup', function () {
    if (selected !== null) {
        // keep led in boundaries
        x_pos = Math.min(Math.max(x_pos - x_elem, x_min), x_max);
        y_pos = Math.min(Math.max(y_pos - y_elem, y_min), y_max);
        selected.x1.baseVal.value = x_pos;
        selected.y1.baseVal.value = y_pos;
        selected.x2.baseVal.value = x_pos;
        selected.y2.baseVal.value = y_pos;
        if (lineIn) {
            lineIn.x2.baseVal.value = x_pos;
            lineIn.y2.baseVal.value = y_pos;
        }
        if (lineOut) {
            lineOut.x1.baseVal.value = x_pos;
            lineOut.y1.baseVal.value = y_pos;
        }
        // LED formatted as a subset of the host's config.json
        var data = {
            "outputs": [{
                "index": parseInt(selected.parentElement.dataset.outputId),
                "leds": [{
                    "index": parseInt(selected.dataset.circleId),
                    "x": selected.x1.baseVal.value,
                    "y": selected.y1.baseVal.value,
                    "r": parseInt(selected.dataset.radiusId)
                }]
            }]
        };
        // send updated led(s) to server
        //socket.emit('updateconfig', data); // sends full structure of LEDs?
        if (mainSocket.readyState != 1) {
            mainSocket = new WebSocket('ws://' + (window.location.hostname ? window.location.hostname : "localhost") + ':9002');
        }
        mainSocket.send(JSON.stringify(data)); // send direct to host backend?
    }
    // destroy/reset SVG object used for interaction
    selected = null;
}, false);
document.addEventListener('dragover', function (event) {
    // file drag and drop event
    if (document.getElementById('outputForm').contains(event.target)) {
        // turn off browser's default drag behaviour
        event.stopPropagation();
        event.preventDefault();
    }
}, false);
document.addEventListener('mousemove', function (event) {
    // called when user is dragging an element
    x_pos = document.all ? window.event.clientX : event.pageX;
    y_pos = document.all ? window.event.clientY : event.pageY;
    if (selected !== null) {
        selected.x1.baseVal.value = x_pos - x_elem;
        selected.y1.baseVal.value = y_pos - y_elem;
        selected.x2.baseVal.value = x_pos - x_elem;
        selected.y2.baseVal.value = y_pos - y_elem;
        if (lineIn) {
            lineIn.x2.baseVal.value = x_pos - x_elem;
            lineIn.y2.baseVal.value = y_pos - y_elem;
        }
        if (lineOut) {
            lineOut.x1.baseVal.value = x_pos - x_elem;
            lineOut.y1.baseVal.value = y_pos - y_elem;
        }
    }
}, false);
document.addEventListener('drop', function (event) {
    // file drag and drop event
    if (document.getElementById('outputForm').contains(event.target)) {
        event.stopPropagation();
        event.preventDefault(); // prevent default behaviour (file being opened)
        var files = event.dataTransfer.files;
        // continue if single JSON file was dropped
        if (files.length == 1) {
            if (files[0].type == "application/json") {
                // parse JSON file
                var reader = new FileReader();
                reader.onload = (function () {
                    return function (e) {
                        var jsonconf;
                        try {
                            jsonconf = JSON.parse(e.target.result);
                        } catch (ex) {
                            alert('exception caught when parsing json: ' + ex);
                        }
                        // send uploaded config to server
                        socket.emit('uploadconfig', jsonconf);
                    };
                })(files[0]);
                reader.readAsText(files[0]);
            }
        }
    }
}, false);
document.addEventListener('keyup', function (event) {
    // handle keyboard button up events
    if (event.target.matches('#urlInput')) {
        if (event.keyCode == 13) { // 'Enter'
            socket.emit('playURL', event.target.value);
            console.log("sent " + event.target.value);
        }
    } else if (event.target.matches('.filenameInput')) {
        if (event.keyCode == 13) { // 'Enter'
            // get data
            var oldName, newName, fileindex, diskDirectory;
            diskDirectory = event.target.parentElement.parentElement.dataset.diskDirectory;
            newName = event.target.value;
            oldName = event.target.parentElement.firstElementChild.innerHTML;
            fileindex = event.target.parentElement.dataset.rowId;
            // format
            var data = {
                directory: diskDirectory,
                oldName: oldName,
                newName: newName,
                fileID: fileindex
            };
            // send to server
            socket.emit('renamefile', data);
        }
    } else if (event.target.matches('.editorTitleInput')) {
        if (event.keyCode == 13) { // 'Enter'
            // get data
            var diskDirectory = event.target.parentElement.dataset.diskDirectory;
            var newName = event.target.value;
            // format
            var data = {
                directory: diskDirectory,
                newName: newName
            };
            // send to server
            socket.emit('renamemedia', data);
        }
    } else if (event.target.matches('#editorChannelsInput')) {
        // filter channels when text is entered into channel search box
        // declare variables
        var input = event.target.value.toUpperCase();
        var ul, li, a, i, txtValue;
        ul = document.getElementById('editorChannelList');
        li = ul.getElementsByTagName("li");
        // loop through list items
        for (i = 0; i < li.length; i++) {
            a = li[i].getElementsByTagName("a")[0];
            txtValue = a.textContent || a.innerText;
            if (txtValue.toUpperCase().indexOf(input) > -1) {
                li[i].style.display = "";
            } else {
                li[i].style.display = "none";
            }
        }
    }
}, false);
window.onpopstate = function () {
    // location change
    refresh();
};

// websocket handlers
socket.on('load', function (msg) {
    // insert HTML body received from server into page
    document.getElementById("diskFeedContainer").innerHTML += msg;
    // show feed div and hide other containers
    changeStyleToView('feed');
});
socket.on('loadchannel', function (msg) {
    // insert HTML body received from server into page
    document.getElementById("diskChannelContainer").innerHTML = msg;
    // show channel div and hide other containers
    changeStyleToView('channel');
});
socket.on('changedmedia', function (msg) {
    // load editor on media received from server, adding to URL history if new
    if (JSON.stringify(window.history.state) !== msg) {
        var parsedMsg = JSON.parse(msg);
        window.history.pushState({
            page: 'editor',
            disk: parsedMsg.disk
        }, parsedMsg.disk, "?page=editor&disk=" + parsedMsg.disk);
    }
    refresh();
});
socket.on('loadoutput', function (msg) {
    lastReceivedOutputMsg = msg;
    setConfig();
});
socket.on('loadeditor', function (msg) {
    // add received HTML to DOM
    document.getElementById("diskContainer").innerHTML = msg;
    // show editor div and hide other containers
    changeStyleToView('editor');
});
socket.on('getlogs', function (msg) {
    console.log(msg);
});
/*
var nowPlayingTimerID;
var playbackState = {};
socket.on('nowplaying', function (playback) {
    // parse status object
    playback = JSON.parse(playback);
    playbackState = playback;
    console.log(`received playback status from server`);
    // check if playing anything
    if (playback.playing && (playback.playing.URL || playback.playing.directory)) {
        // check if playing local media
        if (playback.playing.directory && playback.playing.directory.length > 0) {
            // check if already loaded
            if (document.getElementById('previewFrame').src.includes(playback.playing.directory) == false) {
                // load iframe
                document.getElementById('previewFrame').src = `/media/${playback.playing.directory}/index.html`;
                // path to metadata
                var metadataURL = `/media/${playback.playing.directory}/demo.json`;
                // fetch metadata
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.onreadystatechange = function () {
                    if (this.readyState == 4 && this.status == 200) {
                        // parse metadata
                        var metadata = JSON.parse(this.responseText);
                        // add media title to DOM
                        document.getElementById("nowPlaying").innerHTML = `<a href="/?page=editor&disk=${playback.playing.directory}">${metadata.demo.title}</a>`;
                        // add media channels to DOM
                        var numChannels = metadata.demo.channels.length;
                        var channelsDOM = `In ${numChannels} ${numChannels > 1 ? 'channels' : 'channel'}: `;
                        metadata.demo.channels.forEach((channel, idx) => channelsDOM += `<a href="/?page=channel&channel=${channel}">${channel}</a>${numChannels > 1 && idx < numChannels - 1 ? ', ' : '.'}`);
                        document.getElementById("nowPlayingChannels").innerHTML = channelsDOM;
                    }
                };
                xmlhttp.open("GET", metadataURL, true);
                xmlhttp.send();
            }
            // update ui
            // todo: add case for playback.playingAutoNext as this only works when fading
            if (playback.playingFadeIn) {
                var elem1 = document.getElementById("playback-status");
                // calc time when media is finished fading in
                var fadeEnd = playback.playingFadeIn.startTime + playback.playingFadeIn.fadeDuration;
                // run ui update loop
                nowPlayingTimerID = setInterval(updatePlaybackStatus, 100, fadeEnd);

                function updatePlaybackStatus(fadeEnd1) {
                    var currentTime = Date.now();
                    if (currentTime > fadeEnd1) {
                        clearInterval(nowPlayingTimerID);
                        //elem1.innerHTML = ``;
                    } else {
                        // calc current crossfade
                        var timePassed = Math.round((currentTime - playback.playingFadeIn.startTime) / 1000);
                        var timeLimit = Math.round(playback.playingFadeIn.fadeDuration / 1000);
                        // add playback string with crossfade state to page
                        //elem1.innerHTML = `crossfade ${timePassed}/${timeLimit}s (${playback.playing.metadata.title} to ${playback.playingFadeIn.metadata.title})`;
                    }
                }
            }
        } else if (playback.playing.URL && playback.playing.URL.length > 0) {
            // check if remote media is already loaded
            if (document.getElementById('previewFrame').src.includes(playback.playing.URL) == false) {
                // load iframe for remote media
                document.getElementById('previewFrame').src = playback.playing.URL;
                // add URL to DOM
                document.getElementById("nowPlaying").innerHTML = playback.playing.URL;
                // clear channels
                document.getElementById("nowPlayingChannels").innerHTML = "";
            }
        }
    } else {
        // not playing anything
        // load default media
        var defaultPreview = `/media/.default/index.html`;
        if (document.getElementById('previewFrame').src.includes(defaultPreview) == false) {
            // load default iframe
            document.getElementById('previewFrame').src = defaultPreview;
            // insert text
            document.getElementById("nowPlaying").innerHTML = `Nothing...`;
        }
    }
});
*/
/*
var playbackUpdatePeriod = 500; // ms
setTimeout(function updatePlaybackStateTest() {
    //
    var playbackStateElement = document.getElementById('playback-status2');
    if (playbackState.playing) {
        var playingString, nextString;
        var currentTime = Date.now();
        if (playbackState.playingFadeIn) {
            var timePassed = Math.round((currentTime - playbackState.playingFadeIn.startTime) / 1000);
            var timeLimit = Math.round(playbackState.playingFadeIn.fadeDuration / 1000);
            if (timePassed >= timeLimit) {
                playbackState.playing = playbackState.playingFadeIn;
                playbackState.playingFadeIn = false;
            }
        }
        if (playbackState.playingAutoNext) {
            var timeLeft = Math.round((playbackState.playingAutoNext.startTime - currentTime) / 1000);
            if (timeLeft <= 0) {
                playbackState.playingFadeIn = playbackState.playingAutoNext;
                playbackState.playingAutoNext = false;
            }
        }
        // set string for now-playing status
        if (playbackState.playingFadeIn) {
            var timePassed = Math.round((currentTime - playbackState.playingFadeIn.startTime) / 1000);
            var timeLimit = Math.round(playbackState.playingFadeIn.fadeDuration / 1000);
            playingString = `fading<br>${playbackState.playing.metadata.title} to ${playbackState.playingFadeIn.metadata.title} (${timePassed}/${timeLimit}s)`;
        } else {
            playingString = `playing<br>${playbackState.playing.metadata.title}`;
        }
        // set string for playing-next status
        if (playbackState.playingAutoNext) {
            var timeLeft = Math.round((playbackState.playingAutoNext.startTime - currentTime) / 1000);
            nextString = `<br>up next<br>${playbackState.playingAutoNext.metadata.title} (${timeLeft}s)`;
        } else {
            nextString = `<br>nothing in queue`;
        }
        //
        playbackStateElement.innerHTML = `${playingString}${nextString}`;
    } else {
        playbackStateElement.innerHTML = `not playing anything`;
    }
    // repeat
    setTimeout(updatePlaybackStateTest, playbackUpdatePeriod);
}, playbackUpdatePeriod);
*/
// socket.on('nowplaying', function (currentURL) {
//     // check if playing anything
//     if (currentURL && currentURL.length > 0) {
//         // check if playing local media
//         if (currentURL.startsWith('file:///')) {
//             // get directory name
//             var splitURL = currentURL.split('/');
//             var directory = splitURL[splitURL.length - (splitURL[splitURL.length - 1].includes('.') ? 2 : 1)];
//             currentURL = directory;
//             // check if already loaded
//             if (document.getElementById('previewFrame').src.includes(currentURL) == false) {
//                 // load iframe
//                 document.getElementById('previewFrame').src = `/media/${currentURL}/index.html`;
//                 // path to metadata
//                 var metadataURL = `/media/${currentURL}/demo.json`;
//                 // fetch metadata
//                 var xmlhttp = new XMLHttpRequest();
//                 xmlhttp.onreadystatechange = function () {
//                     if (this.readyState == 4 && this.status == 200) {
//                         // parse metadata
//                         var metadata = JSON.parse(this.responseText);
//                         // add media title to DOM
//                         document.getElementById("nowPlaying").innerHTML = `<a href="/?page=editor&disk=${currentURL}">${metadata.demo.title}</a>`;
//                         // add media channels to DOM
//                         var numChannels = metadata.demo.channels.length;
//                         var channelsDOM = `In ${numChannels} ${numChannels > 1 ? 'channels' : 'channel'}: `;
//                         metadata.demo.channels.forEach((channel, idx) => channelsDOM += `<a href="/?page=channel&channel=${channel}">${channel}</a>${numChannels > 1 && idx < numChannels - 1 ? ', ' : '.'}`);
//                         document.getElementById("nowPlayingChannels").innerHTML = channelsDOM;
//                     }
//                 };
//                 xmlhttp.open("GET", metadataURL, true);
//                 xmlhttp.send();
//             }
//         } else {
//             // check if remote media is already loaded
//             if (document.getElementById('previewFrame').src.includes(currentURL) == false) {
//                 // load iframe for remote media
//                 document.getElementById('previewFrame').src = currentURL;
//                 // add URL to DOM
//                 document.getElementById("nowPlaying").innerHTML = currentURL;
//                 // clear channels
//                 document.getElementById("nowPlayingChannels").innerHTML = "";
//             }
//         }
//     } else {
//         // not playing anything
//         // load default media
//         var defaultPreview = `/media/.default/index.html`;
//         if (document.getElementById('previewFrame').src.includes(defaultPreview) == false) {
//             // load default iframe
//             document.getElementById('previewFrame').src = defaultPreview;
//             // insert text
//             document.getElementById("nowPlaying").innerHTML = `Nothing...`;
//         }
//     }
// });