const connect = require('mongoose').connect

module.exports.connect = async function (){
    return connect(process.env.DB_URL)
        .then(()=>{
            console.log('connection succesfully')
        })
        .catch( error => {
            process.send( error )
            process.exit(1)
        })
}
