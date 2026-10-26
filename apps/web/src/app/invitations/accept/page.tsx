import type { Metadata } from "next";
import InvitationAcceptance from "./invitation-acceptance";

export const metadata: Metadata = {
  title: "Háztartási meghívó elfogadása | Household Finance",
  referrer: "no-referrer",
};

export default function AcceptInvitationPage() {
  return <InvitationAcceptance />;
}
