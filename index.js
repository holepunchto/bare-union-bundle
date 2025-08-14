const traverse = require('bare-module-traverse')
const Bundle = require('bare-bundle')
const Module = require('bare-module')
const { fileURLToPath } = require('url')
const fs = require('fs')
const b4a = require('b4a')

module.exports = class UnionBundle {
  constructor (bundles) {
    this.bundles = bundles
  }

  static require (...files) {
    const bundles = files.map(f => Bundle.from(fs.readFileSync(f)))
    return new UnionBundle(bundles)
  }

  get (key) {
    for (let i = this.bundles.length - 1; i >= 0; i--) {
      const source = this.bundles[i].read(key)
      if (!source) continue
      return {
        source,
        imports: this.bundles[i].resolutions[key] || {}
      }
    }
    return null
  }

  checkout (n = this.bundles.length - 1) {
    const bundle = new Bundle()

    for (let i = n; i >= 0; i--) {
      const b = this.bundles[i]
      for (const k of b.keys()) {
        const has = bundle.read(k)
        if (has) continue
        bundle.write(k, b.read(k))
        const resolutions = b.resolutions[k]
        bundle.resolutions[k] = resolutions
      }
    }

    return bundle
  }

  async add (root, entry, { skipModules = true } = {}) {
    if (!root.pathname.endsWith('/')) root = new URL('./', root)

    const nodeModules = new URL('./node_modules', root)
    const bundle = new Bundle()

    const resolutions = {}

    for await (const dependency of traverse(
      new URL(entry, root),
      { resolve: traverse.resolve.bare },
      readModule,
      listPrefix
    )) {
      if (dependency.url.href.startsWith(nodeModules.href) && skipModules) continue

      const p = dependency.url.pathname.replace(root.pathname, '/')
      const imps = {}
      for (const [k, v] of Object.entries(dependency.imports)) {
        imps[k] = new URL(v).pathname.replace(root.pathname, '/')
      }

      const existing = this.get(p)
      if (existing && b4a.equals(existing.source, dependency.source) && sameImports(existing.imports, imps)) continue

      bundle.write(p, dependency.source)
      resolutions[p] = imps
    }

    bundle.resolutions = resolutions
    return bundle
  }

  load (root, entry, checkout, { cache = require.cache, skipModules = true } = {}) {
    const b = this.checkout(checkout)

    const protocol = new Module.Protocol({
      exists (url) {
        return true
      },
      read (url) {
        const p = url.pathname
        return b.read(p)
      }
    })

    const bundleCache = Object.create(null)
    const resolutions = Object.create(null)

    for (const [id, map] of Object.entries(b.resolutions)) {
      const m = {}
      for (const [k, v] of Object.entries(map)) {
        const nm = new URL('.' + v, root).href
        if (skipModules && v.startsWith('/node_modules/') && cache[nm]) {
          m[k] = 'bundle://host' + v
          bundleCache[m[k]] = cache[nm]
        } else {
          m[k] = 'bundle://layer' + v
        }
      }
      resolutions['bundle://layer' + id] = m
    }

    return Module.load(new URL(entry, 'bundle://layer/'), {
      protocol,
      resolutions,
      cache: bundleCache
    })
  }
}

function sameImports (a, b) {
  const x = Object.keys(a)
  const y = Object.keys(b)

  if (x.length !== y.length) return false

  for (let i = 0; i < x.length; i++) {
    if (a[x[i]] !== b[x[i]]) return false
  }

  return true
}

async function readModule (url) {
  return new Promise((resolve) => {
    fs.readFile(fileURLToPath(url), (err, data) => {
      resolve(err ? null : data)
    })
  })
}

async function openDir (url) {
  return new Promise((resolve, reject) => {
    fs.opendir(fileURLToPath(url), (err, dir) => {
      err ? reject(err) : resolve(dir)
    })
  })
}

async function isFile (url) {
  return new Promise((resolve) => {
    fs.stat(fileURLToPath(url), (err, stat) => {
      resolve(err !== null || stat.isFile())
    })
  })
}

async function * listPrefix (url) {
  if (await isFile(url)) return yield url

  if (url.pathname[url.pathname.length - 1] !== '/') {
    url.pathname += '/'
  }

  for await (const entry of await openDir(url)) {
    if (entry.isDirectory()) {
      yield * listPrefix(new URL(entry.name, url))
    } else {
      yield new URL(entry.name, url)
    }
  }
}
