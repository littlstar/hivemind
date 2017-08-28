'use strict'

const Hivemind = require('../')
const path = require('path')
const fs = require('fs')

const hivemind = new Hivemind({
  funcName: 'glueFactory',
  data: [
    'Fluttershy',
    'Rarity',
    'Pinkie-Pie',
    'Applejack'
  ],
  chunkSize: 2
})

hivemind.publish({
  Code: {
    ZipFile: fs.readFileSync(path.resolve('glue-factory.zip'))
  },
  FunctionName: 'glueFactory',
  Handler: 'glueFactory.belt',
  Role: '[REPLACE WITH ROLE]',
  Runtime: 'nodejs6.10',
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