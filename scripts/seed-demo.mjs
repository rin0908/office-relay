/**
 * OFFICE RELAY : demo seed.
 *
 * Uses the public (publishable) key and real Supabase Auth sign-in only, i.e.
 * every insert goes through Row Level Security exactly like the browser does.
 * No service_role key, no secret key, no database password.
 *
 * Usage:
 *   node scripts/seed-demo.mjs                       # uses .env.development.local (local stack)
 *   node scripts/seed-demo.mjs --env .env.local      # hosted project
 *   node scripts/seed-demo.mjs --photos /path/to/dir # demo photos (default: ./demo-photos)
 */
import { readFile, readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

const args = process.argv.slice(2)
function arg(name, fallback) {
  const index = args.indexOf(`--${name}`)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

dotenv.config({ path: arg('env', '.env.development.local'), quiet: true })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required')
  process.exit(1)
}

const PHOTO_DIR = arg('photos', 'demo-photos')
const PASSWORD = process.env.DEMO_PASSWORD ?? 'OfficeRelay!2026'
const DONOR_EMAIL = process.env.DEMO_DONOR_EMAIL ?? 'donor@office-relay.demo'
const STARTUP_EMAIL = process.env.DEMO_STARTUP_EMAIL ?? 'startup@office-relay.demo'

const AREAS = {
  shibuya: { label: '東京都渋谷区', lat: 35.658, lng: 139.7016 },
  ebisu: { label: '東京都渋谷区 恵比寿', lat: 35.6467, lng: 139.71 },
}

function tomorrowAt(hour) {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

/** Real photos of the actual assets, uploaded to the private Storage bucket. */
const DONOR_ITEMS = [
  {
    title: '木製デスク W1200',
    description:
      'オフィス移転に伴い放出する木製デスクです。天板1200×700mm、目立った傷はありません。20台まとめてお渡しできます。',
    category: 'desk',
    quantity: 20,
    condition: 'good',
    photos: ['2D28F32A-F93B-4273-92CB-2351B3515DAA', 'PXL_20260815_085423989'],
  },
  {
    title: 'メッシュチェア（可動式）',
    description:
      '会議室で使用していたメッシュ張りのチェアです。キャスター可動式、背もたれのメッシュも破れなし。24脚あります。',
    category: 'chair',
    quantity: 24,
    condition: 'good',
    photos: ['74708B09-5F45-469D-BC91-43FE12D97EBE', 'PXL_20260815_085339381'],
  },
  {
    title: '27インチ液晶モニター',
    description:
      '在宅勤務移行で余剰となった27インチの液晶モニターです。HDMI/DisplayPort対応、動作確認済み。10台。',
    category: 'monitor',
    quantity: 10,
    condition: 'good',
    photos: ['PXL_20260815_085412306'],
  },
  {
    title: '大型冷蔵庫（オフィス用）',
    description: '休憩スペースで使用していた6ドア冷蔵庫です。動作確認済み、清掃済み。',
    category: 'appliance',
    quantity: 1,
    condition: 'fair',
    photos: ['EDB1DA2A-4C35-4781-9C63-F83BADDAA36B'],
  },
  {
    title: 'iPad（Wi-Fiモデル）',
    description: '受付端末として使用していたiPadです。初期化済み、付属ケーブルなし。3台。',
    category: 'it_equipment',
    quantity: 3,
    condition: 'fair',
    photos: ['39F9AF74-B15D-4F91-AE9E-430CF9711E8B'],
  },
  {
    title: '電気ケトル',
    description: '給湯スペースの電気ケトルです。動作確認済み。2台。',
    category: 'appliance',
    quantity: 2,
    condition: 'fair',
    photos: ['50BC2A4F-E5D4-468B-AFC1-5FD1FF088C0E'],
  },
]

const DONOR_WANTS = [
  {
    title: '生成AI社内研修',
    description:
      '全社員が ChatGPT や Claude を業務で安全に活用できるようにする社内研修を受けたいです。',
  },
  {
    title: '業務プロセスのAI自動化相談',
    description: '経理と営業事務の定型業務をAIで自動化する方法を相談したいです。',
  },
]

const STARTUP_NEEDS = [
  {
    title: '事務用デスク',
    description: '新オフィス開設に伴い、エンジニア用の作業デスクが10台必要です。',
    category: 'desk',
    quantity: 10,
  },
  {
    title: 'オフィスチェア',
    description: '長時間の開発作業に耐えるオフィスチェアを10脚探しています。',
    category: 'chair',
    quantity: 10,
  },
  {
    title: '外部ディスプレイ',
    description: '開発用に27インチ前後の外部モニターを6台探しています。',
    category: 'monitor',
    quantity: 6,
  },
]

const STARTUP_OFFERS = [
  {
    title: '生成AI社内研修',
    description:
      '生成AIの業務活用ワークショップを2時間×2回で提供します。プロンプト設計と社内ガイドライン策定まで支援します。',
  },
  {
    title: 'AI業務自動化の実装支援',
    description: '定型業務のAI自動化を要件定義から実装まで支援します。',
  },
  { title: 'Web開発', description: 'コーポレートサイトや業務システムのWeb開発を行います。' },
]

const client = () => createClient(SUPABASE_URL, SUPABASE_KEY)

async function signIn(supabase, email) {
  const signIn = await supabase.auth.signInWithPassword({ email, password: PASSWORD })
  if (signIn.data.session) return signIn.data.session
  const signUp = await supabase.auth.signUp({ email, password: PASSWORD })
  if (signUp.error) throw new Error(`${email}: ${signUp.error.message}`)
  if (signUp.data.session) return signUp.data.session
  const retry = await supabase.auth.signInWithPassword({ email, password: PASSWORD })
  if (retry.data.session) return retry.data.session
  throw new Error(
    `${email}: メール確認が必要なため自動サインインできません。Supabase の Auth 設定で email confirmation を無効にするか、手動でユーザーを作成してください。`,
  )
}

async function currentOrg(supabase) {
  const { data } = await supabase
    .from('org_members')
    .select('org_id, organizations(id, name, org_type, public_location)')
    .limit(1)
    .maybeSingle()
  return data?.organizations ?? null
}

async function ensureOrg(supabase, { name, orgType, area }) {
  const existing = await currentOrg(supabase)
  if (existing) return existing

  const { error } = await supabase.rpc('create_organization', {
    p_name: name,
    p_org_type: orgType,
    p_public_location: area.label,
    p_lat: area.lat,
    p_lng: area.lng,
  })
  if (error) throw new Error(`create_organization(${name}): ${error.message}`)

  const created = await currentOrg(supabase)
  if (!created) throw new Error(`create_organization(${name}): 組織を読み出せませんでした`)
  return created
}

async function embed(accessToken, texts) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ inputs: texts }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) return null
    const payload = await response.json()
    return payload.embeddings ?? null
  } catch {
    return null
  }
}

async function setEmbedding(supabase, table, id, embedding) {
  if (!embedding) return false
  const { error } = await supabase.rpc('set_embedding', {
    p_table: table,
    p_id: id,
    p_embedding: `[${embedding.map((v) => v.toFixed(6)).join(',')}]`,
  })
  return !error
}

async function findPhotos(names) {
  const files = await readdir(PHOTO_DIR).catch(() => [])
  return names
    .map((name) => files.find((file) => basename(file, '.jpg') === name || file === name))
    .filter(Boolean)
    .map((file) => join(PHOTO_DIR, file))
}

async function uploadPhotos(supabase, orgId, itemId, photoNames) {
  const paths = await findPhotos(photoNames)
  if (paths.length === 0) {
    console.warn(`  ! 写真が見つかりません (${PHOTO_DIR}): ${photoNames.join(', ')}`)
    return 0
  }

  let uploaded = 0
  for (const [index, filePath] of paths.entries()) {
    const body = await readFile(filePath)
    const storagePath = `${orgId}/${itemId}/${Date.now()}_${basename(filePath)}`
    const { error } = await supabase.storage
      .from('item-images')
      .upload(storagePath, body, { contentType: 'image/jpeg', upsert: false })
    if (error) {
      console.warn(`  ! Storage upload failed: ${error.message}`)
      continue
    }
    const { error: mediaError } = await supabase.from('item_media').insert({
      item_id: itemId,
      storage_path: storagePath,
      is_primary: index === 0,
      sort_order: index,
    })
    if (mediaError) console.warn(`  ! item_media insert failed: ${mediaError.message}`)
    else uploaded += 1
  }
  return uploaded
}

async function main() {
  console.log(`Supabase: ${SUPABASE_URL}`)

  // ---- DONOR ---------------------------------------------------------------
  const donor = client()
  const donorSession = await signIn(donor, DONOR_EMAIL)
  const donorOrg = await ensureOrg(donor, {
    name: 'NEXTMOVE株式会社',
    orgType: 'donor',
    area: AREAS.shibuya,
  })
  console.log(`DONOR: ${donorOrg.name} (${donorOrg.id})`)

  const { data: existingItems } = await donor.from('items').select('id').eq('owner_org_id', donorOrg.id)
  if ((existingItems?.length ?? 0) > 0) {
    console.log(`  既に ${existingItems.length} 件の資産があるため資産登録をスキップします。`)
  } else {
    for (const spec of DONOR_ITEMS) {
      const { data: item, error } = await donor
        .from('items')
        .insert({
          owner_org_id: donorOrg.id,
          title: spec.title,
          description: spec.description,
          category: spec.category,
          quantity: spec.quantity,
          condition: spec.condition,
          public_location: AREAS.shibuya.label,
          pickup_deadline: tomorrowAt(18),
        })
        .select('id')
        .single()
      if (error) {
        console.warn(`  ! ${spec.title}: ${error.message}`)
        continue
      }

      await donor.from('item_private_details').upsert({
        item_id: item.id,
        exact_pickup_address: '東京都渋谷区道玄坂1-2-3 NEXTMOVEビル 8F 搬出口',
        contact_note: '搬出は平日10:00-18:00、事前に総務部 田中まで連絡をお願いします。',
      })
      await donor.rpc('set_item_location', {
        p_item_id: item.id,
        p_lat: AREAS.shibuya.lat,
        p_lng: AREAS.shibuya.lng,
      })
      const [vector] = (await embed(donorSession.access_token, [
        `${spec.title} ${spec.description} ${spec.category}`,
      ])) ?? [null]
      const embedded = await setEmbedding(donor, 'items', item.id, vector)
      const uploaded = await uploadPhotos(donor, donorOrg.id, item.id, spec.photos)
      console.log(
        `  + ${spec.title} ×${spec.quantity} / 写真 ${uploaded}枚 / embedding ${embedded ? 'あり' : 'なし'}`,
      )
    }
  }

  for (const want of DONOR_WANTS) {
    const { data: existing } = await donor
      .from('service_wants')
      .select('id')
      .eq('org_id', donorOrg.id)
      .eq('title', want.title)
      .maybeSingle()
    if (existing) continue
    const { data: row, error } = await donor
      .from('service_wants')
      .insert({ org_id: donorOrg.id, title: want.title, description: want.description })
      .select('id')
      .single()
    if (error) {
      console.warn(`  ! ${want.title}: ${error.message}`)
      continue
    }
    const [vector] = (await embed(donorSession.access_token, [
      `${want.title} ${want.description}`,
    ])) ?? [null]
    await setEmbedding(donor, 'service_wants', row.id, vector)
    console.log(`  + 受けたいサービス: ${want.title}`)
  }

  // ---- STARTUP -------------------------------------------------------------
  const startup = client()
  const startupSession = await signIn(startup, STARTUP_EMAIL)
  const startupOrg = await ensureOrg(startup, {
    name: 'AI Seed株式会社',
    orgType: 'startup',
    area: AREAS.ebisu,
  })
  console.log(`STARTUP: ${startupOrg.name} (${startupOrg.id})`)

  for (const need of STARTUP_NEEDS) {
    const { data: existing } = await startup
      .from('needs')
      .select('id')
      .eq('org_id', startupOrg.id)
      .eq('title', need.title)
      .maybeSingle()
    if (existing) continue
    const { data: row, error } = await startup
      .from('needs')
      .insert({
        org_id: startupOrg.id,
        title: need.title,
        description: need.description,
        category: need.category,
        quantity: need.quantity,
        public_location: AREAS.ebisu.label,
        needed_by: tomorrowAt(20),
      })
      .select('id')
      .single()
    if (error) {
      console.warn(`  ! ${need.title}: ${error.message}`)
      continue
    }
    await startup.rpc('set_need_location', {
      p_need_id: row.id,
      p_lat: AREAS.ebisu.lat,
      p_lng: AREAS.ebisu.lng,
    })
    const [vector] = (await embed(startupSession.access_token, [
      `${need.title} ${need.description} ${need.category}`,
    ])) ?? [null]
    const embedded = await setEmbedding(startup, 'needs', row.id, vector)
    console.log(`  + ニーズ: ${need.title} ×${need.quantity} / embedding ${embedded ? 'あり' : 'なし'}`)
  }

  for (const offer of STARTUP_OFFERS) {
    const { data: existing } = await startup
      .from('service_offers')
      .select('id')
      .eq('org_id', startupOrg.id)
      .eq('title', offer.title)
      .maybeSingle()
    if (existing) continue
    const { data: row, error } = await startup
      .from('service_offers')
      .insert({ org_id: startupOrg.id, title: offer.title, description: offer.description })
      .select('id')
      .single()
    if (error) {
      console.warn(`  ! ${offer.title}: ${error.message}`)
      continue
    }
    const [vector] = (await embed(startupSession.access_token, [
      `${offer.title} ${offer.description}`,
    ])) ?? [null]
    await setEmbedding(startup, 'service_offers', row.id, vector)
    console.log(`  + 提供サービス: ${offer.title}`)
  }

  console.log('\nデモデータの投入が完了しました。')
  console.log(`  DONOR   : ${DONOR_EMAIL} / ${PASSWORD}`)
  console.log(`  STARTUP : ${STARTUP_EMAIL} / ${PASSWORD}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
