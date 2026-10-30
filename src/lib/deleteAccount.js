import { supabase } from "./supabase";

// Asks our server to delete your account and all your data.
// Throws an Error with a friendly message if it does not work.
export async function deleteMyAccount() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please log in again.");

  const res = await fetch("/api/delete-account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ confirm: "DELETE" }),
  });

  let body = {};
  try {
    body = await res.json();
  } catch {
    // The server sent no JSON. We show the friendly message below.
  }
  if (!res.ok) {
    throw new Error(
      body.error ||
        "We could not delete your account just now. Please try again.",
    );
  }
}
