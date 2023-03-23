const AWS = require('aws-sdk')

let client
function init(){
  if (client)
    return
  client = new AWS.SecretsManager()
}

module.exports = exports = {
  getSecret: function(secretId){
    return new Promise((resolve, reject) => {
      init()
      client.getSecretValue({ SecretId: secretId }, (err, data) => {
        if (err)
          return reject(err)

        try{
          resolve(JSON.parse(data.SecretString))
        }
        catch(ex){
          resolve(data.SecretString)
        }
      })
    })
  }
}