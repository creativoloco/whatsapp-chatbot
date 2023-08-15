const {ChatBot} = require('./chatbot.js')
const {getChromeDefaultPath} = require('./util/compatbility.js')
const { Client, LocalAuth } = require( 'whatsapp-web.js/index' )

const rejectCalls = true;

// WA client config
const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,
        executablePath: getChromeDefaultPath()
    }
})

// chatbot config
const chatbot = new ChatBot({
    production: false,
    testNumbers: [ "573158770727", "48731356633" ]
})

whatsappClient.initialize()

// auth events
whatsappClient.on('loading_screen', (p,m)=> console.log("LOADING SCREEN",p,m) )
whatsappClient.on('qr',               qr => console.log('QR RECEIVED',qr) )
whatsappClient.on('authenticated',    () => console.log('AUTHENTICATED') )
whatsappClient.on('auth_failure',      m => console.log('AUTH FAILURE', m) )


// just need chatBot start
whatsappClient.on('ready', async ()=>{
    await chatbot.start(whatsappClient)
    await chatbot.respondUnreadChats()
    await chatbot.respondNewMessages()
})

whatsappClient.on('call', async (call) => {
    const currentDate = new Date()
    const currentHour = currentDate.getHours()
    const currentMin  = currentDate.getMinutes()
    const isOutTime   = currentHour >= 21 || currentHour <= 6

    // reject group calls, and calls after 21:00 and before 6:00
    if( rejectCalls && call.isGroup || isOutTime){
        await call.reject();

        if( !call.isGroup ){
            const msg = `Hola, en este momento no puedo contestar llamadas ` + 
            `en Polonia son las ${currentHour}:${currentMin}\n` +
            `Por favor, sigue las opciones del chatbot, y dejame tu mensaje.`

            console.log(`Call received out of time, rejecting`);
            await whatsappClient.sendMessage(call.from,msg);
        }
    }
});

