## Hivemind

For creating distributed jobs using AWS Lambda functions.

### Install:

```bash
npm install lambda-hivemind
```

### Quick Example:

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

hivemind.on('end', () => {
  // All jobs have finished!
  process.exit(0)
})

hivemind.on('error', (err) => {
  console.log("Aww, man!")
})
```

## Methods

### constructor(params)

#### Parameters:
- `func` - Description of function
  - `name` - Name of the function
  - `handler` (optional) - Handler of function (If your file is named index and your function is named handler, your handler will be `index.handler`) (default: index.handler)
  - `role` - ARN of AWS Role to run function under
  - `runtime` (optional) - What framework to run function with (default: node6.10)
- `lambda` (optional) - Overload of AWS Lambda class
- `data` - Array of data to run on
- `chunkSize` - How many pieces of data to give to each function
- `accessKeyId` (optional) - AWS Access key
- `secretAccessKey` (optional) - AWS Secret key
- `awsRegion` - AWS region to execute your function in

### publish(params, awsParams = {})

Publishes or updates specified code as a Lambda function. This method is not required if the function has been previously published and does not need to updated.

#### Parameters:
  - `zipFile` - Relative path to ZIP file to publish as function. This method is required if your script has dependencies. See `Code.S3Key` below if your ZIP is over 10MB.
  - `files` - Array of relative paths to files to publish
  - `lambdaFunc` - JavaScript function to publish as your function. The function must use take 3 parameters (event, context, callback). Data is loaded under `event`, `callback` is called when function is done.

#### AWS Parameters:
  - `Code.S3Key` - Key for file to be used as code (Useful for using ZIP or script stored on S3. Required if your ZIP is over 10MB.)
  - Any parameter specified here: http://docs.aws.amazon.com/lambda/latest/dg/API_CreateFunction.html

### run()

Chunks and runs data given in constructor through the function specified in constructor and published in `publish()`

## Notes:

AWS credentials in constructor are only optional if you have the AWS CLI configured or have your credentials as environment variables!

Full example can be found under [`test/` folder](test).
