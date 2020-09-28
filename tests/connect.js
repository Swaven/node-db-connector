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

const samples = [
  {
    test: 'Single, no name, local',
    cfg : {connectionString: connStrings.stg_local},
    db: 'wtb'
  },
  {
    test: 'Single, named, admin',
    cfg : {name: 'wtb', connectionString: connStrings.stg_admin},
    db: 'wtb'
  },
  {
    test: 'Single, named same, local',
    cfg: {name: 'wtb', connectionString: connStrings.stg_local},
    db: 'wtb'
  },
  {
    test: 'Single, aliased, local',
    cfg: {name: 'wtb:coin', connectionString: connStrings.stg_local},
    db: 'coin'
  },
  {
    test: 'Single, aliased, admin',
    cfg: {name: 'wtb:coin', connectionString: connStrings.stg_admin},
    db: 'coin'
  },
  {
    test: 'Multiple names, local',
    cfg: {name: ['wtb', 'catalog'], connectionString: connStrings.stg_local},
    db: 'wtb'
  },
  {
    test: 'Multiple names, admin',
    cfg: {name: ['wtb', 'catalog'], connectionString: connStrings.stg_admin},
    db: 'wtb'
  },
  {
    test: 'Multiple, named diff',
    cfg: {name: ['wtb:foo', 'affiliate'], connectionString: connStrings.stg_local},
    db: 'foo'
  }
]


function clearCache(){
  Object.keys(require.cache).forEach(key => delete require.cache[key])
}

samples.forEach(sample => {
  clearCache()

  describe(sample.test, () => {
    let sut = require('../index.js')
    it('connect', async () => {
      await sut.init([sample.cfg])

      let docs = await sut[sample.db].collection('widget_confs').find().limit(5).toArray()
      assert.isAbove(docs.length, 0)
    })

    it('close', async () => {
      await sut.close()
    })
  })
})

// use another db than the one in auth
describe('Single, other DB, local', () => {
  clearCache()
  let sut = require('../index.js')
  it('connect', async () => {
    await sut.init([{name: 'affiliate', connectionString: connStrings.stg_local}])

    let docs = await sut.affiliate.collection('collect_tasks').find().limit(10).toArray()
    assert.isAbove(docs.length, 0)
  })

  it('close', async () => {
    await sut.close()
  })
})

describe('Single, no name', () => {
  clearCache()
  let sut = require('../index.js')
  it('connect', async () => {
    let error = null
    try{
      await sut.init([{
        connectionString: connStrings.stg_nodefault
      }])
    }
    catch(ex){
      error = ex
    }
    assert.isNotNull(error)
  })
})

describe('Multiple aliased, local', () => {
  clearCache()
  let sut = require('../index.js')
  it('connect', async () => {
    await sut.init([{
      name: 'wtb:foo', connectionString: connStrings.stg_local
    }, {
      name: 'wtb:bar', connectionString: connStrings.stg_admin
    }])

    let docs = await sut.foo.collection('widget_confs').find().limit(5).toArray()
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
    await sut.init([{name: 'wtb/foo', connectionString: connStrings.stg_admin}], {separator: '/'})

    let docs = await sut.foo.collection('widget_confs').find().limit(5).toArray()
    assert.isAbove(docs.length, 0)
  })

  it('close', async () => {
    await sut.close()
  })
})

describe('chained inits', () => {
  const sut = require('../index.js')
  it('reinit', () => {
    return sut.init([{connectionString: connStrings.stg_local}])
    .then(() => {
      return sut.close()
    })
    .then(() => {
      return sut.init([{connectionString: connStrings.stg_local}])
    })
    .then(() => {
      return sut.close()
    })
  })
})
