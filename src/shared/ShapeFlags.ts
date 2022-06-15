export const enum ShapeFlags {
  ELEMENT = 1,
  COMPONENT_STATEFUL = 1 << 1,
  TEXT_CHILDREN = 1 << 2,
  ARRAY_CHILDREN = 1 << 3,
  SLOT_CHILDREN = 1 << 4
}