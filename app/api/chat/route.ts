import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const { data, error } = await db.getChat()
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { sender_name, message, unit } = body
  if (!sender_name?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const { data, error } = await db.postChat({
    sender_name: sender_name.trim(),
    message: message.trim(),
    unit: unit ?? null,
  })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}
