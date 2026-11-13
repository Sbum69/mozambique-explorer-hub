import * as React from "react";

import { EMAIL_COPY } from "./copy";
import { EkayaEmail } from "./layout";

interface ReauthenticationEmailProps {
  token: string;
}

const c = EMAIL_COPY.reauthentication;

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EkayaEmail preview={c.preview} pt={c.pt} en={c.en} code={token} />
);

export default ReauthenticationEmail;
