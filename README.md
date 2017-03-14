# node-db-connector
Unified db connection mgmt: provides a simple way to connect to MongoDB, Mysql and Postgresql databases.

It uses the following drivers:  
Mongo: [Mongoose](http://mongoosejs.com/) or [native driver](http://mongodb.github.io/node-mongodb-native/2.2/)  
Mysql: [promise-mysql](https://github.com/lukeb-uk/node-promise-mysql)  
Postgresql: [pg-promise](https://github.com/vitaly-t/pg-promise)

This package only handles connection & disconnect. Please refer to each driver's own documentation for how to query the DBs.

## Usage

````javascript
    var db = require('node-db-connector')
    db.init(configs, {})
    .then(() => {
      console.log('DBs connections OK')
      return db.close()
    })
    .then(() => {
      console.log('All DBs closed')
    })
    .catch((err) => {
      console.error('Something horrible happened: ' + err)
    })
````

## API

#### `init(configs, [options])`

Connects to the DBs defined in `configs`.  Returns a promise.  
Each database is accessible on the `node-db-connector` object.

###### Parameters

**configs**  
Type: Array of objects. Mandatory, no default.

Lists the databases to connect to. Each element is an object with the following properties:  
*connectionString* `string`: the connection string to connect to the DB.  
*name* `string` or `Array of string`: Name the database will be referenced after. If not provided for Mongo, the database is referenced after the db name provided in the connection string.  
For Mongo DBs, the property can be an array of strings. The first value will reference the main db (the one  in the connection string). The other values must be the names of other databases the connection string gives access to.

Examples:

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
      name: 'b2b_data',
      connectionString: 'postgresql://user:pwd@192.168.6.9:1024/b2bdata'
    },
    {
      name: 'cms',
      connectionString: 'mysql://user:pwd@192.168.6.9:3306/prd_cms'
    }


**options**  
Type: object

Available options:  
*mongoose* `object`: the mongoose instance. Mandatory if Mongoose is used for a connection.  
*logger* `object`: a logger object. Must provide `info` and `error` methods. Default to `console`.


#### `close()`

Closes all connections.

### Example

````javascript
    var db = require('node-db-connector'),
        configs = [{
          name: ['wtb', 'catalog'],
          connectionString: 'mongodb://user:pwd@192.168.6.9:27017/wtb'
        }]
    db.init(configs, {})
    .then(() => {
      console.log('DBs connections OK')
      return db.wtb.collection('users').find().toArray()
    .then((users)=>{
      return db.catalog.collection('products').findOne({_id: 42})
    })
    .then((doc)=>{
      return db.close()
    })
    .then(() => {
      console.log('All DBs closed')
    })
    .catch((err) => {
      console.error('Something horrible happened: ' + err)
    })
````
