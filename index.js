'use strict'

const Lambda = require('aws-sdk/clients/lambda')
const EventEmitter = require('events')
const through2 = require('through2')
const path = require('path')
const zip = require('yazl')
const fs = require('fs')

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

    const publishFunc = (code) => {
      // Merge parameters and AWS parameters
      // This is so add'l that only AWS cares about can be passed
      const mergedParams = Object.assign({
        Code: {
          ZipFile: code
        },
        FunctionName: this.func.name,
        Handler: this.func.handler || 'index.handler',
        Role: this.func.role,
        Runtime: this.func.runtime || 'nodejs6.10'
      }, awsParams || {})

      // Check if function already exists!
      // This determines whether we will create or update the function
      this.lambda.getFunction({
        FunctionName: mergedParams.FunctionName
      }, (err, res) => {
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
          FunctionName: res.Configuration.FunctionArn,
          ZipFile: mergedParams.Code.ZipFile
        }, deployCallback)
      })
    }

    if (params.zipFile) {
      publishFunc(fs.readFileSync(path.resolve(params.zipFile)))
    } else if (params.files) {
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
          publishFunc(buff)
        })
    } else if (awsParams.Code.S3Key) {
      publishFunc()
    } else {
      throw new Error('You have to specify a code location to publish a function')
    }
  }

  /**
   * Launches functions and passes chunked data that was passed into the construtor
   */

  run() {
    const promises = this.chunks.map((chunk) => {
      return new Promise((resolve, reject) => {
        this.lambda.invoke({
          FunctionName: this.func.name,
          Payload: JSON.stringify({
            chunk
          })
        }, (err, data) => {
          if (err) {
            return reject(err) && this.emit('error', err)
          }

          resolve()
          return this.emit('finish', data.Payload)
        })
      })
    })

    Promise.all(promises)
      .then(() => {
        this.emit('end')
      })
  }
}
