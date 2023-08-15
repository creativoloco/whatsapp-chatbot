
/*
 * https://stackoverflow.com/a/19700358
 */
module.exports.msToTime = function ( duration ) {
    let  ms = Math.floor( (duration % 1000) / 100),
        sec = Math.floor( (duration / 1000) % 60),
        min = Math.floor( (duration / (1000 * 60)) % 60),
        hrs = Math.floor( (duration / (1000 * 60 * 60)) % 24);

    hrs = (hrs < 10) ? "0" + hrs : hrs;
    min = (min < 10) ? "0" + min : min;
    sec = (sec < 10) ? "0" + sec : sec;

    return `${hrs}:${min}:${sec}.${ms} ms`
}
