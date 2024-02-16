'use strict'

/*
  DB Connector sample code to help during development.
*/

const db = require('./src/index.js')

void async function(){
  try{
    await db.init([{
      connectionString: 'mongodb+srv://commerce-experience-stg-pl-0.n6iv5.mongodb.net/wtb',
      // secret: 'stg-mongo-awe-2'
    }])
    console.log('DB open')

    let docs = await db.wtb.collection('widget_confs').find().limit(5).toArray()
    console.log('docs found', docs.length)
    
    await db.close()
    console.log('DB closed')
  }
  catch(ex){
    console.error(ex)
  }

}()
