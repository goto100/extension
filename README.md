# Extension.js

为node提供扩展机制

```
require('extensions.js').init(module, ['./extensions/a', './extensions/b']);
```

将自动依次加载extension中的同名文件
