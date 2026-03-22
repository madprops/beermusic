let is_picking = false
let highlighted_element = null
let scale_factor = 4
let render_delay_ms = 500
let style_tag = document.createElement(`style`)
style_tag.textContent = `.grasshopper-highlight { outline: 3px solid #ff0044 !important; cursor: crosshair !important; box-sizing: border-box !important; } .grasshopper-no-scroll, .grasshopper-no-scroll * { scrollbar-width: none !important; } .grasshopper-no-scroll::-webkit-scrollbar, .grasshopper-no-scroll *::-webkit-scrollbar { display: none !important; }`
document.head.appendChild(style_tag)

let get_opaque_background = (node) => {
  let current = node

  while (current) {
    let bg = window.getComputedStyle(current).backgroundColor

    if (bg !== `rgba(0, 0, 0, 0)` && bg !== `transparent`) {
      return bg
    }

    current = current.parentElement
  }

  return `white`
}

let capture_upscaled_node = async (target_node) => {
  if (!target_node) {
    console.error(`Target node is missing`)
    return
  }

  let unscaled_rect = target_node.getBoundingClientRect()
  let opaque_bg = get_opaque_background(target_node)
  let max_scale_x = window.innerWidth / unscaled_rect.width
  let max_scale_y = window.innerHeight / unscaled_rect.height
  let safe_scale = Math.min(scale_factor, max_scale_x, max_scale_y)

  if (safe_scale < 1) {
    safe_scale = 1
  }

  let ancestors = []
  let curr = target_node.parentElement

  while (curr && curr !== document.body && curr !== document.documentElement) {
    let style = window.getComputedStyle(curr)

    if (style.overflow !== `visible` || style.overflowX !== `visible` || style.overflowY !== `visible`) {
      ancestors.push({node: curr, overflow: curr.style.getPropertyValue(`overflow`)})
      curr.style.setProperty(`overflow`, `visible`, `important`)
    }

    curr = curr.parentElement
  }

  let original_transform = target_node.style.transform
  let original_origin = target_node.style.transformOrigin
  let original_transition = target_node.style.transition
  let original_bg = target_node.style.backgroundColor
  let original_z_index = target_node.style.zIndex
  let original_position = target_node.style.position
  let translate_x = -unscaled_rect.left
  let translate_y = -unscaled_rect.top
  document.documentElement.classList.add(`grasshopper-no-scroll`)

  target_node.style.transition = `none`
  target_node.style.position = `relative`
  target_node.style.zIndex = `2147483647`
  target_node.style.transformOrigin = `top left`
  target_node.style.transform = `translate(${translate_x}px, ${translate_y}px) scale(${safe_scale})`
  target_node.style.backgroundColor = opaque_bg
  await new Promise(r => setTimeout(r, render_delay_ms))
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
  target_node.style.backgroundColor = original_bg
  target_node.style.zIndex = original_z_index
  target_node.style.position = original_position
  document.documentElement.classList.remove(`grasshopper-no-scroll`)

  for (let i = 0; i < ancestors.length; i++) {
    let anc = ancestors[i]
    anc.node.style.setProperty(`overflow`, anc.overflow)

    if (!anc.overflow) {
      anc.node.style.removeProperty(`overflow`)
    }
  }
}

let handle_mouse_move = (event) => {
  if (!is_picking) {
    return
  }

  let target = event.target

  if (highlighted_element && highlighted_element !== target) {
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