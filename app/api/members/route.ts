import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const unit = searchParams.get('unit')

  let query = supabase.from('members').select('*').order('name')

  if (unit) {
    query = query.eq('unit', unit)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('members')
    .insert({
      unit:           body.unit,
      name:           body.name,
      contact_number: body.contact_number ?? '',
      june4_status:   'riding',
      june7_status:   'riding',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
