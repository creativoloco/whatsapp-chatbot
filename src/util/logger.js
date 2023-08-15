
const ESC = "\x1b["

const colors = {
    reset:  ESC +  "0m",
    red:    ESC + "31m",
    green:  ESC + "32m",
    yellow: ESC + "33m"
}

const log = {
    info:  msg => console.info(  msg ),
    warn:  msg => console.log(   colors.yellow + msg + colors.reset),
    error: msg => console.error( colors.red    + msg + colors.reset),
    ok:    msg => console.log(   colors.green  + msg + colors.reset)
}

module.exports.log = log

