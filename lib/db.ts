/**
 * Storage layer:
 *  - Uses Supabase when NEXT_PUBLIC_SUPABASE_URL is a real URL
 *  - Falls back to in-memory store (local dev / preview)
 */

import type { Member, TripStatus, ChatMessage } from '@/types'

const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

/* ─── In-memory store ─────────────────────────────────────────────────────── */

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Bus assignments:
// Bus 1 (42 pax): USTP + XU + Staffers: Reynaldo Silao (AGL-USTP), Ronin Java (AGL-XU), Angelo Zayne Villanueva, Krizia Faye Alambatang
// Bus 2 (41 pax): UC + Butuan + Staffers: John Paulo Tumala (AGL-UC), Josh Louise Monte, Princess Lou Carpentero, Blesselle Kaye Lagura, Katrina Lee Corpuz, Martin Clark S. Fabello
const MEMBERS_DATA: Omit<Member, 'id' | 'created_at'>[] = [
  // ── USTP → Bus 1 ──────────────────────────────────────────────────────────
  { name: 'Kylle Crystal Salvaña',        unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09918340924' },
  { name: 'Mikyla Arog',                  unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09976433167' },
  { name: 'Caro Deanne Hilotin',          unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09268240981' },
  { name: 'Mariel Jhon Galera',           unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '' },
  { name: 'Jolina Bajuyo',                unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09938384073' },
  { name: 'Seth Nicole Enero',            unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09668860263' },
  { name: 'Ella Norienne Dacapio',        unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09219370098' },
  { name: 'Nerrenze Marata',              unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09550732496' },
  { name: 'Rikki Ryza Sabio',             unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09172474369' },
  { name: 'Andre Miguel Fabello',         unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09453057296' },
  { name: 'Jibbriel Ipong',               unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09052311812' },
  { name: 'Rustine John Cagang',          unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09658305451' },
  { name: 'Micah Alingatong',             unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09103460433' },
  { name: 'Alec Maui Fabello',            unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09973575167' },
  { name: 'John Clint Perez',             unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09368992271' },
  { name: 'Keziah Mae Almerol',           unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09569269805' },
  { name: 'Fredrich Tropico',             unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09166893077' },
  { name: 'Jezel Maglasang',              unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '' },
  { name: 'John Andrei Abrenica',         unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09514678598' },
  { name: 'Hans Ira Hilotin',             unit: 'USTP', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09456119639' },

  // ── XU → Bus 1 ────────────────────────────────────────────────────────────
  { name: 'Ivy Joy Subrabas',             unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09664964227' },
  { name: 'Meg Rafael Escalante',         unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09959864634' },
  { name: 'Julia Patricia Belen',         unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09178322366' },
  { name: 'Joel Calubia',                 unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09493431347' },
  { name: 'Sophia Rosette Tapay',         unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09541639791' },
  { name: 'Brumil Josh Oliveros',         unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09057835022' },
  { name: 'Luke Anthony Alba',            unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09989924068' },
  { name: 'Zie Hans Vicente',             unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09264147024' },
  { name: 'Carl John Monteros',           unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09473598493' },
  { name: 'Ruthie Marielle Peruelo',      unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09765143419' },
  { name: 'Kimberly Yamson',              unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09516800660' },
  { name: 'Charlize Reema Hembrador',     unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09173112176' },
  { name: 'Clarisse Mei Fabello',         unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09560473364' },
  { name: 'Darren Ormillada',             unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09551427131' },
  { name: 'Gabriel Kyle Singcol',         unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09661887708' },
  { name: 'Francis Viñan',               unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09398889682' },
  { name: 'Emil Edward Sta. Cruz',        unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09166517203' },
  { name: 'Arn Christian Ormillada',      unit: 'XU', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09551426496' },

  // ── UC → Bus 2 ────────────────────────────────────────────────────────────
  { name: 'Kathryn Angela Camaddo',       unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09050846236' },
  { name: 'Rolan Java',                   unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09659230877' },
  { name: 'Jessa Variacion',              unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09061637088' },
  { name: 'Via Nicole Blanco',            unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09606259023' },
  { name: 'Kim Abigail Lunjas',           unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09973448881' },
  { name: 'Angeline Cespon',              unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09772436546' },
  { name: 'Aleah Christie Bernal',        unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09853160508' },
  { name: 'Carlyle John Jimenez',         unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09274095899' },
  { name: 'Lourdes Gabrielle Ermino',     unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09763679807' },
  { name: 'Azucena Jean Pongo',           unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09918875706' },
  { name: 'Eduardo Ygot',                 unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09164809370' },
  { name: 'Zjyrick Francis Imbing',       unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09358260748' },
  { name: 'Richmae Labor',                unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09368854568' },
  { name: 'Marco Jay Daquiz',             unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09531335462' },
  { name: 'Sefina Louise Takiang',        unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09952396113' },
  { name: 'Jeremy Silao',                 unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09051627030' },
  { name: 'Jeck Rubenhod Lomopog',        unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09944729139' },
  { name: 'Kristelle Erika Camaddo',      unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09771077400' },
  { name: 'Diana Uziel Tablando',         unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09954377932' },
  { name: 'Jhullea Polinar',              unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09638365160' },
  { name: 'Julia Cassandra Lagua',        unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09761360791' },
  { name: 'Lourdes Marielle Ermino',      unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09760088737' },
  { name: 'Rafael Kent Agcopra',          unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09310191742' },
  { name: 'Maricris Sulague',             unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09946747626' },
  { name: 'Elmae Aringa',                 unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09638466336' },
  { name: 'Empress',                      unit: 'UC', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '' },

  // ── CYA High → Bus 2 ──────────────────────────────────────────────────────
  { name: 'Danielle Tacastacas',          unit: 'CYA High', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09953229112' },
  { name: 'Ralph Christian Tacastacas',   unit: 'CYA High', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09457224346' },
  { name: 'Rupert Joseph Dalagan',        unit: 'CYA High', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09262750565' },
  { name: 'Rio Angeline Dumaraog',        unit: 'CYA High', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09664426482' },
  { name: 'Jasmine Paula Belen',          unit: 'CYA High', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09533541494' },
  { name: 'Liana Faye Padla',             unit: 'CYA High', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09655367268' },
  { name: 'Jillian Bajuyo',               unit: 'CYA High', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09917403200' },
  { name: 'Princess Mary Edjulie Pocong', unit: 'CYA High', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09068700428' },
  { name: 'Reymar Daculiat',              unit: 'CYA High', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09050369407' },

  // ── Staffer → Bus 1: Reynaldo Silao (AGL-USTP), Ronin Java (AGL-XU), Angelo Zayne Villanueva, Krizia Faye Alambatang ──
  // ── Staffer → Bus 2: John Paulo Tumala (AGL-UC), Josh Louise Monte, Princess Lou Carpentero, Blesselle Kaye Lagura, Katrina Lee Corpuz, Martin Clark S. Fabello ──
  { name: 'Reynaldo Silao',               unit: 'Staffer', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09973070255' },
  { name: 'Ronin Java',                   unit: 'Staffer', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09531335444' },
  { name: 'Angelo Zayne Villanueva',      unit: 'Staffer', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09671792568' },
  { name: 'Krizia Faye Alambatang',       unit: 'Staffer', bus: 'Bus 1', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09057388998' },
  { name: 'John Paulo Tumala',            unit: 'Staffer', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09277118191' },
  { name: 'Josh Louise Monte',            unit: 'Staffer', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09770613274' },
  { name: 'Princess Lou Carpentero',      unit: 'Staffer', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09489745730' },
  { name: 'Blesselle Kaye Lagura',        unit: 'Staffer', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09354520286' },
  { name: 'Katrina Lee Corpuz',           unit: 'Staffer', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09272726317' },
  { name: 'Martin Clark S. Fabello',      unit: 'Staffer', bus: 'Bus 2', june4_status: 'not_going', june7_status: 'not_going', contact_number: '09565361317' },
]

const store: Member[] = MEMBERS_DATA.map(d => ({
  ...d,
  id: makeId(),
  created_at: new Date().toISOString(),
}))

const local = {
  getAll: (unit?: string): Member[] => {
    const sorted = [...store].sort((a, b) => a.name.localeCompare(b.name))
    return unit ? sorted.filter(m => m.unit === unit) : sorted
  },

  insert: (data: Omit<Member, 'id' | 'created_at'>): Member => {
    const member: Member = { ...data, id: makeId(), created_at: new Date().toISOString() }
    store.push(member)
    return member
  },

  update: (id: string, patch: Partial<Member>): Member | null => {
    const idx = store.findIndex(m => m.id === id)
    if (idx === -1) return null
    store[idx] = { ...store[idx], ...patch }
    return store[idx]
  },

  delete: (id: string): boolean => {
    const idx = store.findIndex(m => m.id === id)
    if (idx === -1) return false
    store.splice(idx, 1)
    return true
  },
}

/* ─── In-memory chat store ────────────────────────────────────────────────── */

const chatStore: ChatMessage[] = []

const localChat = {
  getAll: (): ChatMessage[] => [...chatStore].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  ),
  insert: (payload: { sender_name: string; message: string; unit?: string }): ChatMessage => {
    const msg: ChatMessage = { ...payload, unit: payload.unit ?? null, id: makeId(), created_at: new Date().toISOString() }
    chatStore.push(msg)
    return msg
  },
}

/* ─── Supabase store ─────────────────────────────────────────────────────── */

async function getSupabase() {
  const { supabase } = await import('./supabase')
  return supabase
}

/* ─── Unified API ────────────────────────────────────────────────────────── */

export const db = {
  async getMembers(unit?: string): Promise<{ data: Member[]; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { data: local.getAll(unit), error: null }
    }
    const sb = await getSupabase()
    let q = sb.from('members').select('*').order('name')
    if (unit) q = q.eq('unit', unit)
    const { data, error } = await q
    return { data: data ?? [], error: error?.message ?? null }
  },

  async createMember(payload: {
    unit: string
    name: string
    contact_number: string
    june4_status: TripStatus
    june7_status: TripStatus
  }): Promise<{ data: Member | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { data: local.insert(payload as Omit<Member, 'id' | 'created_at'>), error: null }
    }
    const sb = await getSupabase()
    const { data, error } = await sb.from('members').insert(payload).select().single()
    return { data, error: error?.message ?? null }
  },

  async updateMember(id: string, patch: Partial<Member>): Promise<{ data: Member | null; error: string | null }> {
    if (!isSupabaseConfigured) {
      return { data: local.update(id, patch), error: null }
    }
    const sb = await getSupabase()
    const { data, error } = await sb.from('members').update(patch).eq('id', id).select().single()
    return { data, error: error?.message ?? null }
  },

  async deleteMember(id: string): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) {
      local.delete(id)
      return { error: null }
    }
    const sb = await getSupabase()
    const { error } = await sb.from('members').delete().eq('id', id)
    return { error: error?.message ?? null }
  },

  async getChat(): Promise<{ data: ChatMessage[]; error: string | null }> {
    if (!isSupabaseConfigured) return { data: localChat.getAll(), error: null }
    const sb = await getSupabase()
    const { data, error } = await sb
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200)
    return { data: data ?? [], error: error?.message ?? null }
  },

  async postChat(payload: { sender_name: string; message: string; unit?: string }): Promise<{ data: ChatMessage | null; error: string | null }> {
    if (!isSupabaseConfigured) return { data: localChat.insert(payload), error: null }
    const sb = await getSupabase()
    const { data, error } = await sb.from('chat_messages').insert(payload).select().single()
    return { data, error: error?.message ?? null }
  },
}
