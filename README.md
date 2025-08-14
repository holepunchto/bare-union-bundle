# bare-union-bundle

Union bundle

```
npm install bare-union-bundle
```

## Usage

``` js
const UnionBundle = require('bare-union-bundle')

const b = UnionBundle.require('./0.bundle', './1.bundle', './2.bundle')

const layer = b.add(new URL('file://root-of-project'), 'entrypoint.js')
// store as 3.bundle or whatever

// load entrypoint.js from bundle 1, union back to root
const mod1 = b.load(new URL('file://root-of-project'), 'entrypoint.js', 1)

// load entrypoint.js from bundle 2, union back to root
const mod2 = b.load(new URL('file://root-of-project'), 'entrypoint.js', 2)
```

## API

#### `const b = new UnionBundle(bundles)`

Create a union of the `bundles`, an array of [Bundles](https://github.com/holepunchto/bare-bundle).

#### `const b = UnionBundle.require(files)`

Shortcut for creating a `UnionBundle` from file paths (`files`) automatically reading them as Bundles.

#### `const layer = await b.add(root, entrypoint, opts = {})`

Create a new layer bundle for an `entrypoint` skipping modules referenced in the existing bundles in the `UnionBundle`. `root` is a `URL` for the root of the `entrypoint`, aka it contains the `node_modules` directory where dependencies are installed.

`opts` includes:

```
{
  skipModules: true // skip bundling dependencies in `node_modules` in `root`
}
```

A layer bundle can be loaded by creating the union with the previous layer bundles via the `UnionBundle` constructor and loading via the union's `load()`. For example:

```js
// Creating
const b = UnionBundle.require('./0.bundle', './1.bundle', './2.bundle')

const layer = b.add(new URL('file://root-of-project'), 'entrypoint.js')
await fs.writeFile('./3.bundle', layer.toBuffer())

// Loading
const b = UnionBundle.require('./0.bundle', './1.bundle', './2.bundle', './3.bundle')
const mod = b.load(new URL('file://root-of-project'), 'entrypoint.js')
```

#### `const bundle = b.checkout(index)`

Create a Bundle resolving all dependencies at the provided `index`.

Example:

```
const past = UnionBundle.require('./0.bundle', './1.bundle', './2.bundle')
const mod1 = past.checkout(1) // returns a resolved bundle combining `1.bundle` & `0.bundle`
```

#### `const mod = b.load(root, entrypoint, index, opts = {})`

Load `entrypoint` (relative to `root`) from the bundle at the provided checkout `index`.

`opts` includes:

```
{
  cache: require.cache, // the module cache to load the entrypoint with
  skipModules: true // skip loading dependencies from `node_modules` in bundle if they are in the cache
}
```

## License

Apache-2.0
