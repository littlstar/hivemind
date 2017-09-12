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
    this.chunks = [[]]
    let currentChunk = 0
    params.data.forEach((item) => {

      // If chunk doesn't exist yet, create it.
      if (this.chunks[currentChunk].length === params.chunkSize) {

        // Overly clever way of saying: increment `currentChunk` then use the incremented value
        this.chunks[++currentChunk] = []
      }

      this.chunks[currentChunk].push(item)
    })
  }

  /**
   * Publishes the ZIP file as a Lambda function. Can be passed `files` or
   * `zipFile` to specify how the code is packaged.
   *
   * `zipFile` means that the code has been pre-packaged into a ZIP file and the string is the
   * relative location of the file.
   *
   * `files` is an array of files to be built
   * into a ZIP file dynamically.
   *
   * Note: dynamic ZIP file creation cannot include
   * folders currently.
   *
   * @param {Object} params Parameters for publishing function
   * @param {Object} [awsParams] Parameters specified in AWS documentation that overrides
   *                               or supplements parameters
   */

  publish(params, awsParams) {

    const publishFunc = (code) => {

      // Merge parameters and AWS parameters
      // This is so add'l parameters that only AWS cares about can be passed
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

          // If the function doesn't exist, create it.
          if (err.statusCode === 404) {
            return this.lambda.createFunction(mergedParams, deployCallback)
          } else {
            return this.emit('error', err)
          }
        } else {
          // If the function exists, we should update the code
          this.lambda.updateFunctionCode({
            FunctionName: res.Configuration.FunctionArn,
            ZipFile: mergedParams.Code.ZipFile
          }, deployCallback)
        }
      })
    }

    // Is ZIP file
    if (params.zipFile) {
      publishFunc(fs.readFileSync(path.resolve(params.zipFile)))

      // ZIP file should be created dynamically
    } else if (params.files) {

      const file = new zip.ZipFile()
      params.files.forEach(filePath => file.addFile(filePath, filePath))

      // Signal that there are no more files
      file.end()

      // Initialize an empty buffer
      let buff = Buffer.alloc(0)

      // We have to pipe the stream through 'through' so we can extract
      // the buffers that are contained in the stream
      file.outputStream
        .pipe(through2((chunk, _, callback) => {

          // Add each chunk to a single buffer
          buff = Buffer.concat([buff, chunk])
          return callback()
        }))
        .on('finish', () => {
          publishFunc(buff)
        })

      // Find the files on S3
    } else if (awsParams.Code.S3Key) {
      publishFunc()
    } else {

      // Otherwise, the user has done something wrong.
      throw new Error('You have to specify a code location to publish a function')
    }
  }

  /**
   * Launches jobs using the chunked data as parameters for each job
   */

  run() {

    // Promises allow us to track the completion of each job.
    // These are only internal and are used for triggering the on('end') event
    const promises = this.chunks.map(chunk =>
      new Promise((resolve, reject) => {
        this.lambda.invoke({
          FunctionName: this.func.name,
          Payload: JSON.stringify({
            chunk
          })
        }, (err, data) => {
          if (err) {
            reject(err)
            return this.emit('error', err)
          }

          resolve()
          return this.emit('finish', data.Payload)
        })
      }))

    // After all the jobs finish, emit 'end'
    Promise.all(promises)
      .then(() => {
        this.emit('end')
      })
  }
}
