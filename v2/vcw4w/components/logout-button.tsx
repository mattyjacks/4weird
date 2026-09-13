"use client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function LogoutButton(){const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState("");async function logout(){setBusy(true);setError("");try{await fetch("/api/auth/logout",{method:"POST",credentials:"include"}).catch(()=>{})}catch{}const {error:signOutError}=await createClient().auth.signOut();if(signOutError){setError("Unable to sign out. Please try again.");setBusy(false);return}router.replace("/auth/login");router.refresh()}return <div><Button type="button" disabled={busy} onClick={logout}>{busy?"Signing out…":"Logout"}</Button>{error&&<p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}</div>}
