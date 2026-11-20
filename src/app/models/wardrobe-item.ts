export const WARDROBE_ITEM_TYPES = [
  'Top',
  'Bottom',
  'Dress',
  'Outerwear',
  'Shoes',
  'Accessory',
] as const;

export type WardrobeItemType = (typeof WARDROBE_ITEM_TYPES)[number];

/** A piece of clothing, stored in `data/db.json` via the local API. */
export interface WardrobeItem {
  /** Assigned by the API when the item is created. */
  id: string;
  name: string;
  type: WardrobeItemType;
  /** Hex values of the item's colors, matching `Color.hex` in `colors.json`. */
  colors: string[];
  /** Optional photo, as a resized JPEG data URL. */
  image?: string;
}

/** Data needed to create a new item (the API assigns the id). */
export type NewWardrobeItem = Omit<WardrobeItem, 'id'>;
