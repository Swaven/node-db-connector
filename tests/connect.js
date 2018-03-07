'use strict'

const chai = require('chai'),
      assert = chai.assert


const connStrings = {
  local: 'mongodb://localhost:27017/wtb'
}

const samples = [
  {
    test: 'Single, no name',
    cfg : {connectionString: connStrings.local},
    db: 'wtb'
  },
  {
    test: 'Single, named same',
    cfg: {name: 'wtb', connectionString: connStrings.local},
    db: 'wtb'
  },
  {
    test: 'Single, multiple names',
    cfg: {name: ['wtb', 'foo'], connectionString: connStrings.local},
    db: 'wtb'
  },
  {
    test: 'Single, named diff',
    cfg: {name: 'wtb:foo', connectionString: connStrings.local},
    db: 'foo'
  }
]

debugger

function clearCache(){
  Object.keys(require.cache).forEach(key => delete require.cache[key])
}

samples.forEach(sample => {
  clearCache()

  describe(sample.test, () => {
    let sut = require('../index.js')
    it('connect', async () => {
      await sut.init([sample.cfg])

      let docs = await sut[sample.db].collection('coin').find().toArray()
      assert.isAbove(docs.length, 0)
    })

    it('close', async () => {
      await sut.close()
    })
  })
})

describe('Multiple', () => {
  clearCache()
  let sut = require('../index.js')
  it('connect', async () => {
    await sut.init([{
      name: 'wtb:foo', connectionString: connStrings.local
    }, {
      name: 'wtb:bar', connectionString: connStrings.local
    }])

    let docs = await sut.foo.collection('coin').find().toArray()
    assert.isAbove(docs.length, 0)
    console.log(`${docs.length} docs`)
  })
  it('close', async () => {
    await sut.close()
  })
})

describe('Slash separator', () => {
  clearCache()
  let sut = require('../index.js')
  it('connect', async () => {
    await sut.init([{name: 'wtb/foo', connectionString: connStrings.local}], {separator: '/'})

    let docs = await sut.foo.collection('coin').find().toArray()
    assert.isAbove(docs.length, 0)
  })

  it('close', async () => {
    await sut.close()
  })
})
