const path = require('path')
const os = require('os')
const fs = require('fs')
const { encode } = require('blurhash')
const { Canvas, loadImage } = require('canvas')
const { Storage } = require("@google-cloud/storage")
const { Firestore } = require('@google-cloud/firestore')

// Create a new client
const firestore = new Firestore({ projectId: "cosmic-anthem-386408" })
const gcs = new Storage({ projectId: "cosmic-anthem-386408" })

/**
 * Triggered by a change to a Firestore document.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
exports.encodeBlurHash = async (event, context) => {
  console.log("Processing: ", JSON.stringify(context.resource))

  // Get resource
  const resource = event.value.name
  const id = event.value.fields.filename.stringValue
  const affectedDoc = firestore.doc(resource.split('/documents/')[1])

  // Get file bucket
  const bucket = gcs.bucket("cs23-ps414-images-bkt")
  const blob = bucket.file("images/" + id)

  // Generate random filename
  const tempLocalFile = path.join(os.tmpdir(), id)

  // Download image
  await blob.download({ destination: tempLocalFile })

  // Set canvas
  const imageWidth = 224
  const imageHeight = 224
  const canvas = new Canvas(imageWidth, imageHeight)
  const canvasCtx = canvas.getContext('2d')

  // Draw canvas
  const myImg = await loadImage(tempLocalFile)
  canvasCtx.drawImage(myImg, 0, 0)

  // Get canvas data
  const imageData = canvasCtx.getImageData(0, 0, imageWidth, imageHeight)

  // Get blurhash
  const hash = encode(imageData.data, imageWidth, imageHeight, 3, 3)

  // Save data
  affectedDoc.update({ 'blurHash': hash })

  // Cleanup
  fs.unlinkSync(tempLocalFile)
}
