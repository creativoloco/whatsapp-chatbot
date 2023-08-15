require('dotenv').config()

const {fork} = require('child_process')
const path = require('path')

const { msToTime } = require("./src/util/time.js")
const { log } = require("./src/util/logger.js")

// constants
const EXE_FILE = path.join(__dirname, 'src', 'start.js')
const MIN_WORKING_TIME  = 1000
const MAX_TRIES_NUM     = 5

// child process initialization 
let childRef, childDate

// time control
// tries count during ideal working time and total tries count
let triesCountPerWT=0, totalTriesCount=0

// RECURSIVE !!!
createChild()


function createChild( ){
    // time and tries check control 
    const newChildDate = new Date()
    const elapsedTime  = childRef ? newChildDate - childDate : 0
    if( childRef && !triesCheckPassed(elapsedTime) ){
        log.error(`Max tries reached: ${triesCountPerWT}`)
        /* @todo notify by email */
        // finish recursion chain
        return
    }

    childRef  = fork( EXE_FILE )

    // events setup
    childRef.on('spawn', ()=> {
        childDate = newChildDate
        ++triesCountPerWT
        ++totalTriesCount
        log.ok( `child SPAWN count ${totalTriesCount}`)
        log.warn( `Time elapsed previous child ${ msToTime(elapsedTime) }`)
    })

    childRef.on('close', (code, signal) => {
        log.error(`child CLOSE code: ${code} - signal: ${signal}`)
        
        if( code === 1 ){
            // an error ocurred 
            log.error("Restarting application")
            createChild()
        }
    })

    childRef.on('error', error => { log.error(`child ERROR\n${error})`) })

    childRef.on('exit', (code, signal) => {
        log.warn(`child event: EXIT -> (code ${code}, signal ${signal})`)
    })
}

// check if something is working unexpectly
function triesCheckPassed( elapsedTime ){
    const isMaxTriesOK = (triesCountPerWT < MAX_TRIES_NUM ) 
    const isMinTimeOK  = (elapsedTime > MIN_WORKING_TIME)
    // reset tries count per working time
    if(isMinTimeOK) triesCountPerWT = 0
    return  isMinTimeOK && isMaxTriesOK 
}
