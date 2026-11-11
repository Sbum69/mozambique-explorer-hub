import * as React from "react";

import { EMAIL_COPY } from "./copy";
import { EkayaEmail } from "./layout";

interface EmailChangeEmailProps {
  siteName?: string;
  oldEmail?: string;
  email?: string;
  newEmail?: string;
  confirmationUrl: string;
}

const c = EMAIL_COPY.email_change;

export const EmailChangeEmail = ({ confirmationUrl }: EmailChangeEmailProps) => (
  <EkayaEmail
    preview={c.preview}
    pt={c.pt}
    en={c.en}
    action={{ label: c.button!, url: confirmationUrl }}
  />
);

export default EmailChangeEmail;
