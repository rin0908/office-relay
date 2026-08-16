'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface ActionState {
  error?: string
  message?: string
}

export async function signInAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const redirectTo = String(formData.get('redirect') ?? '/dashboard') || '/dashboard'

  if (!email || !password) return { error: 'メールアドレスとパスワードを入力してください。' }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: 'サインインできませんでした。メールアドレスとパスワードをご確認ください。' }
  }

  revalidatePath('/', 'layout')
  redirect(redirectTo)
}

export async function signUpAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || password.length < 8) {
    return { error: 'メールアドレスと8文字以上のパスワードを入力してください。' }
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    return { error: `アカウントを作成できませんでした：${error.message}` }
  }

  if (!data.session) {
    return {
      message:
        '確認メールを送信しました。メール内のリンクを開いてから、サインインしてください。',
    }
  }

  revalidatePath('/', 'layout')
  redirect('/onboarding')
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
