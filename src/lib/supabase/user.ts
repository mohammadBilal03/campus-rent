import { cache } from 'react'
import { createClient } from './server'

// One login check per request, shared by the Navbar and the page.
export const getUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})