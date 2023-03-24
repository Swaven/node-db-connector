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

describe("MySQL", () => {
  const sut = require('../index.js')
  it('connect', async () => {
    await sut.init([{name: 'stg_cms', connectionString: connStrings.mysql_staging}])
    return assert.isNotNull(sut.stg_cms)
  })
  it('close', async () => {
    return sut.close()
  })
})

