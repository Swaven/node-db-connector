'use strict'

const chai = require('chai')
const aspromised = require('chai-as-promised')

chai.use(aspromised)
const should = chai.should()


function clearCache(){
  Object.keys(require.cache).forEach(key => delete require.cache[key])
}

describe('Build connection string', () => {
  clearCache()

  let sut = require('../src/connectionUri.js')
  it('invalid secret', async () => {
    const p = sut.parse({
      connectionString: 'mongo://127.0.0.1:29800/wtb',
      secret: 'invalidSecret'
    })
    p.should.eventually.be.rejected
  })
})