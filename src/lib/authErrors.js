// Turns Supabase's technical errors into friendly messages.
export function friendlyAuthError(err) {
  const msg = (err?.message || "").toLowerCase();

  if (msg.includes("invalid login credentials"))
    return "Wrong email or password. Please try again.";
  if (msg.includes("not confirmed"))
    return "Please confirm your email first. Check your inbox.";
  if (msg.includes("already registered"))
    return "This email already has an account. Try logging in.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Too many tries. Please wait a few minutes and try again.";
  if (
    msg.includes("provider is not enabled") ||
    msg.includes("unsupported provider")
  )
    return "This sign-in option is not ready yet. Use another way to sign in.";
  if (msg.includes("failed to fetch") || msg.includes("network"))
    return "Cannot reach the server. Check your internet and try again.";
  if (msg.includes("different from the old"))
    return "Choose a new password that is different from your old one.";
  if (msg.includes("password should be") || msg.includes("weak"))
    return "That password is too weak. Use at least 8 characters.";

  return "Something went wrong. Please try again.";
}
