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

describe("Redis", () => {
  const sut = require('../index.js')
  it('connect', async () => {
    await sut.init([{name: 'local', connectionString: 'redis://127.0.0.1:6379'}])
  })
  it('close', async () => {
    await sut.close()
  })
})

