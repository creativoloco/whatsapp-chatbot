const ChatBot = require('./src/chatbot')
const {getChromeDefaultPath} = require('./src/getChromeDefaultPath')
const { Client, LocalAuth } = require( 'whatsapp-web.js/index' )

let rejectCalls = true;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,
        executablePath: getChromeDefaultPath()
    }
})

const chatbot = new ChatBot({
    production: false,
    testNumbers: [ "573158770727", "48731356633" ]
})

client.initialize()

// auth events
client.on('loading_screen', (p,m)=> console.log("LOADING SCREEN",p,m) )
client.on('qr',               qr => console.log('QR RECEIVED',qr) )
client.on('authenticated',    () => console.log('AUTHENTICATED') )
client.on('auth_failure',      m => console.log('AUTH FAILURE', m) )


// just need chatBot start
client.on('ready', async ()=>{
    await chatbot.start(client)
    await chatbot.respondUnreadChats()
    await chatbot.respondNewMessages()
})

client.on('call', async (call) => {
    let currentDate = new Date()
    let currentHour = currentDate.getHours()
    let currentMin  = currentDate.getMinutes()
    let isOutTime   = currentHour >= 21 || currentHour <= 6

    // reject group calls, and calls after 21:00 and before 6:00
    if( rejectCalls && call.isGroup || isOutTime){
        await call.reject();

        if( !call.isGroup ){
            let msg = `Hola, en este momento no puedo contestar llamadas `
            `en Polonia son las ${currentHour}:${currentMin}\n`
            `Por favor, sigue las opciones del chatbot, y dejame tu mensaje.`

            console.log(`Call received out of time, rejecting`);
            await client.sendMessage(call.from,msg);
        }
    }
});

