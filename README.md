## Hivemind

For creating distributed jobs using AWS Lambda functions.

### Install:

```npm install lambda-hivemind```

### Use:

```javascript
const Hivemind = require('lambda-hivemind')

const hivemind = new Hivemind({
  accessKeyId: '', // AWS credentials. Optional.
  secretAccessKey: '' // AWS credentials. Optional.
  awsRegion: 'us-east-1',
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

AWS credentials in constructor are only optional if you have the AWS CLI configured or have your credentials as environment variables!

Full example can be found under test/