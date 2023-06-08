const functions = require('@google-cloud/functions-framework');
const { encode } = require('blurhash')
const crypto = require('crypto');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { Canvas, loadImage } = require('canvas');
const { Storage } = require("@google-cloud/storage")
const { Firestore } = require('@google-cloud/firestore');

// Create a new client
const firestore = new Firestore({ projectId: "cosmic-anthem-386408" });
const gcs = new Storage({ projectId: "cosmic-anthem-386408" });

/**
 * Triggered from a change to a Cloud Storage bucket.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
functions.cloudEvent("encodeBlurHash", async (event, context) => {
  // TODO: Remove this when deploy
  event = event.data

  // Get file bucket
  const bucket = gcs.bucket(event.bucket);
  const blob = bucket.file(event.name);

  // Generate random filename
  const randomFileName = crypto.randomBytes(20).toString('hex');
  const tempLocalFile = path.join(os.tmpdir(), randomFileName);

  // Download image
  await blob.download({ destination: tempLocalFile });

  // Set canvas
  const imageWidth = 224;
  const imageHeight = 224;
  const canvas = new Canvas(imageWidth, imageHeight);
  const canvasCtx = canvas.getContext('2d');

  // Draw canvas
  const myImg = await loadImage(tempLocalFile);
  canvasCtx.drawImage(myImg, 0, 0);

  // Get canvas data
  const imageData = canvasCtx.getImageData(0, 0, imageWidth, imageHeight);

  // Get blurhash
  const hash = encode(imageData.data, imageWidth, imageHeight, 3, 3);

  // Save data
  const doc_id = path.basename(event.name)
  const doc_ref = firestore.collection("images").doc(doc_id)
  doc_ref.update({ 'blurHash': hash })

  // Cleanup
  fs.unlinkSync(tempLocalFile)
})