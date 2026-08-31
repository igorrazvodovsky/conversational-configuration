/**
 * The workspace route's server half, and the only reason it has one: the split
 * between canvas and chat is remembered in a cookie, and the server has to
 * render the division the browser will (docs/specs/remembered-split/design.md).
 *
 * Nothing else belongs here. The page itself is `workspace-view.tsx`, and
 * `WorkspaceRoot` stands where the page component stood, leaving the client
 * tree unchanged (docs/specs/chat-surface/design.md decision 4).
 */

import { cookies } from "next/headers";

import { SPLIT_COOKIE, canvasPercentFrom } from "@/lib/split-layout";
import { WorkspaceRoot } from "./workspace-view";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jar = await cookies();
  return (
    <WorkspaceRoot
      workspaceId={id}
      canvasPercent={canvasPercentFrom(jar.get(SPLIT_COOKIE)?.value)}
    />
  );
}
