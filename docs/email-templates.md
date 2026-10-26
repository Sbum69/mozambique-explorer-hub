# Modelos dos emails de autenticação (PT + EN)

Textos prontos a colar nos modelos de autenticação da Lovable quando houver domínio de email
verificado. Cada email leva os dois idiomas: PT primeiro, EN por baixo (a Lovable não prevê um
modelo por idioma).

## Como aplicar (quando o domínio estiver verificado)

1. No projeto Lovable: **More → Emails → Auth emails → Customize auth emails** (gera os modelos).
2. Abrir **Confirm signup**, **Reset password** e **Change email**, um de cada vez.
3. Trocar **só os textos** (assunto, título, parágrafos, texto do botão). **Não mexer na variável da
   ligação nem no botão que a usa** — sem ela a autenticação deixa de funcionar. O fundo exterior tem
   de continuar `#ffffff`.
4. Nas apps TanStack Start as alterações aos modelos só entram em vigor depois de publicar.
5. Em **More → Users → Settings → Advanced → Redirect URLs**, confirmar o endereço publicado com
   `/auth/callback` (ex.: `https://<app>.lovable.app/auth/callback`) e, mais tarde, o do domínio próprio.

Requisitos da Lovable: plano pago, domínio próprio com acesso ao DNS (registos TXT, NS do subdomínio
`notify` e `_dmarc`; não mudar os nameservers do domínio principal). Fonte:
<https://docs.lovable.dev/features/custom-emails>.

---

## 1. Confirm signup

- **Assunto:** Confirma a tua conta Ekaya · Confirm your Ekaya account
- **Título:** Bem-vindo/a à Ekaya Explore
- **Texto (PT):** Obrigado por te juntares à comunidade Ekaya. Confirma o teu email para ativar a conta
  e começar a descobrir Moçambique com quem o conhece por dentro.
- **Botão:** Confirmar email · Confirm email
- **Nota (PT):** Se não criaste esta conta, ignora este email.
- **Separador:** — English —
- **Texto (EN):** Thanks for joining the Ekaya community. Confirm your email to activate your account
  and start discovering Mozambique with the people who know it best.
- **Nota (EN):** If you didn't create this account, you can ignore this email.

## 2. Reset password

- **Assunto:** Nova palavra-passe Ekaya · Reset your Ekaya password
- **Título:** Definir uma nova palavra-passe
- **Texto (PT):** Recebemos um pedido para alterar a palavra-passe da tua conta Ekaya. Usa o botão
  abaixo para escolher uma nova. A ligação é válida durante pouco tempo e só pode ser usada uma vez.
- **Botão:** Escolher nova palavra-passe · Choose a new password
- **Nota (PT):** Se não pediste esta alteração, ignora este email: a tua palavra-passe atual continua válida.
- **Separador:** — English —
- **Texto (EN):** We received a request to change the password of your Ekaya account. Use the button
  above to choose a new one. The link is valid for a short time and can only be used once.
- **Nota (EN):** If you didn't request this, ignore this email: your current password stays valid.

## 3. Change email

- **Assunto:** Confirma o novo email · Confirm your new email
- **Título:** Confirmar a alteração de email
- **Texto (PT):** Pediste para alterar o email da tua conta Ekaya. Confirma para passares a entrar com o
  novo endereço.
- **Botão:** Confirmar novo email · Confirm new email
- **Nota (PT):** Se não pediste esta alteração, ignora este email e muda a tua palavra-passe.
- **Separador:** — English —
- **Texto (EN):** You asked to change the email of your Ekaya account. Confirm to start signing in with
  the new address.
- **Nota (EN):** If you didn't request this change, ignore this email and change your password.
