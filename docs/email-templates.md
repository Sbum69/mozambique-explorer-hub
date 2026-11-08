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

## Remetente e resposta

- Remetente: **`EKAYA <nao-responder@exploreekaya.com>`**. Na configuração do domínio de email
  (More → Emails), mudar o prefixo para `nao-responder` e ligar **"Show as sent from
  @exploreekaya.com"**. Isto pede também o registo `_dmarc` (ver `docs/LAUNCH.md` §2). Sem essa
  opção, o remetente fica `nao-responder@notify.exploreekaya.com`, que também funciona.
- Responder a: **`apoio@exploreekaya.com`**, se a Lovable mostrar o campo Reply-to **[CONFIRMAR]**.
  Se não mostrar, a última linha de cada email já diz para escrever para `apoio@exploreekaya.com`.

## Design (simples, sem imagens pesadas)

- Fundo exterior `#ffffff` (obrigatório na Lovable). Cartão com contorno `#d3dcd9` de 1 px e
  raio de 10 px, sem sombra.
- Texto `#15211f`, notas `#4e5d59`, letra do sistema (`-apple-system, Segoe UI, Roboto, Arial,
sans-serif`), 16 px.
- Um só botão, cor de ação `#0a6670` com texto `#ffffff`, raio de 6 px. Por baixo do botão, a
  mesma ligação em texto, para quem não vê botões.
- No topo, o logótipo "Coração do Índico" em PNG (os clientes de email não mostram SVG), servido
  pelo próprio domínio, com texto alternativo para quem bloqueia imagens:
  `<img src="https://exploreekaya.com/email-logo.png" width="160" height="39" alt="EKAYA" style="display:block;border:0">`.
  O ficheiro (`public/email-logo.png`, 2,5 KB) é a versão clara: o fundo do email é sempre branco.
- Sem emojis, sem gradientes.
- Rodapé: `EKAYA · Moçambique · apoio@exploreekaya.com` e, em EN, `EKAYA · Mozambique ·
apoio@exploreekaya.com`.

Quando o domínio de email estiver ativo e os modelos gerados (passo 1), os ficheiros dos modelos
ficam no projeto. A partir daí posso aplicar estes textos e este design diretamente no código, num
PR, sem gastar créditos da Lovable.

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

## 4. Magic link (entrada por link)

A app não oferece entrada por link hoje, mas a Lovable gera o modelo: deixá-lo traduzido.

- **Assunto:** O teu link de entrada Ekaya · Your Ekaya sign-in link
- **Título:** Entrar na Ekaya Explore
- **Texto (PT):** Usa o botão abaixo para entrar na tua conta. A ligação é válida durante pouco tempo e
  só pode ser usada uma vez.
- **Botão:** Entrar · Sign in
- **Nota (PT):** Se não pediste para entrar, ignora este email.
- **Separador:** — English —
- **Texto (EN):** Use the button above to sign in to your account. The link is valid for a short time
  and can only be used once.
- **Nota (EN):** If you didn't ask to sign in, you can ignore this email.

## 5. Reauthentication (código de confirmação)

- **Assunto:** Código de confirmação Ekaya · Your Ekaya confirmation code
- **Título:** Confirmar que és tu
- **Texto (PT):** Para continuar, escreve este código na aplicação. É válido durante pouco tempo.
- **Código:** a variável do código, que vem no modelo; não a mudar.
- **Nota (PT):** Se não estás a fazer nenhuma alteração na tua conta, ignora este email e muda a tua
  palavra-passe.
- **Separador:** — English —
- **Texto (EN):** To continue, enter this code in the app. It is valid for a short time.
- **Nota (EN):** If you are not changing anything in your account, ignore this email and change your
  password.

## 6. Invite

A app não convida pessoas por email hoje; deixar o modelo traduzido.

- **Assunto:** Convite para a Ekaya Explore · You're invited to Ekaya Explore
- **Título:** Foste convidado/a para a Ekaya Explore
- **Texto (PT):** Recebeste um convite para criar conta na Ekaya Explore, a plataforma de turismo
  comunitário em Moçambique. Usa o botão abaixo para aceitar.
- **Botão:** Aceitar convite · Accept invitation
- **Nota (PT):** Se não esperavas este convite, ignora este email.
- **Separador:** — English —
- **Texto (EN):** You've been invited to create an account on Ekaya Explore, the community tourism
  platform in Mozambique. Use the button above to accept.
- **Nota (EN):** If you weren't expecting this invitation, you can ignore this email.

## Última linha de todos os emails

- **PT:** Dúvidas? Escreve para apoio@exploreekaya.com.
- **EN:** Questions? Write to apoio@exploreekaya.com.
