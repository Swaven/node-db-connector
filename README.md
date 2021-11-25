# node-db-connector
Unified db connection mgmt: provides a simple way to connect to MongoDB, Mysql and Redis databases.

It uses the following drivers:  
Mongo: [Mongoose](http://mongoosejs.com/) or [native driver](http://mongodb.github.io/node-mongodb-native/3.6/)  
Mysql: [promise-mysql](https://github.com/lukeb-uk/node-promise-mysql)  
Redis: [node-redis](https://github.com/redis/node-redis)  
**PostgreSQL support was removed in version 3.0.0 as we do not use it anymore.**

This package only handles connection & disconnect. Please refer to each driver's own documentation for how to query the DBs.


## Usage

````javascript
    var db = require('node-db-connector')

    try{      
      await db.init(configs, {})
      console.log('DBs connections OK')

      await db.close()
      console.log('All DBs closed')

    }
    catch(err){
      console.error('Something horrible happened: ' + err)
    }
````

## API

#### `init(configs, [options])`

Connects to the DBs defined in `configs`.  Returns a promise.  
Each database is accessible on the `node-db-connector` object.

##### Parameters

**configs**  
Type: Array of objects. Mandatory, no default.

Lists the databases to connect to. Each element is an object with the following properties:  
*connectionString* `string`: the connection string to connect to the DB.  
*name* `string` or `Array of string`: Name the database will be referenced after. If not provided for Mongo, the database is referenced after the db name provided in the connection string.  
For Mongo DBs, the property can be an array of strings. The first value will reference the main db (the one  in the connection string). The other values must be the names of other databases the connection string gives access to.  

Examples:

````javascript
    {
       connectionString: 'mongodb://user:pwd@192.168.6.9:27017/dashboard',
       mongoose: true
    },
    {
      name: 'wtb-dev',
      connectionString: 'mongodb://user:pwd@localhost:27017/wtb'
    },
    {
      name: ['wtb', 'catalog'],
      connectionString: 'mongodb://user:pwd@192.168.6.9:27017/wtb'
    },
    {
      name: 'cms',
      connectionString: 'mysql://user:pwd@192.168.6.9:3306/prd_cms'
    },
    {
      name: 'redis',
      connectionString: 'redis://192.168.6.9:6379'
    }
````

If you need to alias a DB, use the `dbName:alias` syntax, where *dbName* is the real name of the database, and *alias* is the name you want to use. This is useful to avoid conflicts when you need to connect to 2 different databases with the same name.

````javascript
    {name: 'wtb:source', connectionString: 'mongodb://...'}
````
Allows you to use *`db.source`* to query the *`wtb`* database.


**options**  
Type: object

Available options:  
- *mongoose* `object`: the mongoose instance. Mandatory if Mongoose is used for a connection.
- *logger* `object`: a logger object. Must provide `info` and `error` methods. Default to `console`.
- *separator* `string`: separator to specify an alias for db name. Default `':'`


#### `close()`

Closes all connections.

## Example

````javascript
    const db = require('node-db-connector'),
          configs = [{
            name: ['wtb', 'catalog'],
            connectionString: 'mongodb://user:pwd@192.168.6.9:27017/wtb'
          }]

    try{      
      await db.init(configs, {})    
      console.log('DBs connections OK')

      const users = await db.wtb.collection('users').find().toArray()    
      const products = await db.catalog.collection('products').findOne({_id: 42})    

      await db.close()
      console.log('All DBs closed')
    }
    catch(err){
      console.error('Aargh :(\n' + err)
    }
````

## Tests

`npm test` or `mocha tests` to run all tests. Connection strings must be in a file in `tests/connectionStrings.json`. The JSON object must be of the following form:

````json
{
  "stg_admin": "mongodb://user:pwd@host:27017",
  "stg_admin_wrong_db": "mongodb://user:pwd@host:27017/wtb",
  "stg_local": "mongodb://user:pwd@host:27017/wtb",
  "stg_local_wrong_db": "mongodb://user:pwd@host:27017"
}

````
