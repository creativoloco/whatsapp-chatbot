const ChatBot = require('./src/ChatBot')

const { Client, LocalAuth } = require( 'whatsapp-web.js/index' )


const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
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
