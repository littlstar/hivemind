## Hivemind

For creating distributed jobs using AWS Lambda functions.

### Install:

```npm install lambda-hivemind```

### Use:

```javascript
const Hivemind = require('lambda-hivemind')

const hivemind = new Hivemind({
  func: {
    name: 'buzzbuzz',
    handler: 'buzzbuzz.sting',  // '<name of file>.<exported func name>'
    role: '<arn of IAM role to run function under>'
  },
  accessKeyId: '', // AWS credentials. Optional.
  secretAccessKey: '' // AWS credentials. Optional.
  awsRegion: 'us-east-1',
  data: [
    'bee 1',
    'bee 2',
    'bee 3',
    ...
  ],
  chunkSize: 10  // Size of chunks to split data into
})

// Oh no, we haven't published a function of this name yet!

// List all files you want published as your function
hivemind.publish({
  files: [
    'buzzbuzz.js'
  ]
}, {
  // Any AWS parameters specified under http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#createFunction-property
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

AWS credentials in constructor are only optional if you have the AWS CLI configured or have your credentials as environment variables!

Full example can be found under `test/`