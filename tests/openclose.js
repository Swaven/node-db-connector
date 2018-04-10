'use strict'

const chai = require('chai'),
      assert = chai.assert,
      sut = require('../index.js')

describe('reinit', () => {
  it('reinit', () => {
    return sut.init([{connectionString: 'mongodb://localhost:27017/wtb'}])
    .then(() => {
      return sut.close()
    })
    .then(() => {
      return sut.init([{connectionString: 'mongodb://localhost:27017/wtb'}])
    })
    .then(() => {
      return sut.close()
    })
  })
})
