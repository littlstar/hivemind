'use strict'

const Hivemind = require('../')
const path = require('path')
const fs = require('fs')

// Initialize our job manager
const hivemind = new Hivemind({
  func: {
    name: 'glueFactory',
    role: '<arn of role>',
    handler: 'glueFactory.belt'  // <name of the script>.<exported function>
  },
  awsRegion: 'us-east-1',  // What region to execute your jobs in
  data: [ // Unchunked array of data you want jobs to run on.
    'Fluttershy',
    'Rarity',
    'Pinkie-Pie',
    'Applejack'
  ],
  chunkSize: 2  // How many pieces of data per job
})

// Publish the function as a Lambda function to your AWS
hivemind.publish({
  files: [
    'glueFactory.js'
  ]
})

// After creation
hivemind.on('create', () => {
  // Run the jobs
  hivemind.run()
})

// After a job has completed
hivemind.on('finish', (res) => {
  console.log(`Response: ${res}`)
})

// After all jobs have finished
hivemind.on('end', () => {
  console.log("Dear Celestia:...")
})

// If an error occurs in a job
hivemind.on('error', (err) => {
  console.log(`Error: ${err}`)
})