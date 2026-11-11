import * as React from "react";

import { EMAIL_COPY } from "./copy";
import { EkayaEmail } from "./layout";

interface InviteEmailProps {
  siteName?: string;
  siteUrl?: string;
  confirmationUrl: string;
}

const c = EMAIL_COPY.invite;

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <EkayaEmail
    preview={c.preview}
    pt={c.pt}
    en={c.en}
    action={{ label: c.button!, url: confirmationUrl }}
  />
);

export default InviteEmail;
