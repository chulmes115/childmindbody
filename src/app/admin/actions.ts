'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getMeta, setMeta, saveCycleRecord } from '@/lib/db'
import { runCycle } from '@/lib/cycle'

async function assertAdmin() {
  const store = await cookies()
  const token = store.get('cmb_admin')?.value
  if (token !== process.env.ADMIN_SECRET) throw new Error('Unauthorized')
}

export async function login(formData: FormData) {
  const secret = formData.get('secret') as string
  if (secret === process.env.ADMIN_SECRET) {
    const store = await cookies()
    store.set('cmb_admin', secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
  }
  redirect('/admin')
}

export async function logout() {
  const store = await cookies()
  store.delete('cmb_admin')
  redirect('/admin')
}

export async function setDecision(
  cycleId: number,
  decision: 'pass' | 'fail',
  note?: string
) {
  await assertAdmin()
  await saveCycleRecord({
    id: cycleId,
    chris_decision: decision,
    ...(note?.trim() ? { olin_note: note.trim() } : {}),
  })
  const current = ((await getMeta('consecutive_fails')) as number) ?? 0
  await setMeta('consecutive_fails', decision === 'pass' ? 0 : current + 1)
}

export async function triggerNewCycle() {
  await assertAdmin()
  return runCycle()
}
