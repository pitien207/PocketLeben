import type { NpcDef, Outfit } from '../../../data/npcs'

/**
 * 1.41 Guests and helpers in the shop rooms: no dialogue (not interactive), only there so a phở shop at noon is
 * full and the bank has a queue. Each room picks by index; ids are made unique per room.
 */
const LOOKS: Outfit[] = [
  { skin: '#eec39f', hair: '#1f1a1a', hairStyle: 'short', shirt: '#7fb8e8', shorts: '#3f4a5c', shoe: '#5d6170', bag: null, accessory: null, top: 'long', bottom: 'pants', neck: 'tie', neckColor: '#c8322b', shoeType: 'loafer' },
  { skin: '#f7d6bd', hair: '#2b2222', hairStyle: 'ponytail', shirt: '#ffb3c7', shorts: '#f6efe0', shoe: '#ffffff', bag: null, accessory: null, bottom: 'skirt', lashes: true },
  { skin: '#e8b994', hair: '#2a2020', hairStyle: 'buzz', shirt: '#3fae72', shorts: '#4f4a40', shoe: '#5d4a3e', bag: null, accessory: 'cap', accent: '#f4c04e' },
  { skin: '#f5cfb0', hair: '#3a2a26', hairStyle: 'bob', shirt: '#ffe08a', shorts: '#4f5d75', shoe: '#ff9b8f', bag: null, accessory: 'glasses', top: 'tee', bottom: 'pants', lashes: true },
  { skin: '#e8b994', hair: '#9a9298', hairStyle: 'short', shirt: '#efe0bd', shorts: '#5d6b8a', shoe: '#5d6170', bag: null, accessory: null, top: 'long', bottom: 'pants', shoeType: 'sandal' },
  { skin: '#fbdcc4', hair: '#5b3a2c', hairStyle: 'long', shirt: '#cdb8f0', shorts: '#2f3a4d', shoe: '#ffffff', bag: null, accessory: null, top: 'hoodie', bottom: 'pants', lashes: true },
  { skin: '#eec39f', hair: '#1f1a1a', hairStyle: 'spiky', shirt: '#d4473b', shorts: '#2f3440', shoe: '#ffffff', bag: null, accessory: 'headphones', accent: '#2f2f38' },
  { skin: '#f6d6c0', hair: '#d9d6dc', hairStyle: 'elderBun', shirt: '#8c6a9e', shorts: '#2a2628', shoe: '#7aa6c9', bag: null, accessory: null, top: 'baba', bottom: 'pants', pattern: 'flowers', patternColor: '#f4d6e6', shoeType: 'sandal', lashes: true },
  { skin: '#f2cfb3', hair: '#2b2222', hairStyle: 'braid', shirt: '#ffffff', shorts: '#2c5aa0', shoe: '#2a2626', bag: null, accessory: null, top: 'long', bottom: 'skirt', lashes: true },
  { skin: '#e3b08c', hair: '#2a2020', hairStyle: 'curly', shirt: '#f4c04e', shorts: '#3f4a5c', shoe: '#5d6170', bag: null, accessory: null, top: 'tee', bottom: 'shorts' },
  // 1.42 the new hairstyles, faces, cuts and accessories
  { skin: '#f7d6bd', hair: '#5a3a2c', hairStyle: 'wavy', shirt: '#f2e6cf', shorts: '#8fae9a', shoe: '#ffffff', bag: null, accessory: 'flowerPin', accent: '#ffffff', top: 'cardigan', patternColor: '#ff9fb2', bottom: 'longSkirt', lashes: true, eyeShape: 'sparkle' },
  { skin: '#e8b994', hair: '#1f1a1a', hairStyle: 'sideSwept', shirt: '#2f3a5a', shorts: '#c9ad85', shoe: '#5d4a3e', bag: null, accessory: null, top: 'polo', patternColor: '#ffffff', bottom: 'pants', faceMark: 'mole' },
  { skin: '#fbdcc4', hair: '#2b2222', hairStyle: 'highPony', shirt: '#ffffff', shorts: '#4f6fa8', shoe: '#ff9b8f', bag: null, accessory: 'mask', accent: '#bfe3f2', top: 'tee', bottom: 'overalls', lashes: true, eyeShape: 'cat' },
  { skin: '#eec39f', hair: '#7a2a3a', hairStyle: 'pixie', shirt: '#5b8f6a', shorts: '#2f3440', shoe: '#ffffff', bag: null, accessory: 'earrings', accent: '#f4c04e', top: 'sweater', bottom: 'pants', lashes: true, faceMark: 'freckles' },
  { skin: '#d9a07a', hair: '#2a2020', hairStyle: 'afro', shirt: '#ffe08a', shorts: '#3f4a5c', shoe: '#ffffff', bag: null, accessory: null, top: 'tee', bottom: 'shorts', eyeShape: 'smile' },
  { skin: '#f6d6c0', hair: '#3d2c2c', hairStyle: 'halfUp', shirt: '#ffb59e', shorts: '#f6efe2', shoe: '#d4473b', bag: null, accessory: 'strawHat', accent: '#e8574d', top: 'polo', bottom: 'longSkirt', lashes: true, faceMark: 'rosy' },
  { skin: '#eec39f', hair: '#1f1a1a', hairStyle: 'mohawk', shirt: '#2a2a30', shorts: '#4f6fa8', shoe: '#2a2626', bag: null, accessory: 'earrings', accent: '#d9dde3', top: 'tee', bottom: 'pants', eyeShape: 'sleepy', faceMark: 'bandaid' },
  { skin: '#f5cfb0', hair: '#5a6e86', hairStyle: 'shoulder', shirt: '#cdb8f0', shorts: '#c9ad85', shoe: '#ffffff', bag: null, accessory: 'bucketHat', accent: '#f2e2b8', top: 'sweater', bottom: 'overalls', lashes: true, eyeShape: 'dot', faceMark: 'star' },
]

const NAMES = ['Khách', 'Khách quen', 'Người mua', 'Khách']

export function guest(room: string, i: number, look = i): NpcDef {
  return { id: `${room}-guest${i}`, name: { vi: NAMES[i % NAMES.length], en: 'Customer' }, outfit: LOOKS[look % LOOKS.length] }
}

/** A helper of the shop (a second teller, a cook) wearing `outfit`. */
export function helper(room: string, name: string, outfit: Outfit): NpcDef {
  return { id: `${room}-${name}`, name: { vi: name, en: name }, outfit }
}
