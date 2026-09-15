import { redirect } from "next/navigation";

// Additive bridge (DS-PAGEFIX-01): app/my/** shipped /my/usage and /my/rights
// but no /my index, so GET /my 404'd. Bare /my now redirects to the account
// hub, which links every personal surface. No manifest or lane file touched.
export default function MyIndexPage() {
  redirect("/account");
}
