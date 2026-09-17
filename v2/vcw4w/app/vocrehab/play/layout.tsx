import type { ReactNode } from "react";
import VocrehabPlayAccessGuard from "./access-guard";

export default function VocrehabPlayLayout({ children }: { children: ReactNode }) {
  return <VocrehabPlayAccessGuard>{children}</VocrehabPlayAccessGuard>;
}
