'use strict'

const Hivemind = require('../')
const path = require('path')
const fs = require('fs')

const hivemind = new Hivemind({
  func: {
    name: 'glueFactory',
    role: '<arn of role>',
    handler: 'glueFactory.belt'
  },
  awsRegion: 'us-east-1',
  data: [
    'Fluttershy',
    'Rarity',
    'Pinkie-Pie',
    'Applejack'
  ],
  chunkSize: 2
})

hivemind.publish({
  files: [
    'glueFactory.js'
  ]
})

hivemind.on('create', () => {
  hivemind.run()
})

hivemind.on('finish', (res) => {
  console.log(`Response: ${res}`)
})

hivemind.on('error', (err) => {
  console.log(`Error: ${err}`)
})