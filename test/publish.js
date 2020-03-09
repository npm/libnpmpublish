'use strict'

const t = require('tap')
const ssri = require('ssri')
const pacote = require('pacote')
const crypto = require('crypto')
const tnock = require('./fixtures/tnock.js')
const publish = require('../publish.js')
const cloneDeep = require('lodash.clonedeep')

const testDir = t.testdir({
  'package.json': JSON.stringify({
    name: 'libnpmpublish',
    version: '1.0.0'
  }, null, 2),
  'index.js': 'hello'
})

const OPTS = {
  registry: 'https://mock.reg/'
}

const REG = OPTS.registry

t.test('basic publish', async t => {
  const manifest = {
    name: 'libnpmpublish',
    version: '1.0.0',
    description: 'some stuff'
  }

  const tarData = await pacote.tarball(`file:${testDir}`)
  const shasum = crypto.createHash('sha1').update(tarData).digest('hex')
  const integrity = ssri.fromData(tarData, { algorithms: ['sha512'] })
  const packument = {
    _id: 'libnpmpublish',
    name: 'libnpmpublish',
    description: 'some stuff',
    'dist-tags': {
      latest: '1.0.0'
    },
    versions: {
      '1.0.0': {
        _id: 'libnpmpublish@1.0.0',
        _nodeVersion: process.versions.node,
        name: 'libnpmpublish',
        version: '1.0.0',
        description: 'some stuff',
        dist: {
          shasum,
          integrity: integrity.toString(),
          tarball: 'http://mock.reg/libnpmpublish/-/libnpmpublish-1.0.0.tgz'
        }
      }
    },
    readme: '',
    access: 'public',
    _attachments: {
      'libnpmpublish-1.0.0.tgz': {
        content_type: 'application/octet-stream',
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

  const ret = await publish(testDir, manifest, {
    ...OPTS,
    token: 'deadbeef'
  })
  t.ok(ret, 'publish succeeded')
})

t.test('scoped publish', async t => {
  const manifest = {
    name: '@claudiahdz/libnpmpublish',
    version: '1.0.0',
    description: 'some stuff'
  }

  const tarData = await pacote.tarball(`file:${testDir}`)
  const shasum = crypto.createHash('sha1').update(tarData).digest('hex')
  const integrity = ssri.fromData(tarData, { algorithms: ['sha512'] })
  const packument = {
    _id: '@claudiahdz/libnpmpublish',
    name: '@claudiahdz/libnpmpublish',
    description: 'some stuff',
    'dist-tags': {
      latest: '1.0.0'
    },
    versions: {
      '1.0.0': {
        _id: '@claudiahdz/libnpmpublish@1.0.0',
        _nodeVersion: process.versions.node,
        _npmVersion: '6.13.7',
        name: '@claudiahdz/libnpmpublish',
        version: '1.0.0',
        description: 'some stuff',
        dist: {
          shasum,
          integrity: integrity.toString(),
          tarball: 'http://mock.reg/@claudiahdz/libnpmpublish/-/@claudiahdz/libnpmpublish-1.0.0.tgz'
        }
      }
    },
    readme: '',
    access: 'restricted',
    _attachments: {
      '@claudiahdz/libnpmpublish-1.0.0.tgz': {
        content_type: 'application/octet-stream',
        data: tarData.toString('base64'),
        length: tarData.length
      }
    }
  }

  const srv = tnock(t, REG)
  srv.put('/@claudiahdz%2flibnpmpublish', body => {
    t.deepEqual(body, packument, 'posted packument matches expectations')
    return true
  }, {
    authorization: 'Bearer deadbeef'
  }).reply(201, {})

  const ret = await publish(testDir, manifest, {
    ...OPTS,
    npmVersion: '6.13.7',
    token: 'deadbeef'
  })
  t.ok(ret, 'publish succeeded')
})

t.test('retry after a conflict', async t => {
  const REV = '72-47f2986bfd8e8b55068b204588bbf484'
  const manifest = {
    name: 'libnpmpublish',
    version: '1.0.0',
    description: 'some stuff'
  }

  const tarData = await pacote.tarball(`file:${testDir}`)
  const shasum = crypto.createHash('sha1').update(tarData).digest('hex')
  const integrity = ssri.fromData(tarData, { algorithms: ['sha512'] })

  const basePackument = {
    name: 'libnpmpublish',
    description: 'some stuff',
    readme: '',
    access: 'public',
    _id: 'libnpmpublish',
    'dist-tags': {},
    versions: {},
    _attachments: {}
  }
  const currentPackument = cloneDeep({
    ...basePackument,
    time: {
      modified: new Date().toISOString(),
      created: new Date().toISOString(),
      '1.0.1': new Date().toISOString()
    },
    'dist-tags': { latest: '1.0.1' },
    versions: {
      '1.0.1': {
        _id: 'libnpmpublish@1.0.1',
        _nodeVersion: process.versions.node,
        _npmVersion: '13.7.0',
        name: 'libnpmpublish',
        version: '1.0.1',
        description: 'some stuff',
        dist: {
          shasum,
          integrity: integrity.toString(),
          tarball: 'http://mock.reg/libnpmpublish/-/libnpmpublish-1.0.1.tgz'
        }
      }
    },
    _attachments: {
      'libnpmpublish-1.0.1.tgz': {
        content_type: 'application/octet-stream',
        data: tarData.toString('base64'),
        length: tarData.length
      }
    }
  })
  const newPackument = cloneDeep({
    ...basePackument,
    'dist-tags': { latest: '1.0.0' },
    versions: {
      '1.0.0': {
        _id: 'libnpmpublish@1.0.0',
        _nodeVersion: process.versions.node,
        _npmVersion: '6.13.7',
        name: 'libnpmpublish',
        version: '1.0.0',
        description: 'some stuff',
        dist: {
          shasum,
          integrity: integrity.toString(),
          tarball: 'http://mock.reg/libnpmpublish/-/libnpmpublish-1.0.0.tgz'
        }
      }
    },
    _attachments: {
      'libnpmpublish-1.0.0.tgz': {
        content_type: 'application/octet-stream',
        data: tarData.toString('base64'),
        length: tarData.length
      }
    }
  })
  const mergedPackument = cloneDeep({
    ...basePackument,
    time: currentPackument.time,
    'dist-tags': { latest: '1.0.0' },
    versions: { ...currentPackument.versions, ...newPackument.versions },
    _attachments: { ...currentPackument._attachments, ...newPackument._attachments }
  })

  const srv = tnock(t, REG)
  srv.put('/libnpmpublish', body => {
    t.notOk(body._rev, 'no _rev in initial post')
    t.deepEqual(body, newPackument, 'got conflicting packument')
    return true
  }).reply(409, { error: 'gimme _rev plz' })

  srv.get('/libnpmpublish?write=true').reply(200, {
    _rev: REV,
    ...currentPackument
  })

  srv.put('/libnpmpublish', body => {
    t.deepEqual(body, {
      _rev: REV,
      ...mergedPackument
    }, 'posted packument includes _rev and a merged version')
    return true
  }).reply(201, {})

  const ret = await publish(testDir, manifest, {
    ...OPTS,
    token: 'deadbeef',
    npmVersion: '6.13.7'
  })

  t.ok(ret, 'publish succeeded')
})

t.test('retry after a conflict -- no versions on remote', async t => {
  const REV = '72-47f2986bfd8e8b55068b204588bbf484'
  const manifest = {
    name: 'libnpmpublish',
    version: '1.0.0',
    description: 'some stuff'
  }

  const tarData = await pacote.tarball(`file:${testDir}`)
  const shasum = crypto.createHash('sha1').update(tarData).digest('hex')
  const integrity = ssri.fromData(tarData, { algorithms: ['sha512'] })

  const basePackument = {
    name: 'libnpmpublish',
    description: 'some stuff',
    access: 'public',
    readme: '',
    _id: 'libnpmpublish'
  }
  const currentPackument = { ...basePackument }
  const newPackument = cloneDeep({
    ...basePackument,
    'dist-tags': { latest: '1.0.0' },
    versions: {
      '1.0.0': {
        _id: 'libnpmpublish@1.0.0',
        _nodeVersion: process.versions.node,
        _npmVersion: '6.13.7',
        name: 'libnpmpublish',
        version: '1.0.0',
        description: 'some stuff',
        dist: {
          shasum,
          integrity: integrity.toString(),
          tarball: 'http://mock.reg/libnpmpublish/-/libnpmpublish-1.0.0.tgz'
        }
      }
    },
    _attachments: {
      'libnpmpublish-1.0.0.tgz': {
        content_type: 'application/octet-stream',
        data: tarData.toString('base64'),
        length: tarData.length
      }
    }
  })
  const mergedPackument = cloneDeep({
    ...basePackument,
    'dist-tags': { latest: '1.0.0' },
    versions: { ...newPackument.versions },
    _attachments: { ...newPackument._attachments }
  })

  const srv = tnock(t, REG)
  srv.put('/libnpmpublish', body => {
    t.notOk(body._rev, 'no _rev in initial post')
    t.deepEqual(body, newPackument, 'got conflicting packument')
    return true
  }).reply(409, { error: 'gimme _rev plz' })

  srv.get('/libnpmpublish?write=true').reply(200, {
    _rev: REV,
    ...currentPackument
  })

  srv.put('/libnpmpublish', body => {
    t.deepEqual(body, {
      _rev: REV,
      ...mergedPackument
    }, 'posted packument includes _rev and a merged version')
    return true
  }).reply(201, {})

  const ret = await publish(testDir, manifest, {
    ...OPTS,
    npmVersion: '6.13.7',
    token: 'deadbeef'
  })

  t.ok(ret, 'publish succeeded')
})

t.test('version conflict', async t => {
  const REV = '72-47f2986bfd8e8b55068b204588bbf484'
  const manifest = {
    name: 'libnpmpublish',
    version: '1.0.0',
    description: 'some stuff'
  }

  const tarData = await pacote.tarball(`file:${testDir}`)
  const shasum = crypto.createHash('sha1').update(tarData).digest('hex')
  const integrity = ssri.fromData(tarData, { algorithms: ['sha512'] })
  const basePackument = {
    name: 'libnpmpublish',
    description: 'some stuff',
    readme: '',
    access: 'public',
    _id: 'libnpmpublish',
    'dist-tags': {},
    versions: {},
    _attachments: {}
  }
  const newPackument = cloneDeep(Object.assign({}, basePackument, {
    'dist-tags': { latest: '1.0.0' },
    versions: {
      '1.0.0': {
        _id: 'libnpmpublish@1.0.0',
        _nodeVersion: process.versions.node,
        _npmVersion: '6.13.7',
        name: 'libnpmpublish',
        version: '1.0.0',
        description: 'some stuff',
        dist: {
          shasum,
          integrity: integrity.toString(),
          tarball: 'http://mock.reg/libnpmpublish/-/libnpmpublish-1.0.0.tgz'
        }
      }
    },
    _attachments: {
      'libnpmpublish-1.0.0.tgz': {
        content_type: 'application/octet-stream',
        data: tarData.toString('base64'),
        length: tarData.length
      }
    }
  }))

  const srv = tnock(t, REG)
  srv.put('/libnpmpublish', body => {
    t.notOk(body._rev, 'no _rev in initial post')
    t.deepEqual(body, newPackument, 'got conflicting packument')
    return true
  }).reply(409, { error: 'gimme _rev plz' })

  srv.get('/libnpmpublish?write=true').reply(200, {
    _rev: REV,
    ...newPackument
  })

  try {
    await publish(testDir, manifest, {
      ...OPTS,
      npmVersion: '6.13.7',
      token: 'deadbeef'
    })
  } catch (err) {
    t.equal(err.code, 'EPUBLISHCONFLICT', 'got publish conflict code')
  }
})

t.test('refuse if package marked private', async t => {
  const manifest = {
    name: 'libnpmpublish',
    version: '1.0.0',
    description: 'some stuff',
    private: true
  }

  try {
    await publish(testDir, manifest, {
      ...OPTS,
      npmVersion: '6.9.0',
      token: 'deadbeef'
    })
  } catch (err) {
    t.equal(err.code, 'EPRIVATE', 'got correct error code')
  }
})

t.test('publish includes access', async t => {
  const manifest = {
    name: 'libnpmpublish',
    version: '1.0.0',
    description: 'some stuff'
  }

  const tarData = await pacote.tarball(`file:${testDir}`)
  const shasum = crypto.createHash('sha1').update(tarData).digest('hex')
  const integrity = ssri.fromData(tarData, { algorithms: ['sha512'] })
  const packument = {
    name: 'libnpmpublish',
    description: 'some stuff',
    readme: '',
    access: 'public',
    _id: 'libnpmpublish',
    'dist-tags': {
      latest: '1.0.0'
    },
    versions: {
      '1.0.0': {
        _id: 'libnpmpublish@1.0.0',
        _nodeVersion: process.versions.node,
        name: 'libnpmpublish',
        version: '1.0.0',
        description: 'some stuff',
        dist: {
          shasum,
          integrity: integrity.toString(),
          tarball: 'http://mock.reg/libnpmpublish/-/libnpmpublish-1.0.0.tgz'
        }
      }
    },
    _attachments: {
      'libnpmpublish-1.0.0.tgz': {
        content_type: 'application/octet-stream',
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

  const ret = await publish(testDir, manifest, {
    ...OPTS,
    token: 'deadbeef',
    access: 'public'
  })

  t.ok(ret, 'publish succeeded')
})

t.test('refuse if package is unscoped plus `restricted` access', async t => {
  const manifest = {
    name: 'libnpmpublish',
    version: '1.0.0',
    description: 'some stuff'
  }

  try {
    await publish(testDir, manifest, {
      ...OPTS,
      npmVersion: '6.13.7',
      access: 'restricted'
    })
  } catch (err) {
    t.equal(err.code, 'EUNSCOPED', 'got correct error code')
  }
})

t.test('refuse if bad semver on manifest', async t => {
  const manifest = {
    name: 'libnpmpublish',
    version: 'lmao',
    description: 'some stuff'
  }

  try {
    await publish(testDir, manifest, OPTS)
  } catch (err) {
    t.equal(err.code, 'EBADSEMVER', 'got correct error code')
  }
})

t.test('other error code', async t => {
  const manifest = {
    name: 'libnpmpublish',
    version: '1.0.0',
    description: 'some stuff'
  }

  const tarData = await pacote.tarball(`file:${testDir}`)
  const shasum = crypto.createHash('sha1').update(tarData).digest('hex')
  const integrity = ssri.fromData(tarData, { algorithms: ['sha512'] })
  const packument = {
    name: 'libnpmpublish',
    description: 'some stuff',
    readme: '',
    access: 'public',
    _id: 'libnpmpublish',
    'dist-tags': {
      latest: '1.0.0'
    },
    versions: {
      '1.0.0': {
        _id: 'libnpmpublish@1.0.0',
        _nodeVersion: process.versions.node,
        _npmVersion: '6.13.7',
        name: 'libnpmpublish',
        version: '1.0.0',
        description: 'some stuff',
        dist: {
          shasum,
          integrity: integrity.toString(),
          tarball: 'http://mock.reg/libnpmpublish/-/libnpmpublish-1.0.0.tgz'
        }
      }
    },
    _attachments: {
      'libnpmpublish-1.0.0.tgz': {
        content_type: 'application/octet-stream',
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
  }).reply(500, { error: 'go away' })

  try {
    await publish(testDir, manifest, {
      ...OPTS,
      npmVersion: '6.13.7',
      token: 'deadbeef'
    })
  } catch (err) {
    t.match(err.message, /go away/, 'no retry on non-409')
  }
})

t.test('error if not a directory', async t => {
  const folder = t.testdir({
    dummy: ''
  })

  const manifest = {
    name: 'libnpmpublish',
    version: '1.0.0',
    description: 'some stuff'
  }

  try {
    await publish(`${folder}/dummy`, manifest, OPTS)
  } catch (err) {
    t.equal(err.code, 'ENOTDIR', 'not a directory')
  }
})
