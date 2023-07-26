const {fork} = require('child_process')
const path = require('path')
const { msToTime } = require("./src/util.js")

const persistentProcess = path.join(__dirname, 'app.js')
const maxNumTries = 10
const maxElapsedTime = 1000

let countProcess        = 0
let mainChild           = fork( persistentProcess )
let dateLastChilStart   = new Date()

setEvents(mainChild)

function setEvents( child ){
    const dateNewChild = new Date()
    const elapsedTime  = dateNewChild - dateLastChilStart
    const isConcurrent = (elapsedTime<maxElapsedTime && countProcess>maxNumTries )

    if( isConcurrent ) return
    
    dateLastChilStart = dateNewChild
    
    child.send('noError')

    logGreen(`Setting events for child number ${ ++countProcess}`)
    logGreen(`Uptime previous child: ${msToTime(elapsedTime)} ms`)

    child.on('message', message => {
        logGreen(`child event: MESSAGE -> (message ${message})`)
    })

    child.on('spawn', ()=> {
        logGreen(`child event: SPAWN`)
    })

    child.on('close', (code, signal) => {
        logGreen(`child event: CLOSE -> (code ${code}, signal ${signal})`)
        
        if( code === 1 ){
            // an error ocurred 
            logRed("Restarting application")
            mainChild = fork( persistentProcess )
            setEvents( mainChild )
        }
    })

    child.on('error', error => {
        logGreen(`child event: ERROR -> (error ${error})`)
    })

    child.on('exit', (code, signal) => {
        logGreen(`child event: EXIT -> (code ${code}, signal ${signal})`)
    })
}

function logGreen(message){
    let color = "\x1b[32m"
    let reset = "\x1b[0m"
    console.info(color + message + reset)
}

function logRed(message){
    let color = "\x1b[31m"
    let reset = "\x1b[0m"
    console.error(color + message + reset)
}
