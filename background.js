browser.action.onClicked.addListener((tab) => {
  let payload = {action: `start_picking`}
  browser.tabs.sendMessage(tab.id, payload)
})

browser.runtime.onMessage.addListener((message, sender) => {
  if (message.action === `process_capture`) {
    let capture_options = {format: `png`}

    return browser.tabs.captureVisibleTab(null, capture_options).then(async (image_uri) => {
      await crop_and_save(image_uri, message.rect, message.dpr)
      return {success: true}
    })
  }
})

let crop_and_save = async (image_uri, rect, dpr) => {
  let response = await fetch(image_uri)
  let blob = await response.blob()
  let img = await createImageBitmap(blob)
  let physical_x = Math.round(rect.x * dpr)
  let physical_y = Math.round(rect.y * dpr)
  let physical_width = Math.round(rect.width * dpr)
  let physical_height = Math.round(rect.height * dpr)
  let safe_x = Math.max(0, physical_x)
  let safe_y = Math.max(0, physical_y)
  let safe_width = Math.min(physical_width, img.width - safe_x)
  let safe_height = Math.min(physical_height, img.height - safe_y)

  if ((safe_width <= 0) || (safe_height <= 0)) {
    return
  }

  let canvas = new OffscreenCanvas(safe_width, safe_height)
  let ctx = canvas.getContext(`2d`)

  ctx.drawImage(
    img,
    safe_x,
    safe_y,
    safe_width,
    safe_height,
    0,
    0,
    safe_width,
    safe_height,
  )

  let final_blob = await canvas.convertToBlob({type: `image/png`})
  let blob_url = URL.createObjectURL(final_blob)

  let download_options = {
    url: blob_url,
    filename: `grasshopper_capture_${Date.now()}.png`
  }

  browser.downloads.download(download_options)
}