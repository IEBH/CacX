@IEBH/CACX
==========
Intentionally simple XML parser designed for minimal dependency and speed.


API
===


new CacxParser(options)
-----------------------
Initalize the parser with options.

```javascript
import Parser from '@iebh/cacx';
// OR
import {CacxParser} from '@iebh/cacx';

let parser = new Parser()
    .append('<a><b><c>Hello World</c></b></a>')
    .exec()
    .value() //= `{tag: 'a', children: ...}`
```


CacxParser.append(input)
------------------------
Append (or set) string content to be parsed.
Returns the CacxParser instance.


CacxParser.exec()
-----------------
Parse the existing buffer into XML. Can be called after each `append()` to drain the buffer.
This function should be called at least once prior to `value()`.
Returns the CacxParser instance.


flatten()
---------
Process the current stack into a logical do-the-right-thing data structure.
See the various `settings.flatten*` options to configure the behaviour here.
Returns the CacxParser instance.


CacxParser.value()
------------------
Returns the parsed XML stack.
This will throw if `settings.collect` is falsy.
Returns the nested object stack.


parse(input, options)
---------------------
Simple all-in-one string parser helper.

```javascript
import {parser} from '@iebh/cacx';

parse('<a><b><c>Hello World</c></b></a>') //= `{tag: 'a', children: ...}`
```

parseFile(path, options)
------------------------
Helper for streaming file inputs into the parser.

```javascript
import {parseFile} from '@iebh/cacx';

parseFile('./file.xml') //= `{tag: 'a', children: ...}`
```


parseCollectionFile(path, tags, options)
----------------------------------------
Helper to stream a file and run a callback when a named tag closes.

```javascript
import {parseCollectionFile} from '@iebh/cacx';

parseCollectionFile(
    './file.xml',
    {
        record(node) {
            // Node should represent the state of any `record` element within the XML
        },
    },
    { // Other options
        flatten: true, // Try to flatten the output into a logical JavaScript object
    },
);
```
