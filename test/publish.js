'use strict'

const crypto = require('crypto')
const figgyPudding = require('figgy-pudding')
const mockTar = require('./util/mock-tarball.js')
const ssri = require('ssri')
const { test } = require('tap')
const tnock = require('./util/tnock.js')

const publish = require('../publish.js')

const OPTS = figgyPudding({ registry: {} })({
  registry: 'https://mock.reg/'
})

const REG = OPTS.registry

test('basic publish', t => {
  const manifest = {
    name: 'libnpmpublish',
    version: '1.0.0',
    description: 'some stuff'
  }
  return mockTar({
    'package.json': JSON.stringify(manifest),
    'index.js': 'console.log("hello world")'
  }).then(tarData => {
    const shasum = crypto.createHash('sha1').update(tarData).digest('hex')
    const integrity = ssri.fromData(tarData, { algorithms: ['sha512'] })
    const packument = {
      name: 'libnpmpublish',
      description: 'some stuff',
      readme: '',
      _id: 'libnpmpublish',
      'dist-tags': {
        latest: '1.0.0'
      },
      versions: {
        '1.0.0': {
          _id: 'libnpmpublish@1.0.0',
          _nodeVersion: process.versions.node,
          _npmVersion: '6.9.0',
          name: 'libnpmpublish',
          version: '1.0.0',
          description: 'some stuff',
          dist: {
            shasum,
            integrity: integrity.toString(),
            tarball: `http://mock.reg/libnpmpublish/-/libnpmpublish-1.0.0.tgz`
          }
        }
      },
      _attachments: {
        'libnpmpublish-1.0.0.tgz': {
          'content_type': 'application/octet-stream',
          data: tarData.toString('base64'),
          length: tarData.length
        }
      }
    }
    const srv = tnock(t, REG)
    srv.put('/libnpmpublish', body => {
      t.deepEqual(body, packument, 'posted packument matches expectations')
      return true
    }, {
      authorization: 'Bearer deadbeef'
    }).reply(201, {})

    return publish(manifest, tarData, OPTS.concat({
      npmVersion: '6.9.0',
      token: 'deadbeef'
    })).then(() => {
      t.ok(true, 'publish succeeded')
    })
  })
})

test('scoped publish', t => {
  const manifest = {
    name: '@zkat/libnpmpublish',
    version: '1.0.0',
    description: 'some stuff'
  }
  return mockTar({
    'package.json': JSON.stringify(manifest),
    'index.js': 'console.log("hello world")'
  }).then(tarData => {
    const shasum = crypto.createHash('sha1').update(tarData).digest('hex')
    const integrity = ssri.fromData(tarData, { algorithms: ['sha512'] })
    const packument = {
      name: '@zkat/libnpmpublish',
      description: 'some stuff',
      readme: '',
      _id: '@zkat/libnpmpublish',
      'dist-tags': {
        latest: '1.0.0'
      },
      versions: {
        '1.0.0': {
          _id: '@zkat/libnpmpublish@1.0.0',
          _nodeVersion: process.versions.node,
          _npmVersion: '6.9.0',
          name: '@zkat/libnpmpublish',
          version: '1.0.0',
          description: 'some stuff',
          dist: {
            shasum,
            integrity: integrity.toString(),
            tarball: `http://mock.reg/@zkat/libnpmpublish/-/@zkat/libnpmpublish-1.0.0.tgz`
          }
        }
      },
      _attachments: {
        '@zkat/libnpmpublish-1.0.0.tgz': {
          'content_type': 'application/octet-stream',
          data: tarData.toString('base64'),
          length: tarData.length
        }
      }
    }
    const srv = tnock(t, REG)
    srv.put('/@zkat%2flibnpmpublish', body => {
      t.deepEqual(body, packument, 'posted packument matches expectations')
      return true
    }, {
      authorization: 'Bearer deadbeef'
    }).reply(201, {})

    return publish(manifest, tarData, OPTS.concat({
      npmVersion: '6.9.0',
      token: 'deadbeef'
    })).then(() => {
      t.ok(true, 'publish succeeded')
    })
  })
})
