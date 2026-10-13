import { AcceptInvitationClient } from "./accept-invitation-client";

export default async function AcceptInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Invitations only exist in the client's shared localStorage store, which
  // the server can't see, so there's no server-side existence check here —
  // AcceptInvitationClient looks the token up itself once mounted.
  return <AcceptInvitationClient token={token} />;
}
