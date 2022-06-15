import { ShapeFlags } from "../shared/ShapeFlags";

// slots挂载到实例上
export const initSlots = (component, slots) => {
  const { vnode } = component;
  if (vnode.shapeFlags & ShapeFlags.SLOT_CHILDREN) {
    normalizeObjectSlots(slots, component.slots)
  }
}


function normalizeObjectSlots(children: any, slots: any) {
  for (const key in children) {
    const value = children[key]
    slots[key] = (props) => normalizeSlotValue(value(props))
  }
}

function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value];
}
