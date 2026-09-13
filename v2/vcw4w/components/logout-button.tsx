"use client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";

function purgeLocalSession() {
  try {
    // Supabase browser persistence (localStorage `sb-*` keys) can outlive a
    // failed signOut() and resurrect the header session on next load.
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("sb-")) window.localStorage.removeItem(key);
    }
  } catch {
    // private mode
  }
  try {
    // Non-httpOnly `sb-*` cookie chunks the browser client manages. The
    // httpOnly server chunks are cleared by POST /api/auth/logout; if that
    // call failed the cookies survive and this delete is only best-effort.
    for (const part of window.document.cookie.split(";")) {
      const name = part.split("=")[0]?.trim();
      if (name && name.startsWith("sb-")) {
        window.document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      }
    }
  } catch {
    // private mode
  }
}

export function LogoutButton(){const [busy,setBusy]=useState(false);const [error,setError]=useState("");async function logout(){setBusy(true);setError("");try{await fetch("/api/auth/logout",{method:"POST",credentials:"include"})}catch{}try{await createClient().auth.signOut({scope:"global"})}catch{}purgeLocalSession();// Full-page navigation (not router.replace + refresh): kills all client
    // state and the cached /account server render, so a logged-out user can
    // never see the previous account's profile/coins via bfcache or RSC
    // cache. The proxy redirects /account to /auth/login when no session
    // remains; if a session somehow survived, /auth/login bounces back to
    // the still-authenticated account instead of stranding the user.
    try{if(typeof window!=="undefined"&&window.sessionStorage){window.sessionStorage.clear()}}catch{}window.location.assign("/auth/login")}return <div><Button type="button" disabled={busy} onClick={logout}>{busy?"Signing out…":"Logout"}</Button>{error&&<p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}</div>}
