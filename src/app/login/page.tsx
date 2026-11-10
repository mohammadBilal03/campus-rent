import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-3xl font-bold">Sign in with your university email</h1>
      <p className="text-muted">Only verified students can use campus-rent.</p>
      <LoginForm domain={process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? ''} />
    </div>
  )
}
