'use strict'
const {SecretsManager, GetSecretValueCommand} = require('@aws-sdk/client-secrets-manager')
const VError = require('verror')


let client
function init(){
  if (client)
    return
  client = new SecretsManager()
}

module.exports = exports = {
  getSecret: async function(secretId){
    try{
      init()
      const data = await client.send(new GetSecretValueCommand({SecretId: secretId} ))
      return JSON.parse(data.SecretString)
    }
    catch(ex){
      if (ex instanceof SyntaxError)
        return data.SecretString
      throw new VError(ex, `Error retrieving secret '${secretId}'`)
    }
  }
}