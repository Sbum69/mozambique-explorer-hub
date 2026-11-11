import * as React from "react";

import { EMAIL_COPY } from "./copy";
import { EkayaEmail } from "./layout";

interface SignupEmailProps {
  siteName?: string;
  siteUrl?: string;
  recipient?: string;
  confirmationUrl: string;
}

const c = EMAIL_COPY.signup;

export const SignupEmail = ({ confirmationUrl }: SignupEmailProps) => (
  <EkayaEmail
    preview={c.preview}
    pt={c.pt}
    en={c.en}
    action={{ label: c.button!, url: confirmationUrl }}
  />
);

export default SignupEmail;
