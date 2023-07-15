const fs = require('fs')
const path = require('path')

const { MessageMedia } = require('./whatsapp-web.js/index')

const production = true
const labelPrefix = "CHATBOT-"
const testPhoneNumbers = [ "573158770727", "48731356633" ]

const imgFolder    = path.join( __dirname, 'src', 'img' )
const messagesFile = path.join( __dirname, 'src', 'messages.json')

let chatBotMessages = []
let chatBotLabels // labels chatbot will assign

const partnersPresentation = MessageMedia.fromFilePath( path.join(imgFolder, 'smartWorkPartners.pdf'))

const vacancyImages = {
    fam_gw:      MessageMedia.fromFilePath(path.join(imgFolder,'anticorrosive.png')),
    euroConfort: MessageMedia.fromFilePath(path.join(imgFolder,'packer.png')),
    strumet_w:   MessageMedia.fromFilePath(path.join(imgFolder,'welder.png')),
    strumet_gw:  MessageMedia.fromFilePath(path.join(imgFolder,'generalWorkerMetals.png'))
}





async function startChatBot ( client ){
    chatBotLabels = await getChatBotLabels()
    readMessagesFile( messagesFile )
    watchMessagesFile( messagesFile )

    // check all unread chats and send messages
    const chats = await client.getChats()
    await respondUnreadChats(chats)

    // listen for new messages
    client.on('message',async message => {
        const chat = await message.getChat()
        if( !chat.isGroup ){
            await autoResponses(chat, message)
        }
    })
}







// messages functions

async function respondUnreadChats( chats ){
    let unreadChats = 0

    for( let i = 0; i < chats.length; i++){
        const chat = chats[i];
        if( chat.unreadCount === 0 ) continue
        if( chat.isGroup ) continue
        await autoResponses(chat, chat.lastMessage )
        ++unreadChats
    }
    console.log("UNREAD CHATS: " + unreadChats )
}

async function sendMultipleMessages( chat, messages ){
    return Promise.allSettled( messages.map(
        m => chat.sendMessage(m)
    ))
}


async function autoResponses( chat, message ){
    const contact       = await chat.getContact()
    const isTestable    = ( !production  &&  (await isTestContact(contact)) )
    const goForward     = (production || isTestable)

    if( !goForward ) return
    const labels     = await chat.getLabels()
    const contactNumber = await contact.getFormattedNumber();
    console.log("MESSAGE FROM: %s NAMED: %s", contactNumber, contact.pushname)

    if ( labels.some( l => l.id === chatBotLabels.assistance?.id )) return
    if( !(message && message.body)) return

    if( !labels.some( l => l.name.startsWith(labelPrefix)) ){
        // step 1
        await sendMultipleMessages(chat, chatBotMessages.intro  ) 
        await chat.changeLabels( [chatBotLabels.intro.id] )
    } else if ( labels.some( l => l.id === chatBotLabels.intro.id )){
        //step 2
        // show offer information depending of response of first step
        switch(message.body){
            case '1':
                await chat.sendMessage(vacancyImages.strumet_w)
                await sendMultipleMessages(chat, chatBotMessages.welderWorker)
                await addLabel(chat, labels, [chatBotLabels.welderWorker.id])
                break
            case '2':
                await chat.sendMessage(vacancyImages.fam_gw)
                await sendMultipleMessages(chat, chatBotMessages.FAMGeneralWorker)
                await addLabel(chat, labels, [chatBotLabels.generalWorkerFAM.id])
                break
            case '3':
                await chat.sendMessage(vacancyImages.strumet_gw)
                await sendMultipleMessages(chat, chatBotMessages.strumetGeneralWorker)
                await addLabel(chat, labels, [chatBotLabels.generalWorkerStrumet.id])
                break
            case '4':
                await chat.sendMessage(vacancyImages.euroConfort)
                await sendMultipleMessages(chat, chatBotMessages.euroConfortWorker)
                await addLabel(chat, labels, [chatBotLabels.euroConfortWorker.id])
                break
            case '5':
                await sendMultipleMessages(chat, chatBotMessages.partner)
                await chat.sendMessage( partnersPresentation )
                await addLabel(chat, labels, [chatBotLabels.partner.id])
                break
            case '6':
                await sendMultipleMessages(chat, chatBotMessages.assistance)
                await addLabel(chat, labels, [chatBotLabels.assistance.id])
                break
            default:
                await sendMultipleMessages(chat, chatBotMessages.wrongResponse)
                await chat.sendMessage(chatBotMessages.intro[chatBotMessages.intro.length-1])
        }
    } else if ( labels.some( l => 
        l.id === chatBotLabels.inPoland.id || l.id === chatBotLabels.fromExterior.id 
    )){
        // final step--> to get personalized assitance o refuse
        // 1 - go to personalized assitance
        // 2 - start again
        let labelIDs  = labels.filter( l =>{
            return l.name.startsWith(labelPrefix)
        }).map(l=>l.id)
        switch( message.body ){
            case '1':
                await sendMultipleMessages(chat, chatBotMessages.assistance)
                await addLabel(chat, labels, [...labelIDs, chatBotLabels.assistance.id])
                break
            case '2':
                await sendMultipleMessages(chat, chatBotMessages.notInterested)
                //await addLabel(chat, labels, [...labelIDs, chatBotLabels.notInterested.id])
                //await addLabel(chat, labels, labelIDs)
                await addLabel(chat, labels, [])
                break
            default:
                await sendMultipleMessages(chat, chatBotMessages.wrongResponse)
                await chat.sendMessage(chatBotMessages.startProcessFromExterior[chatBotMessages.startProcessFromExterior.length-1])
        }
    } else if ( labels.some( l => l.id === chatBotLabels.waitingLocation.id )){
        // step 4
        // give information to start process
        // 1 - in poland and set label in Poland
        // 2 - from exterior and set label people from exterior
        // this option remove waiting location id


        let labelIDs  = labels.filter( l =>{
            return (l.name.startsWith(labelPrefix) && l.id != chatBotLabels.waitingLocation.id)
        }).map(l=>l.id)


        switch( message.body ){
            case '1':
                await sendMultipleMessages(chat, chatBotMessages.startProcessInPoland)
                await addLabel(chat, labels, [...labelIDs, chatBotLabels.inPoland.id])
                break
            case '2':
                await sendMultipleMessages(chat, chatBotMessages.startProcessFromExterior)
                await addLabel(chat, labels, [...labelIDs, chatBotLabels.fromExterior.id])
                break
            default:
                await sendMultipleMessages(chat, chatBotMessages.wrongResponse)
                await chat.sendMessage(chatBotMessages.askCurrentLocation[chatBotMessages.askCurrentLocation.length-1])
        }
    } else if ( labels.some( l => 
        l.id === chatBotLabels.welderWorker.id ||
        l.id === chatBotLabels.generalWorkerStrumet.id ||
        l.id === chatBotLabels.generalWorkerFAM.id ||
        l.id === chatBotLabels.euroConfortWorker.id
    )){
        // step 3
        // answer to show more offer information 
        // YES - next time will ask location
        // NO  - next time will show vacancies info
        let labelIDs  = labels.filter( l =>{
            return l.name.startsWith(labelPrefix) 
        }).map(l=>l.id)

        switch( message.body ){
            case '1':
                await sendMultipleMessages(chat, chatBotMessages.askCurrentLocation)
                await addLabel(chat, labels, [...labelIDs, chatBotLabels.waitingLocation.id])
                break
            case '2':
                await sendMultipleMessages(chat, chatBotMessages.intro)
                await addLabel(chat, labels, [chatBotLabels.intro.id])
                break
            default:
                await sendMultipleMessages(chat, chatBotMessages.wrongResponse)
                await chat.sendMessage(chatBotMessages.welderWorker[chatBotMessages.welderWorker.length-1])
        }
    }
}


// label functions
async function getLabelByName( labelName ){
    const labels = await client.getLabels()
    return labels.find( label => label.name === labelName )
}

// change labels, taking care of keeping non-chatbot labels
async function addLabel(chat, chatLabels, newLabelIDs ){
    let finalLabels = newLabelIDs 

    // search for labels not related to chatbot
    for( let i = 0; i < chatLabels.length; i++){
        const cLabel = chatLabels[i]
        if( !cLabel.name.startsWith( labelPrefix ))
            finalLabels.push(cLabel.id)
    }
    chat.changeLabels(finalLabels)
}

async function getChatBotLabels (){
    return Promise.resolve({
        intro:                await getLabelByName( labelPrefix + 'intro' ),
        welderWorker:         await getLabelByName( labelPrefix + 'welder' ),
        generalWorkerStrumet: await getLabelByName( labelPrefix + 'generalWorkerStrumet' ),
        generalWorkerFAM:     await getLabelByName( labelPrefix + 'generalWorkerFAM' ),
        euroConfortWorker:    await getLabelByName( labelPrefix + 'euroConfortWorker' ),
        assistance:           await getLabelByName( labelPrefix + 'assistance' ),
        partner:              await getLabelByName( labelPrefix + 'partner' ),
        waitingLocation:      await getLabelByName( labelPrefix + 'waitingLocation' ),
        inPoland:             await getLabelByName( labelPrefix + 'inPoland' ),
        fromExterior:         await getLabelByName( labelPrefix + 'fromExterior' ),
        notInterested:        await getLabelByName( labelPrefix + 'notInterested' ),
    })
}



/*
 * check if the contact number is in the test number list
 * @param {Contact} contact
 * @return {boolean} 
 */
async function isTestContact (contact){
    const formatedPhoneNumber  = await contact.getFormattedNumber()
    const sanitizedPhoneNumber = formatedPhoneNumber.replace(/[^\d]+/gi,"")
    return testPhoneNumbers.some( num => (num === sanitizedPhoneNumber) )
}


/*
 * Read messages json file and and parse to assign to gobal variable
 * @param {string} messagesPath messages file path
 * @return void
 */
function readMessagesFile( messagesPath ){
    fs.readFile( messagesPath, { encoding: 'utf8' }, (error,messages)=>{
        if(error) console.error(error)
        try{
            const messagesJSON = JSON.parse(messages)
            chatBotMessages = messagesJSON
        }catch( errorJson ){
            // continue execution without stopping
            console.error( errorJson )
        }
    })
}


/*
 * Watch messages json file for changes, and parse it after
 * @param {string} messagesPath messages file path
 * @return {void}
 */
function watchMessagesFile( messagesPath ){
    fs.watch( messagesPath, ( eventType, filename )=>{
        if(eventType === 'change'){
            console.log("FILE CHANGED" + filename)
            readMessagesFile(messagesPath)
        }
    })
}
