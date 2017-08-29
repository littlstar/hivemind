'use strict'

const Lambda = require('aws-sdk/clients/lambda')
const EventEmitter = require('events')
const through2 = require('through2')
const zip = require('yazl')

/**
 * Create distributed jobs using AWS Lambda functions
 *
 * @type {Class}
 */

module.exports = class Hivemind extends EventEmitter {
  constructor(params) {
    super()

    this.func = params.func
    this.lambda = new Lambda({
      AccessKeyId: params.accessKeyId,
      SecretAccessKey: params.secretAccessKey,
      region: params.awsRegion
    })

    // Chunk the data into individual arrays for processing
    this.chunks = []
    params.data.forEach((item, index) => {

      // If chunk doesn't exist yet, create it.
      if (!this.chunks[index % params.chunkSize]) {
        this.chunks[index % params.chunkSize] = []
      }

      this.chunks[index % params.chunkSize].push(item)
    })
  }

  /**
   * Publishes the ZIP file as a Lambda function
   *
   * @param  {String} zipFile Fully-qualified path to ZIP file containing script
   */

  publish(params, awsParams) {
    if (!params.files || params.files.length === 0) {
      throw new Error('You must specify files to publish a function')
    }

    // Build ZIP file stream from passed functions
    const file = new zip.ZipFile()

    // Add files to zip file
    params.files.forEach(filePath => file.addFile(filePath, filePath))

    // Signal that there are no more files
    file.end()

    // Array to contain buffers
    let buff = Buffer.alloc(0)

    // We have to pipe the stream through 'through' so we can extract
    // the buffers that are contained in the stream
    file.outputStream
      .pipe(through2((chunk, _, callback) => {

        // Push buffers to buffer
        buff = Buffer.concat([buff, chunk])
        return callback()
      }))
      .on('finish', () => {

        // Merge parameters and AWS parameters
        // This is so add'l that only AWS cares about can be passed
        const mergedParams = Object.assign({
          Code: {
            ZipFile: buff
          },
          FunctionName: this.func.name,
          Handler: this.func.handler || 'index.handler',
          Role: this.func.role,
          Runtime: this.func.runtime || 'nodejs6.10'
        }, awsParams)

        // Check if function already exists!
        // This determines whether we will create or update the function
        this.lambda.getFunction({
          FunctionName: mergedParams.FunctionName
        }, (err) => {
          const deployCallback = (error) => {
            if (err) {
              return this.emit('error', error)
            }

            return this.emit('create')
          }

          if (err) {
            if (err.statusCode === 404) {
              this.lambda.createFunction(mergedParams, deployCallback)
            } else {
              this.emit('error', err)
            }
          }

          this.lambda.updateFunctionCode({
            FunctionName: mergedParams.FunctionName,
            ZipFile: mergedParams.Code.ZipFile
          }, deployCallback)
        })
      })
  }

  /**
   * Launches functions and passes chunked data that was passed into the construtor
   */

  run() {
    this.chunks.forEach((chunk) => {
      this.lambda.invoke({
        FunctionName: this.funcName,
        Payload: JSON.stringify({
          chunk
        })
      }, (err, data) => {
        if (err) {
          return this.emit('error', err)
        }

        return this.emit('finish', data.Payload)
      })
    })
  }
}
