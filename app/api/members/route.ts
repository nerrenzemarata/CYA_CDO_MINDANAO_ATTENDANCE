import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const unit = searchParams.get('unit') ?? undefined

  const { data, error } = await db.getMembers(unit)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 's-maxage=10, stale-while-revalidate=59',
    },
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const { data, error } = await db.createMember({
    unit:           body.unit,
    name:           body.name,
    contact_number: body.contact_number ?? '',
    june4_status:   'riding',
    june7_status:   'riding',
  })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
