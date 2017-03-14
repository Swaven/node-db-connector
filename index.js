'use strict'

var VError = require('verror')

class DbConnector {
  constructor(){
    this._options = null
    this._mongooseDbName = null
    this._mongoDbNames = null
  }

  init(configs, options){
    this._options = options
    this._connPromises = []
    this._mongoDbNames = []

    // find mongoose connection
    var mongooseIdx = configs.findIndex((x) => {return x.mongoose === true})
    if (mongooseIdx >= 0){
      let mongooseConfig = configs.splice(mongooseIdx, 1)[0] // get mongoose config and remove it from array
      this._connectMongoose(mongooseConfig)
    }

    // find & connect to mongo DBs
    var mongoConfigs = configs.filter((x) => {return x.connectionString.startsWith('mongodb://')})
    if (mongoConfigs.length > 0){
      let mongoclient = require('mongodb').MongoClient
      for (let cfg of mongoConfigs){
        this._connectMongo(cfg, mongoclient)
      }
    }

    // // find mysql configs
    // var mysqlConfigs = configs.filter((x) => {return x.connectionString.startsWith('mysql://')})
    // this._connectMysql(mysqlConfigs)
    //
    // // find postgresql configs
    // var pgConfigs = configs.filter((x) => {return x.connectionString.startsWith('postgresql://')})
    // this._coonectPostgresql(pgConfigs)

    return Promise.all(this._connPromises)
  }

  // close all connections
  close(){
    this._closePromises = [
      this._closeMongoose()
    ]
    this._closeMongos()
    return Promise.all(this._closePromises)
  }

  // connect using Mongoose
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

  // connecto to Mongo using native driver
  _connectMongo(config, mongoclient){
    this._connPromises.push(new Promise((resolve, reject) => {
      mongoclient.connect(config.connectionString, (err, db)=>{
        let logName = (config.name || db.databaseName).toString() // name to show in logs
        if (err != null)
          return reject(new VError(err, `Mongo/${logName} connection error`))

        let mainDb = null, secondaryDbs = []
        if (!config.name) // use name in connection string if not defined
          mainDb = db.databaseName
        else if (typeof config.name === 'string')
          mainDb = config.name
        else if (Array.isArray(config.name)){
          // if name is an array, first value is the main db and remainders are secondary dbs
          mainDb = config.name.splice(0,1)[0]
          secondaryDbs = config.name
        }
        else
          return reject(new VError('Name must be a string or an aray of string'))

        // reference db instance by adding it as class property
        this[mainDb] = db
        this._mongoDbNames.push(mainDb)

        // reference secondary dbs. But their names are not added to list of dbs;
        // since they use the same socket connection as the main db, there's no need to close them individually
        for (let name of secondaryDbs){
          this[name] = db.db(name)
        }

        console.log(`Mongo/${logName} connection ok`)
        resolve()
      })
    }))
  }

  // close mongoose connection
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

  //  close all native mongos connections
  _closeMongos(){
    for (let dbName of this._mongoDbNames){
      if (this[dbName] == null)
        continue

      this._closePromises.push(new Promise((resolve, reject)=>{
        this[dbName].close((err)=>{
          if (err != null)
            console.log(`Mongo/${dbname} connection close error`)
          else
            console.log(`Mongo/${dbName} connection closed`)
          resolve()
        })
      }))
    }
  }

}

const self = module.exports = exports = new DbConnector()
