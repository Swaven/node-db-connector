# node-db-connector
Unified db connection mgmt: provides a simple way to connect to MongoDB, Mysql, Postgresql and Redis databases.

It uses the following drivers:  
Mongo: [Mongoose](http://mongoosejs.com/) or [native driver](http://mongodb.github.io/node-mongodb-native/2.2/)  
Mysql: [promise-mysql](https://github.com/lukeb-uk/node-promise-mysql)  
Postgresql: [pg-promise](https://github.com/vitaly-t/pg-promise)  
Redis: [promise-redis](https://github.com/maxbrieiev/promise-redis)

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
      name: 'b2b_data',
      connectionString: 'postgresql://user:pwd@192.168.6.9:1024/b2bdata'
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
*mongoose* `object`: the mongoose instance. Mandatory if Mongoose is used for a connection.  
*logger* `object`: a logger object. Must provide `info` and `error` methods. Default to `console`.  
*separator* `string`: separator to specify an alias for db name. Default ':'


#### `close()`

Closes all connections.

## Example

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

## Tests

`npm test` or `mocha tests` to run all tests. For them to run, you need a mongodb instance on *`localhost:27017`* (no authentication). The instance must contain a DB named *`wtb`* which itself must have a non-empty collection *`coin`*.

## Development setup

To run a development version of an npm module, you need to link it:

````shell
cd ../node-db-connector # go to the repository directory
npm link

cd .../dev/wtb-backoffice # go to the repository that needs the development version
npm link node-db-connector
````

See https://docs.npmjs.com/cli/link for more details.

To remove the development-version link:

````shell
# in project file
npm unlink node-db-connector

# in node-db-connector folder
npm unlink
````

## Publishing

- update the package version number in package.json. It uses semantic versionning. Semantic versionning uses 3 numbers to represent a version, e.g. `2.0.1`:
  - Major: increment when the new version contains **breaking changes**.
  - Minor: increment when the new version adds backward-compatible changes.
  - Patch: increment when the new version makes backward-compatible bugfixes.

Incrementing a number means resetting following number to 0, e.g. `2.1.7` -> `3.0.0`, or `2.0.5` -> `2.1.0`.

More details at https://semver.org/

````shell
npm publish
````
