'use strict'

var VError = require('verror')

class DbConnector {
  constructor(){
    this._connPromises = null
    this._mongooseDbName = null
    this._options = null
  }

  // TODO: check every config has a name
  init(configs, options){
    this._options = options
    this._connPromises = []

    var configsOk = configs.every((x) => {
      return typeof x.name == 'string' || Array.isArray(x.name)
    })
    if (!configsOk)
      throw new VError('DB configurations must provide a name')

    // find mongoose connection
    var mongooseIdx = configs.findIndex((x) => {return x.mongoose === true})
    if (mongooseIdx >= 0){
      let mongooseConfig = configs.splice(mongooseIdx, 1)[0] // get mongoose config and remove it from array
      this._connectMongoose(mongooseConfig)
    }

    // // find mongo connections
    // var mongoConfigs = configs.filter((x) => {x.connectionString.startsWith('mongodb://')})
    // this._connectMongo(mongoConfigs)
    //
    // // find mysql configs
    // var mysqlConfigs = configs.filter((x) => {x.connectionString.startsWith('mysql://')})
    // this._connectMysql(mysqlConfigs)
    //
    // // find postgresql configs
    // var pgConfigs = configs.filter((x) => {x.connectionString.startsWith('postgresql://')})
    // this._coonectPostgresql(pgConfigs)

    return Promise.all(this._connPromises)
  }

  // close all connections
  close(){
    var closePromises = [
      this._closeMongoose()
    ]
    return Promise.all(closePromises)
  }

  _connectMongoose(config){
    if (this._options == null || this._options.mongoose == null)
      throw new VError('Mongoose object must be provided')

    this._options.mongoose.Promise = global.Promise // tells mongoose to use native Promise
    this._options.mongoose.connect(config.connectionString, { mongos: config.multi || false })
    var mongoosedb = this._options.mongoose.connection
    this._mongooseDbName = config.name
    this._connPromises.push(new Promise((resolve, reject) => {

      // custom timeout when mongoose doesn't raise an error at all
      let tm = setTimeout(() => {
        reject(new VError(`Mongoose/${this._mongooseDbName} connection error`))
      }, 60 * 1000) // 1 minute

      mongoosedb.on('error', (err) => {
        clearTimeout(tm)
        reject(new VError(err, `Mongoose/${self._mongooseDbName} connection error`))
      })

      mongoosedb.once('open', () => {
        clearTimeout(tm)
        console.log(`Mongoose/${self._mongooseDbName} connection OK`)
        resolve()
      })
    }))
  }

  _closeMongoose(){
    if (this._mongooseDbName == null)
      return Promise.resolve()

    return new Promise((resolve, reject) =>{
      this._options.mongoose.disconnect((err) => {
        if (err != null)
          console.log(`Mongoose/${this._mongooseDbName} connection close error`)
        else
          console.log(`Mongoose/${this._mongooseDbName} connection closed`)
        resolve()
      })
    })
  }
}

const self = module.exports = exports = new DbConnector()
