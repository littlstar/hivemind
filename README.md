## Hivemind

For creating distributed jobs using AWS Lambda functions.

### Install:

```npm install lambda-hivemind```

### Use:

```javascript
const Hivemind = require('lambda-hivemind')

const hivemind = new Hivemind({
  funcName: 'buzzbuzz',
    data: [
      'bee 1',
        'bee 2',
        'bee 3',
        ...
    ],
    chunkSize: 10  // Size of chunks to split data into
})

// Oh no, we haven't published a function of this name yet!

// All params here (http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#createFunction-property)
// are valid!
hivemind.publish({
  FunctionName: 'buzzbuzz'
  ...
})

hivemind.on('create', () => {
  // Ok, let's go!
  hivemind.run()
})

hivemind.on('finish', (results) => {
  // Each job's results will stream to here.
  console.log("Woah!")
})

hivemind.on('error', (err) => {
  console.log("Aww, man!")
})
```

Full example can be found under test/