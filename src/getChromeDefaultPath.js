module.exports.getChromeDefaultPath = ()=>{
    switch( process.platform ){
        case "darwin":
            return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        case "win32":
            return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' 
        default:
            return ""
    }
}
