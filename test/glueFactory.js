'use strict'

exports.belt = function (event, context, callback) {
  const messages = []

  event.chunk.forEach(pony => {
    messages.push(`Yum, yum ${pony}`)
  })

  return callback(null, messages)
}