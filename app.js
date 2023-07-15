const { Client, LocalAuth } = require( './whatsapp-web.js/index' )


const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    }
})

client.initialize()

// auth events
client.on('loading_screen', (p,m)=> console.log("LOADING SCREEN",p,m) )
client.on('qr',               qr => console.log('QR RECEIVED',qr) )
client.on('authenticated',    () => console.log('AUTHENTICATED') )
client.on('auth_failure',      m => console.log('AUTH FAILURE', m) )



client.on('ready', startChatBot )
