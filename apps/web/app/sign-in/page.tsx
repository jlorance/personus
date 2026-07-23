/**
 * Sign-in surface. When the AuthN provider is configured, this is where the
 * vendor widget mounts (Clerk `<SignIn/>`, WorkOS redirect, …). In the founding
 * pass — before keys are set — it explains the state honestly instead of
 * rendering a broken widget.
 */
export default function SignInPage() {
  const configured = Boolean(process.env.CLERK_SECRET_KEY);
  return (
    <main className="shell flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">Enter the register</p>
      <h1 className="display mt-3 mb-4 text-4xl">Sign in</h1>
      {configured ? (
        <p className="max-w-[46ch] text-muted-foreground">
          The authentication widget mounts here once the sign-in route is wired to the configured
          provider.
        </p>
      ) : (
        <p className="max-w-[46ch] text-muted-foreground">
          Authentication isn&apos;t connected in this environment yet. Set{' '}
          <code className="font-mono text-primary">AUTH_PROVIDER</code> and the provider keys to
          enable sign-in.
        </p>
      )}
    </main>
  );
}
