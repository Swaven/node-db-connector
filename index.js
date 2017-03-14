'use strict'

var VError = require('verror')

class DbConnector {
  constructor(){
    this._options = null
    this._mongooseDbName = null
    this._mongoDbNames = null
    this._pgDbNames = null
    this._mysqlDbNames = null
    this._pgPromise = null // pg-promise library instance
    this._logger = null
  }

  init(configs, options){
    this._options = options || {}
    this._connPromises = []
    this._mongoDbNames = []
    this._pgDbNames = []
    this._mysqlDbNames = []
    this._logger = this._options.logger || console


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

    // find mysql configs
    var mysqlConfigs = configs.filter((x) => {return x.connectionString.startsWith('mysql://')})
    if (mysqlConfigs.length > 0){
      let mysql = require('promise-mysql')
      for (let cfg of mysqlConfigs){
        this._connectMysql(cfg, mysql)
      }
    }

    // find postgresql configs
    var pgConfigs = configs.filter((x) => {return x.connectionString.startsWith('postgresql://')})
    if (pgConfigs.length > 0){
      this._pgPromise = require('pg-promise')()
      for (let cfg of pgConfigs){
        this._connectPostgresql(cfg)
      }
    }

    return Promise.all(this._connPromises)
  }

  // close all connections
  close(){
    this._closePromises = [
      this._closeMongoose(),
      this._closePostgresql()
    ]
    this._closeMongos()
    this._closeMysql()
    return Promise.all(this._closePromises)
  }

  // connect using Mongoose
  _connectMongoose(config){
    if (this._options.mongoose == null)
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
        self._logger.info(`Mongoose/${self._mongooseDbName} connection OK`)
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

        this._logger.info(`Mongo/${logName} connection ok`)
        resolve()
      })
    }))
  }

  // opens a postgreql connection
  _connectPostgresql(config){
    // Db[cfg.name] = pgp(cfg.connectionString)
    this._connPromises.push(new Promise((resolve, reject) => {
      let db = this._pgPromise(config.connectionString)
      db.connect().then((obj) => {
        this[config.name] = db
        this._pgDbNames.push(config.name)
        this._logger.info(`PostgreSql/${config.name} connection OK`)
        obj.done()
        resolve()
      })
      .catch((err) => {
        reject(new VError(err, `PostgreSql/${config.name} connection error`))
      })
    }))
  }

  _connectMysql(config, mysql){
    var mySqlPool = this._createMysqlPool(config.connectionString, mysql)
    if (!mySqlPool)
      return this._connPromises.push(Promise.reject(new VError(`Invalid MySql/${config.name} connection string`)))

    this._connPromises.push(new Promise((resolve, reject) => {
      mySqlPool.getConnection((err, cnx) => {
        if (err)
          return reject(new VError(err, `Mysql/${config.name} connection error`))

        this[config.name] = mySqlPool
        this._mysqlDbNames.push(config.name)
        this._logger.info(`Mysql/${config.name} connection OK`)
        resolve()
      })
    }))
  }

  _createMysqlPool(connectionString, mysql){
    let regEx = /^mysql:\/\/(.+):(.+)@(.+?)(:(\d+))?\/(.+)$/,
        connDetails = connectionString.match(regEx)

    if (!connDetails)
      return

    return mysql.createPool({
      user     : connDetails[1],
      password : connDetails[2],
      host     : connDetails[3],
      port     : connDetails[5],
      database : connDetails[6]
    })
  }

  // close mongoose connection
  _closeMongoose(){
    if (this._mongooseDbName == null)
      return Promise.resolve()

    return new Promise((resolve, reject) =>{
      this._options.mongoose.disconnect((err) => {
        if (err != null)
          this._logger.info(`Mongoose/${this._mongooseDbName} connection close error`)
        else
          this._logger.info(`Mongoose/${this._mongooseDbName} connection closed`)
        resolve()
      })
    })
  }

  //  close all native mongos connections
  _closeMongos(){
    this._mongoDbNames.forEach((dbName)=>{
      if (this[dbName] == null)
        return

      this._closePromises.push(this[dbName].close().then(()=>{
        self._logger.info(`Mongo/${dbName} connection closed`)
      })
      .catch(()=>{
        self._logger.info.log(`Mongo/${dbName} connection close error`)
        return Promise.resolve() // resolve anyway
      }))
    })
  }

  // closes postgresql connections
  _closePostgresql(){
    if (this._pgDbNames.length > 0){
      this._pgPromise.end()
      for (let name of this._pgDbNames)
        this._logger.info(`Postgresql/${name} connection closed`)
    }
    return Promise.resolve()
  }

  // closes all mysql connections
  _closeMysql(){
    this._mysqlDbNames.forEach((dbName) => {
      this._closePromises.push(this[dbName].end().then(() => {
        self._logger.info(`Mysql/${dbName} connection closed`)
      })
      .catch(()=>{
        self._logger.info(`Mysql/${dbName} connection close error`)
        return Promise.resolve() // resolve anyway
      }))
    })
  }
}

const self = module.exports = exports = new DbConnector()
