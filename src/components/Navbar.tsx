// import Link from 'next/link'
// import { getUser } from '@/lib/supabase/user'

// export default async function Navbar() {
//   const user = await getUser()

//   return (
//     <header className="border-b border-line bg-white">
//       <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-10 gap-y-2 px-4 py-3">
//         <Link href="/" className="brand font-display text-xl font-bold tracking-tight">
//           Campus-Rent
//         </Link>
//         {user ? (
//           <>
//             <Link href="/items/new">Post an item</Link>
//             <Link href="/my/listings">My listings</Link>
//             <Link href="/my/bookings">My bookings</Link>
//             <Link href="/chat">Messages</Link>
//             <form action="/auth/signout" method="post" className="ml-auto">
//               <button className="btn btn-quiet btn-sm" type="submit">Sign out</button>
//             </form>
//           </>
//         ) : (
//           <Link href="/login" className="ml-auto">Sign in</Link>
//         )}
//       </nav>
//     </header>
//   )
// }


import Link from 'next/link'
import { getUser } from '@/lib/supabase/user'
import NavMenu from './NavMenu'

export default async function Navbar() {
  const user = await getUser()

  return (
    <header className="border-b border-line bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-10 gap-y-1 px-4 py-3 sm:px-6">
        <Link href="/" className="brand font-display text-xl font-bold tracking-tight">
          Campus-Rent
        </Link>
        <NavMenu signedIn={Boolean(user)} />
      </nav>
    </header>
  )
}