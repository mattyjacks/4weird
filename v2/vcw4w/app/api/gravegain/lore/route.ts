import { GRAVEGAIN_LORE } from "@/content/gravegain/lore";
import { ok } from "@/lib/api-respond";
export async function GET() { return ok({ lore: GRAVEGAIN_LORE }); }
