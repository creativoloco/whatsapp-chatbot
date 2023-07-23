const fs = require('fs')
const path = require('path')
const { MessageMedia } = require('whatsapp-web.js')


class ChatBot {
    constructor( options={} ){
        this.client
        this.production       = options.production || false
        this.labelPrefix      = options.labelPrefix || 'CHATBOT-'
        this.testPhoneNumbers = options.testNumbers || [];
        this.messagesFile     = options.messagesFile || "messages.json"
        this.chatBotLabels
    }

    async labels(){
        if(!this.client) throw new Error("labels() require a client")
        let clientLabels = await this.client.getLabels()
        let prefix = this.labelPrefix
        console.log('Labels readed')
        return labelName => clientLabels.find( lb =>{
            return lb.name === (prefix+labelName)
        })
    }

    /**
     * Read and watch messages file, also return a function to get message
     * this is a closure function that wraps message file handling
     * @returns {Function} - get messages function
     */
    async messages(){
        const messagePath= path.join( __dirname, this.messagesFile)
        let messages = []

        /*
         * Read messages json file and and parse to assign to gobal variable
         * @param {string} messagesPath messages file path
         * @return void
         */
        function readMessagesFile(){
            return new Promise((res,rej)=>{
                fs.readFile( messagePath, {encoding:'utf8'}, (error,msgs)=>{
                    if(error){
                        console.error(error)
                        rej(error)
                    }
                    try{
                        const messagesJSON = JSON.parse(msgs)
                        messages = messagesJSON
                        res(messages)
                    }catch( errorJson ){
                        // log error and continue execution without stopping
                        console.error( errorJson )
                        rej(error)
                    }
                })
            })
        }


        /*
         * Watch messages json file for changes, and parse it after
         * @param {string} messagesPath messages file path
         */
        async function watchMessagesFile(){
            fs.watch( messagePath, ( eventType, filename )=>{
                if(eventType === 'change'){
                    console.log("FILE CHANGED" + filename)
                    readMessagesFile()
                }
            })
        }

        // read and watch file 
        let res = await readMessagesFile()
        watchMessagesFile()
        console.log("messages: " + typeof res)
        return (key => messages[key])
    }

    /**
     * Stores each requested img
     * @returns {MessageMedia}
     */
    fileCache(){
        const messageMediaCache = []
        return filename => {
            // search for file
            for( let i = 0; i < messageMediaCache.length; i++){
               if( filename === messageMediaCache[i].fileName ){
                   return messageMediaCache[i].messageMedia
               }
            }

            // create a new message media
            const filePath = path.join(__dirname, 'img', filename)
            const messageMediaItem = {
                fileName: filename,
                messageMedia: MessageMedia.fromFilePath(filePath)
            }
            messageMediaCache.push(messageMediaItem)
            return messageMediaItem.messageMedia
        }
    }

    async start( clientInstance ){
        this.client = clientInstance
        
        // function to get Images from cache
        this.getFile = this.fileCache()

        // function to get messages
        this.getMsgs = await this.messages()

        do {
            // function to get labels (initialized when start method is called)
            this.getLabel = await this.labels()
        } while (!(this.getLabel("assistance") &&
            this.getLabel("intro") &&
            this.getLabel("welder") &&
            this.getLabel("generalWorkerFAM") &&
            this.getLabel("generalWorkerStrumet") &&
            this.getLabel("euroConfortWorker") &&
            this.getLabel("partner") &&
            this.getLabel("inPoland") &&
            this.getLabel("fromExterior") &&
            this.getLabel("waitingLocation")))
    }

    async respondNewMessages(){
        // listen for new messages
        this.client.on('message',async message => {
            const chat = await message.getChat()
            if( !chat.isGroup ){
                await this.autoResponses(chat, message)
            }
        })
    }

    async respondUnreadChats(  ){

        // check all unread chats and send messages
        const chats = await this.client.getChats()
        let unreadChats = 0

        for( let i = 0; i < chats.length; i++){
            const chat = chats[i];
            if( chat.unreadCount === 0 ) continue
            if( chat.isGroup ) continue
            await this.autoResponses(chat, chat.lastMessage )
            ++unreadChats
        }
        console.log("UNREAD CHATS: " + unreadChats )
    }

    async sendMsgs( chat, messages ){
        for( const msg of messages)
            await chat.sendMessage(msg)
    }

    async autoResponses( chat, message ){
        // get info
        const contact       = await chat.getContact()

        // verify
        const isTestContact = (await this.isTestContact(contact)) 
        const isTestable    = ( !this.production  && isTestContact )
        const goForward     = (this.production || isTestable)
        if( !goForward ) return

        //get more info
        const chatLabels    = await chat.getLabels()
        const contactNumber = await contact.getFormattedNumber();
        const getLabel = this.getLabel


        const labelPrx = this.labelPrefix
        console.log("[%s]\tMESSAGE: %s\tNAME: %s",new Date().toString(), contactNumber, contact.pushname)

        let messagesToSend = []
        let labelsToAssign = []

        // avoid assistance marked chats to be passed to chatbot
        if ( chatLabels.some( l => l.id === getLabel('assistance').id)) return
        
        // bug error pupperet workaround 
        if( !(message && message.body) ){
            console.log('NO MESSAGE BODY')
            return
        }

        // shortcut for delete message (only testNumbers)
        if( isTestContact && message.body === '!delete') {
            console.log("CHAT DELETED: "+(await chat.delete()))
            return
        }
        


        // step 1
        // check if this chat has been processed by chatbot
        if( !chatLabels.some( l => l.name.startsWith(labelPrx)) ){
            messagesToSend.push(...this.getMsgs('intro'))
            labelsToAssign.push( getLabel('intro').id )
            
            // actions
            await this.sendMsgs( chat, messagesToSend )
            await this.addLabel(chat, chatLabels, labelsToAssign)
            return
        }

        // bug error pupperet workaround 
        if( !(message && message.body) ){
            console.log('NO MESSAGE BODY')
            return
        }

        //step 2
        // process chat labeled as "intro"
        if( chatLabels.some( l => l.id === getLabel("intro").id )){
            switch(message.body){
                case '1':
                    labelsToAssign.push( getLabel('welder').id )
                    messagesToSend.push( this.getFile('welder.png') )
                    messagesToSend.push(...this.getMsgs('welderWorker'))
                    break
                case '2':
                    labelsToAssign.push( getLabel('generalWorkerFAM').id )
                    messagesToSend.push( this.getFile('anticorrosive.png'))
                    messagesToSend.push(...this.getMsgs('FAMGeneralWorker'))
                    break
                case '3':
                    labelsToAssign.push( getLabel('generalWorkerStrumet').id)
                    messagesToSend.push( this.getFile('generalWorkerMetals.png'))
                    messagesToSend.push(...this.getMsgs('strumetGeneralWorker')) 
                    break
                case '4':
                    labelsToAssign.push(getLabel('euroConfortWorker').id)
                    messagesToSend.push(this.getFile('packer.png'))
                    messagesToSend.push(...this.getMsgs('euroConfortWorker')) 
                    break
                case '5':
                    labelsToAssign.push(getLabel('partner').id)
                    messagesToSend.push(this.getFile('smartWorkPartners.pdf'))
                    messagesToSend.push(...this.getMsgs('partner')) 
                    break
                case '6':
                    labelsToAssign.push(getLabel('assistance').id)
                    messagesToSend.push(this.getMsgs('assistance'))
                    break
                default:
                    // send the last previous message whose contains options
                    let prevMsgs = this.getMsgs('intro')
                    labelsToAssign.push(...chatLabels.map(l=>l.id))
                    messagesToSend.push(this.getMsgs('wrongResponse'))
                    messagesToSend.push(prevMsgs[prevMsgs.length-1])
            }

            // actions
            await this.sendMsgs( chat, messagesToSend )
            await this.addLabel(chat, chatLabels, labelsToAssign)
            return
        }


        // final step--> when location has been choosed
        // 1 - go to personalized assistance
        // 2 - start again
        if ( chatLabels.some( l => 
            l.id === getLabel('inPoland').id ||
            l.id === getLabel('fromExterior').id 
        )){
            let previousLabelsIDs  = chatLabels.filter( l =>{
                return l.name.startsWith(labelPrx)
            }).map(l=>l.id)
            
            switch( message.body ){
                case '1':
                    labelsToAssign.push( getLabel('assistance').id )
                    labelsToAssign.push(... previousLabelsIDs )
                    messagesToSend.push(...this.getMsgs('assistance'))
                    break
                case '2':
                    messagesToSend.push(...this.getMsgs('notInterested'))
                    break
                default:
                    let prevMsgs = this.getMsgs('startProcessFromExterior')
                    messagesToSend.push(this.getMsgs('wrongResponse'))
                    messagesToSend.push(prevMsgs[prevMsgs.length-1])
                    labelsToAssign.push(...chatLabels.map(l=>l.id))
            }
            // actions
            await this.sendMsgs( chat, messagesToSend )
            await this.addLabel(chat, chatLabels, labelsToAssign)
            return
        }


        // step 4
        // give information to start process
        // 1 - in poland and set label in Poland
        // 2 - from exterior and set label people from exterior
        // this option remove waiting location label
        if ( chatLabels.some( l => l.id === getLabel('waitingLocation').id )){
            // this array does not contain "waitingLocation" label
            let previousLabelsIDs  = chatLabels.filter( l =>{
                return (
                    l.name.startsWith(labelPrx) &&
                    l.id != getLabel('waitingLocation').id 
                )}).map(l=>l.id)
            switch( message.body ){
                case '1':
                    labelsToAssign.push( getLabel('inPoland').id )
                    labelsToAssign.push(... previousLabelsIDs )
                    messagesToSend.push(...this.getMsgs('startProcessInPoland'))
                    break
                case '2':
                    labelsToAssign.push( getLabel('fromExterior').id )
                    labelsToAssign.push(... previousLabelsIDs )
                    messagesToSend.push(...this.getMsgs('startProcessFromExterior'))
                    break
                default:
                    let prevMsgs = this.getMsgs('askCurrentLocation')
                    messagesToSend.push(this.getMsgs('wrongResponse'))
                    messagesToSend.push(prevMsgs[prevMsgs.length-1])
                    labelsToAssign.push(...chatLabels.map(l=>l.id))
            }
            // actions
            await this.sendMsgs( chat, messagesToSend )
            await this.addLabel(chat, chatLabels, labelsToAssign)
            return
        }


        // step 3
        // ask to show more offer information 
        // YES - next time will ask location
        // NO  - next time will show vacancies info
        if ( chatLabels.some( l => 
            l.id === getLabel('welder').id ||
            l.id === getLabel('generalWorkerStrumet').id ||
            l.id === getLabel('generalWorkerFAM').id ||
            l.id === getLabel('euroConfortWorker').id 
        )){
            let previousLabelsIDs  = chatLabels.filter( l =>{
                return l.name.startsWith(labelPrx) 
            }).map(l=>l.id)

            switch( message.body ){
                case '1':
                    labelsToAssign.push( getLabel('waitingLocation').id )
                    labelsToAssign.push(...previousLabelsIDs )
                    messagesToSend.push(...this.getMsgs('askCurrentLocation'))
                    break
                case '2':
                    labelsToAssign.push( getLabel('intro').id )
                    messagesToSend.push(...this.getMsgs('intro'))
                    break
                default:
                    let prevMsgs = this.getMsgs('welderWorker')
                    messagesToSend.push(this.getMsgs('wrongResponse'))
                    messagesToSend.push(prevMsgs[prevMsgs.length-1])
                    labelsToAssign.push(...chatLabels.map(l=>l.id))
            }
            // actions
            await this.sendMsgs( chat, messagesToSend )
            await this.addLabel(chat, chatLabels, labelsToAssign)
            return
        }
    }


    // change only chatbot labels
    async addLabel(chat, chatLabels, newLabelIDs ){
        let finalLabels = [...newLabelIDs]

        // search for labels not related to chatbot
        for( let i = 0; i < chatLabels.length; i++){
            const cLabel = chatLabels[i]
            if( !cLabel.name.startsWith( this.labelPrefix ))
                finalLabels.push(cLabel.id)
        }
        chat.changeLabels(finalLabels)
    }


    /*
     * check if the contact number is in the test number list
     * @param {Contact} contact
     * @return {boolean} 
     */
    async isTestContact( contact ){
        const formatedPhoneNumber  = await contact.getFormattedNumber()
        const sanitizedPhoneNumber = formatedPhoneNumber.replace(/[^\d]+/gi,"")
        return this.testPhoneNumbers.some( num=>(num === sanitizedPhoneNumber))
    }
}




module.exports = ChatBot
