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

## License

Apache-2.0
