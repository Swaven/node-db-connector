'use strict'

const chai = require('chai'),
      assert = chai.assert,
      { readFileSync } = require('fs')


const connStrings = JSON.parse(readFileSync('tests/connectionStrings.json'))

// Fail if connection strings contain placeholder values instead of actual credentials
const invalid = Object.values(connStrings).some(x => x.includes('PWD@'))
if (invalid){
  console.error('Invalid connection strings')
  return
}

function clearCache(){
  Object.keys(require.cache).forEach(key => delete require.cache[key])
}

const samples = [
  {
    test:'basic',
    cfg:{name: 'stg_cms', connectionString: connStrings.mysql_staging}
  }, {
    test:'w/ secret',
    cfg:{
      name: 'stg_cms', 
      connectionString: 'mysql://username:password@stg-prddata.c2e9dnivo2g9.eu-west-1.rds.amazonaws.com:9760/authdb',
      secret:'stg-mysql-dp'
    }
  }, {
    test:'w/ secret 2 no auth',
    cfg:{
      name: 'stg_cms', 
      connectionString: 'mysql://stg-prddata.c2e9dnivo2g9.eu-west-1.rds.amazonaws.com:9760',
      secret:'stg-mysql-dp'
    }
  }
]

samples.forEach(sample => {
  clearCache()

  describe(sample.test, () => {
    const sut = require('../src/index.js')
    it('connect', async () => {
      await sut.init([sample.cfg])
      return assert.isNotNull(sut.stg_cms)
    })
    it('close', async () => {
      return sut.close()
    })
  })

})