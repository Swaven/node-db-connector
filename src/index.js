const VError = require('verror')
const ConnectionURI = require('./connectionUri.js')

class DbConnector {
  constructor(){
    this._options = null
    this._mongooseDbName = null
    this._mongoClients = null

    // list of mongo db names/aliases
    // for each  there is a top-level property with that name that references the DB object
    this._mongoDbNames = null
    this._mysqlDbNames = null
    this._redisDbNames = null
    this._logger = null
  }

  init(configs, options){
    this._options = options || {}
    this._connPromises = []
    this._mongoClients = []
    this._mongoDbNames = []
    this._mysqlDbNames = []
    this._redisDbNames = []
    this._logger = this._options.logger || console

    this._options.separator = this._options.separator || ':'

    // find mongoose connection
    var mongooseIdx = configs.findIndex((x) => {return x.mongoose})
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

    // find redis configs
    var redisConfigs = configs.filter((x) => {return x.connectionString.startsWith('redis://')})
    if (redisConfigs.length > 0){
      let redis = require('promise-redis-legacy')()

      for (let cfg of redisConfigs){
        this._connectRedis(cfg, redis)
      }
    }

    return Promise.all(this._connPromises)
  }

  // close all connections
  close(){
    this._closePromises = [
      this._closeMongoose()
    ]
    this._closeMongos()
    this._closeMysql()
    this._closeRedis()
    return Promise.all(this._closePromises)
  }

  // connect using Mongoose
  _connectMongoose(config){
    if (this._options.mongoose == null)
      throw new VError('Mongoose object must be provided')

    this._connPromises.push(new Promise(async (resolve, reject) => {

      const uri = await ConnectionURI.parse(config)
      this._options.mongoose.Promise = global.Promise // tells mongoose to use native Promise
      
      this._options.mongoose.connect(uri.toString(), typeof config.mongoose === 'object' ? config.mongoose : null)
      var mongoosedb = this._options.mongoose.connection
      this._mongooseDbName = config.name

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
    this._connPromises.push(new Promise(async (resolve, reject) => {
      const uri = await ConnectionURI.parse(config)
      

      if (!uri.authdb && !config.name)
        return reject('No DB name in connection string or config')

      mongoclient.connect(uri.toString(), {useUnifiedTopology: true}, (err, client) => {
        let clientName = (config.name || uri.authdb).toString() // name of the mongo client for the connection
        if (err != null)
          return reject(new VError(err, `Mongo/${clientName} connection error`))

        // names of database to reference
        let dbNames
        if (!config.name)
          dbNames = [uri.authdb] // when no name is provided, use auth db
        else if (typeof config.name === 'string')
          dbNames = [config.name]
        else if (Array.isArray(config.name))
          dbNames = config.name
        else
          return reject(new VError('Name must be a string or an aray of string'))

        if (this[clientName])
          return reject(new VError('Cannot reference multiple clients with name %s', clientName))

        // keep ref of reference connected client
        this._mongoClients.push({
          name: clientName, // for log/display purpose only
          client: client
        })

        // reference all dbs.
        // They all use the same client/socket connection.
        for (let name of dbNames){
          let alias
          [name, alias] = name.split(this._options.separator)
          alias = alias || name

          if (this[alias])
            throw new VError('Cannot have multiple connections to alias %s', alias)

          this[alias] = client.db(name)
          this._mongoDbNames.push(alias)
        }

        this._logger.info(`Mongo/${clientName} connection ok`)
        resolve()
      })
    }))
  }

  async _connectMysql(config, mysql){
    this._connPromises.push(new Promise(async (resolve, reject) => {
      const uri = await ConnectionURI.parse(config)
      const mySqlPool = mysql.createPool(uri.toString())
      if (!mySqlPool)
        return reject(new VError(`Invalid MySql/${config.name} connection string`))

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

  // connect to Redis
  _connectRedis(config, redis){
    this._connPromises.push(new Promise(async (resolve, reject) => {
      const uri = await ConnectionURI.parse(config)
      let connected = false
      const client = redis.createClient({url: uri.toString()})
     
      // client will emit error when encountering an error connecting to the Redis server
      // OR when any other in node_redis occurs, that's why reject method is called only if client not connected yet
      client.on("error", err => {
        this._logger.error(new VError(err, `Redis/${config.name}: an error occured`))
        if (!connected)
          reject(new VError(err, `Redis/${config.name} connection error`))
      })

      this[config.name] = client
      this._redisDbNames.push(config.name)
      this._logger.info(`Redis/${config.name} connection OK`)
      connected = true
      resolve()
    }))
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
    if (this._mongoClients == null)
      return

    this._mongoDbNames.forEach(alias => {
      delete this[alias]
    })
    this._mongoDbNames = null

    this._mongoClients.forEach((client) => {
      this._closePromises.push(client.client.close().then(() => {
        self._logger.info(`Mongo/${client.name} connection closed`)
      })
      .catch(() => {
        self._logger.info.log(`Mongo/${client.name} connection close error`)
        return Promise.resolve() // resolve anyway
      }))
    })

    this._mongoClients = null
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

  //  close all redis connections
  _closeRedis(){
    this._redisDbNames.forEach((dbName)=>{
      if (this[dbName] == null)
        return
      this._closePromises.push(new Promise(async (resolve, reject) => {
        await this[dbName].quit()
        self._logger.info(`Redis/${dbName} connection closed`)
        resolve() // resolve anyway, but end event may not be logged
      }))
    })
  }
}

const self = module.exports = exports = new DbConnector()
