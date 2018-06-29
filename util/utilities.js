var News = require("../models/News");
var MAGIC_NUMBERS = {
    jpg: 'ffd8ffe0',
    jpg1: 'ffd8ffe1',
    png: '89504e47',
    gif: '47494638'
}
function checkMagicNumbers(magic) {
    if (magic == MAGIC_NUMBERS.jpg || magic == MAGIC_NUMBERS.jpg1 || magic == MAGIC_NUMBERS.png || magic == MAGIC_NUMBERS.gif)
        return true
    return false
}
function getDistance(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c * 1000; // Distance in m
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

function onLocationChanged(socket, location) {
    var broadcast = location.toObject();
    // console.log(location)
    console.log("broadcase", broadcast)
    delete broadcast.saves
    socket.emit("location", JSON.stringify(broadcast));
}

function onNewChange(socket, _new) {
    console.log("news" + _new);
    socket.emit("new", _new);
}

function get2HoursAgo(locations) {
    var result = [];
    var start = new Date();
    //get 2 hours ago
    start.setHours(start.getHours() - 2, 0, 0, 0);
    var end = new Date();
    for (var i in locations) {
        var dt = new Date(locations[i].last_modify);
        if (dt > start && dt < end) {
            result.push(locations[i]);
        }
    }
    return result;
}

function getLevelLocation(news, req_level) {
    var total = 0;
    var count = 0;
    var start = new Date();
    start.setHours(start.getHours() - 2, 0, 0, 0);
    console.log("date", start);
    var end = new Date();
    console.log("end", end);
    for (var i in news) {
        var dt = new Date(news[i].created_at);
        console.log("dt", dt);
        if (dt > start && dt < end) {
            count++;
            total += news[i].level;
            console.log("found", news[i].level);
        }
    }
    if (total != 0)
        total = (total + req_level) / (count + 1);
    else total = req_level;
    return total;
}

module.exports = {
    onLocationChanged: onLocationChanged,
    onNewChange: onNewChange,
    get2HoursAgo: get2HoursAgo,
    getLevelLocation: getLevelLocation,
    checkMagicNumbers: checkMagicNumbers,
    getDistance: getDistance,
    deg2rad: deg2rad,
}