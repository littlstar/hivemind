'use strict'

const Lambda = require('aws-sdk/clients/lambda')
const EventEmitter = require('events')

module.exports = class Hivemind extends EventEmitter {
  constructor(params) {
    super()

    this.funcName = params.funcName
    this.lambda = new Lambda({
      AccessKeyId: params.accessKeyId,
      SecretAccessKey: params.secretAccessKey,
      region: 'us-east-1'
    })

    // Chunk the data into individual arrays for processing
    this.chunks = []
    params.data.forEach((item, index) => {
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

  publish(params) {
    this.lambda.createFunction(params, (err, data) => {
      if (err) {
        return this.emit('error', err)
      }

      return this.emit('create')
    })
  }

  /**
   * Launches functions
   */

  run() {
    this.chunks.forEach(chunk => {
      // Launch function
      this.lambda.invoke({
        FunctionName: this.funcName,
        Payload: JSON.stringify({
          chunk
        })
      }, (err, data) => {
        if (err) {
          return this.emit('error', err)
        }

        this.emit('finish', data.Payload)
      })
    })
  }
}