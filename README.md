# Extension.js

extendable node require.

## Example

file `./app/a.js`:

```
module.exports = 1;
```

file `./extension/a.js`:

```
module.extending.exports = 2;
```

```
require('extension.js').init(module, './app', ['./extension']);
require('./app/a'); // ==> 2, not 1
```

## requireAll

files:

./app/commands/a.js
./extension/commands/b.js

```
require('extension.js').init(module, './app', ['./extension']);

module.requireAll('./commands', function(err, commands) {
	// commands ==> {a: {}, b: {}}
});
```