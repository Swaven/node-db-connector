const VError = require('verror')
const secretMgr = require('./aws-secrets.js')

class ConnectionURI{
  constructor(_){
    this.protocol = _.protocol || ''
    this.username = _.username || ''
    this.password = _.password || ''
    this.host = _.host || ''
    this.authdb = _.authdb || ''
    this.options = _.options || ''
  }

  static async parse(config){
    let uri
    try{
      const rx = /^(?<schema>mongodb(\+srv)?|redis|mysql):\/\/(?:(?<user>.+):(?<pwd>.+)@)?(?<host>[^\/]+?)(?:\/(?<name>.+?))?(?:\?(?<opts>.+))?$/
      const m = config.connectionString.match(rx)
      if (!m)
        throw new Error('Invalid connection string')
     
      uri = new ConnectionURI({
        protocol: m.groups.schema,
        username: m.groups.user,
        password: m.groups.pwd,
        host: m.groups.host,
        authdb: m.groups.name,
        options: m.groups.opts
      })
    }
    catch(ex){
      throw ex
    }

    if (!config.secret)
      return uri

    try{
      const secret = await secretMgr.getSecret(config.secret)
      if (typeof secret === 'object'){
        uri.username = secret.username
        uri.password = secret.password
        if (secret.authdb)
          uri.authdb = secret.authdb
      }
      return uri
    }
    catch(ex){
      throw new VError(ex, `error building connection URI`)
    }
  }

  toString(){
    const creds = this.username ? 
      `${this.username}:${this.password}@` 
      : ''

    const qs = this.options ? '?' + this.options : ''
    const v = `${this.protocol}://${creds}${this.host}/${this.authdb}${qs}`
    return v
  }
}

module.exports = exports = ConnectionURI
