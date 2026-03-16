let is_picking = false
let highlighted_element = null
let SCALE_FACTOR = 4

let style_tag = document.createElement(`style`)
style_tag.textContent = `.grasshopper-highlight { outline: 3px solid #ff0044 !important; cursor: crosshair !important; box-sizing: border-box !important; }`
document.head.appendChild(style_tag)

let capture_upscaled_node = async (target_node) => {

  if (!target_node) {
    console.error(`Target node is missing`)
    return
  }

  let original_transform = target_node.style.transform
  let original_origin = target_node.style.transformOrigin
  let original_transition = target_node.style.transition

  target_node.style.transition = `none`
  target_node.style.transform = `scale(${SCALE_FACTOR})`
  target_node.style.transformOrigin = `top left`

  await new Promise(r => setTimeout(r, 150))

  let rect = target_node.getBoundingClientRect()

  let payload = {
    action: `process_capture`,
    dpr: window.devicePixelRatio,
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    }
  }

  await browser.runtime.sendMessage(payload)

  target_node.style.transform = original_transform
  target_node.style.transformOrigin = original_origin
  target_node.style.transition = original_transition
}

let handle_mouse_move = (event) => {

  if (!is_picking) {
    return
  }

  let target = event.target

  if (highlighted_element && (highlighted_element !== target)) {
    highlighted_element.classList.remove(`grasshopper-highlight`)
  }

  highlighted_element = target
  highlighted_element.classList.add(`grasshopper-highlight`)
}

let handle_click = (event) => {

  if (!is_picking) {
    return
  }

  else {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()

    is_picking = false

    if (highlighted_element) {
      highlighted_element.classList.remove(`grasshopper-highlight`)
    }

    capture_upscaled_node(highlighted_element)

    document.removeEventListener(`mousemove`, handle_mouse_move)
    document.removeEventListener(`click`, handle_click, true)
  }
}

let start_picking_mode = () => {
  is_picking = true
  document.addEventListener(`mousemove`, handle_mouse_move)
  document.addEventListener(`click`, handle_click, true)
}

browser.runtime.onMessage.addListener((message) => {

  if (message.action === `start_picking`) {
    start_picking_mode()
  }
})