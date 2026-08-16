/**
 * Coarse public areas with representative coordinates.
 *
 * OFFICE RELAY never publishes an exact address: organizations pick a public
 * area (shown to everyone) while the exact pickup address lives in
 * `item_private_details` and is only readable after a match is accepted.
 * The coordinates below feed the PostGIS `geography(Point, 4326)` columns used
 * for distance based matching.
 */
export interface Area {
  value: string
  label: string
  lat: number
  lng: number
}

export const AREAS: Area[] = [
  { value: 'shibuya', label: '東京都渋谷区', lat: 35.658, lng: 139.7016 },
  { value: 'ebisu', label: '東京都渋谷区 恵比寿', lat: 35.6467, lng: 139.71 },
  { value: 'shinjuku', label: '東京都新宿区', lat: 35.6938, lng: 139.7034 },
  { value: 'minato', label: '東京都港区', lat: 35.6581, lng: 139.7514 },
  { value: 'chiyoda', label: '東京都千代田区', lat: 35.694, lng: 139.7536 },
  { value: 'chuo', label: '東京都中央区', lat: 35.6706, lng: 139.7719 },
  { value: 'shinagawa', label: '東京都品川区', lat: 35.6092, lng: 139.7302 },
  { value: 'setagaya', label: '東京都世田谷区', lat: 35.6464, lng: 139.6533 },
  { value: 'yokohama', label: '神奈川県横浜市', lat: 35.4658, lng: 139.6222 },
  { value: 'saitama', label: '埼玉県さいたま市', lat: 35.8617, lng: 139.6455 },
  { value: 'osaka', label: '大阪府大阪市', lat: 34.6937, lng: 135.5023 },
  { value: 'fukuoka', label: '福岡県福岡市', lat: 33.5902, lng: 130.4017 },
]

export function findArea(labelOrValue: string | null | undefined): Area | null {
  if (!labelOrValue) return null
  return (
    AREAS.find((a) => a.value === labelOrValue) ??
    AREAS.find((a) => a.label === labelOrValue) ??
    null
  )
}
