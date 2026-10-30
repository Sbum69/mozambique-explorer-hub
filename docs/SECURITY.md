# Segurança do EKAYA Explore

Estado da auditoria SEG-FINAL (antes do lançamento). Base de dados: projeto Lovable Cloud
`0109a201-22dc-464d-bb9c-58c103bd551a`. Testes de acesso: `supabase/tests/security.sql` (e os
restantes ficheiros de `supabase/tests/`).

## 1. Resumo

| Área                       | Estado                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| RLS                        | Ligado nas 36 tabelas de `public`; 3 tabelas sem políticas de propósito (só por RPC)                           |
| Funções `SECURITY DEFINER` | 73, todas com `search_path` fixo; as de admin verificam o papel lá dentro                                      |
| Dados pessoais             | Reservas (nome, email, telefone): cliente, dono do negócio e admin; telefone do perfil: o próprio e admin      |
| Chave de serviço           | Só em código de servidor (`client.server.ts`, importada dentro dos handlers); não aparece no bundle do browser |
| Segredos no Git            | Nenhum (histórico verificado: JWT, `sk_`, `service_role`, chaves privadas, passwords)                          |
| XSS                        | Sem HTML vindo de dados; RSS só com links `http(s)`; texto sempre escapado pelo React                          |
| Redireções                 | `?redirect=` e `return_to` passam pela lista fechada `parseAuthReturn`                                         |
| Cabeçalhos                 | `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, CSP obrigatória (SEG-2)                     |

## 2. Matriz de RLS (resumo por tabela)

`anon` = visitante sem sessão; `auth` = com sessão. "dono" = o próprio utilizador (ou dono do negócio).

| Tabela                                                                                       | anon lê                      | auth lê                         | auth escreve                                                                      |
| -------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------- | --------------------------------------------------------------------------------- |
| `bookings`                                                                                   | —                            | cliente, dono do negócio, admin | cliente cria (pendente); dono e admin atualizam (guards de transição)             |
| `businesses`                                                                                 | aprovados                    | + o próprio, admin              | dono cria (pendente) e edita; admin decide                                        |
| `business_categories`, `provinces`, `community_categories`                                   | ativos                       | idem (+ admin tudo)             | admin                                                                             |
| `community_posts`                                                                            | publicados                   | + os próprios, admin            | autor cria/edita/apaga (estado forçado por trigger); admin modera                 |
| `community_post_reactions`                                                                   | de posts visíveis            | idem                            | o próprio                                                                         |
| `community_reports`                                                                          | —                            | denunciante, admin              | denunciante cria; admin resolve (carimbo por trigger)                             |
| `community_experiences`                                                                      | aprovadas e ativas           | + as próprias, admin            | proposta pendente; admin decide                                                   |
| `destinations`, `exchange_rates`, `game_catalog`                                             | tudo (catálogo público)      | tudo                            | admin / cron                                                                      |
| `experiences`, `experience_availability`                                                     | ativas de negócios aprovados | + dono, admin                   | dono e admin                                                                      |
| `favorites`, `destination_visits`, `news_likes`, `event_participations`, `profile_provinces` | —                            | o próprio (+ admin em alguns)   | o próprio                                                                         |
| `notifications`                                                                              | —                            | o próprio, admin                | só `read_at` do próprio (conteúdo imutável por trigger); criadas por triggers/RPC |
| `points_ledger`                                                                              | —                            | o próprio, admin                | ninguém (append-only por RPC)                                                     |
| `profiles`                                                                                   | —                            | o próprio, admin                | o próprio                                                                         |
| `rewards`, `reward_redemptions`                                                              | —                            | ativos / os próprios            | dono do negócio, admin; resgate por RPC                                           |
| `routes`, `route_days`, `route_stops`                                                        | públicos, ativos e aprovados | + os próprios, admin            | dono e admin (`can_edit_route`)                                                   |
| `route_progress`, `route_stop_progress`                                                      | —                            | o próprio, admin                | o próprio (provas por RPC)                                                        |
| `game_completions`, `game_quiz_attempts`, `game_steps`                                       | —                            | o próprio, admin                | só por RPC                                                                        |
| `user_roles`                                                                                 | —                            | o próprio                       | só por RPC de admin                                                               |
| `admin_broadcasts`, `exchange_rate_requests`, `game_quiz_questions`                          | —                            | —                               | só por RPC (sem políticas)                                                        |

Vista `community_post_authors` (sem `security_invoker`): expõe só `id`, `display_name` e
`avatar_url` de quem publicou na comunidade — de propósito, para mostrar o autor.

## 3. Funções privilegiadas

- Funções de admin (`admin_*`, `review_stop_proof`, `admin_business_owner_emails`): `FORBIDDEN`
  sem papel de admin.
- Funções usadas pelas políticas do visitante e por isso executáveis por `anon`:
  `can_view_route`, `commercial_activity_public`, `get_experience_availability`,
  `platform_impact_stats`, `news_like_counts`, `event_participant_counts`, `booked_people`.
- Retirado ao `anon` na 0045: `business_decide_booking`, `can_edit_route`, `owns_experience`,
  `generate_route_code`.
- SEG-2 — 2FA (TOTP, Supabase Auth MFA): Definições → Segurança ativa/desativa; o pedido do código
  aparece em qualquer página quando a conta tem 2FA e a sessão é só com palavra-passe. A rota
  `/admin` exige `aal2` (`requireAdmin`); a 0050 faz o mesmo em `has_role(auth.uid(), 'admin')`
  (60 políticas e 26 funções). Jobs sem sessão e verificações sobre outros utilizadores não mudam.
- LEGAL-1 (0049), sem `anon`: `legal_acceptances` só de leitura para o próprio e o admin (sem grants
  de escrita; UPDATE bloqueado por trigger). `accept_legal_documents` só aceita as versões em vigor;
  o trigger `on_auth_user_created_legal` grava a aceitação do registo com a hora do servidor.
- Pré-lançamento (0046–0048), todas sem `anon`:
  - `delete_my_account(_confirm)`: o próprio, com a palavra de confirmação; recusa o último admin e
    reservas futuras; sem registos apaga o utilizador (cascata), com registos anonimiza (reservas sem
    nome nem contactos, negócios suspensos, papéis retirados, login desligado, email libertado).
    A anonimização das reservas passa pelo guarda só sem sessão e com a marca local
    `ekaya.anonymise` (definida apenas dentro da função; não exposta pela API).
  - `admin_set_internal`, `admin_platform_summary`: só admin (`FORBIDDEN`); `is_internal_user`.
  - Trigger `profiles_guard_privileged_fields`: `deleted_at` e `is_internal` só mudam pelo admin ou
    por funções do servidor.
  - Trigger `notifications_skip_muted`: notificações silenciadas pelo próprio não são criadas;
    reservas, negócio, segurança e avisos da plataforma não se podem silenciar (CHECK).
- Guarda das rotas privadas (`requireAuthenticatedUser`): usa a sessão guardada no browser
  (`getSession`) para decidir se mostra a página — é só navegação; todas as leituras e escritas
  continuam protegidas pela RLS.
- Cron (`postgres`): `expire_stale_bookings` (diário), `request_exchange_rates` +
  `apply_exchange_rates` (diário, com nova tentativa). As funções são `SECURITY DEFINER` e não
  aceitam parâmetros.

## 4. Storage

| Bucket             | Público | Limite | Tipos (0045)  | Leitura                                                              |
| ------------------ | ------- | ------ | ------------- | -------------------------------------------------------------------- |
| `community-photos` | não     | 5 MB   | imagens       | foto de experiência aprovada e ativa (todos); a própria pasta; admin |
| `route-proofs`     | não     | 8 MB   | imagens       | a própria pasta; admin                                               |
| `game-proofs`      | não     | 8 MB   | imagens       | a própria pasta; admin                                               |
| `avatars` (0046)   | sim     | 2 MB   | JPEG/PNG/WebP | pública (foto de perfil); escrita só na própria pasta                |

Upload só na pasta do próprio utilizador. Ficheiros servidos por signed URLs.

## 5. Cabeçalhos HTTP (todas as páginas)

Definidos em `src/lib/security-headers.ts` (rota raiz):

- `Content-Security-Policy` (obrigatória desde o SEG-2): `default-src 'self'`; scripts e estilos `'self'` +
  inline (hidratação e script do tema); imagens da Supabase, dos mosaicos do mapa e do Unsplash;
  ligações à Supabase (https e wss), OSRM, Open-Meteo e Lovable; `frame-ancestors` `'self'` e os
  domínios da Lovable (o editor mostra a app num iframe); `object-src 'none'`.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy`: localização e câmara só no próprio site; microfone, pagamentos e USB
  desligados.
- Sem `X-Frame-Options` (não permite listar a Lovable); a proteção contra iframes vem do
  `frame-ancestors`.

Para passar a CSP a obrigatória: abrir o preview da Lovable e o site publicado com a consola do
browser aberta, percorrer as páginas e confirmar que não há avisos "Content Security Policy";
depois trocar `Content-Security-Policy-Report-Only` por `Content-Security-Policy`.

## 6. Autenticação

- Login: mensagem genérica ("Email ou palavra-passe incorretos").
- Recuperação: a mesma resposta exista ou não a conta.
- Registo: com a confirmação de email ligada, a Supabase não revela contas existentes; a mensagem
  "Este email já está registado" só aparece se a confirmação for desligada — manter ligada.
- Palavras-passe em fugas de dados: a app já trata a recusa da Supabase (proteção ativa).
- Recomendações (não aplicadas): 2FA (TOTP) obrigatório para administradores; rever os limites de
  tentativas e a duração da sessão nas definições de autenticação da Lovable Cloud.

### 6.1 Como um administrador ativa a verificação em dois passos (2FA)

Texto para enviar a cada administrador. A administração só abre com o código.

1. **Instala uma aplicação autenticadora no telemóvel**, se ainda não tiveres. Qualquer uma destas serve:
   - Google Authenticator;
   - Microsoft Authenticator;
   - Aegis, em Android.
2. **Entra no EKAYA** com o teu email e palavra-passe, no computador ou no telemóvel.
3. **Abre as Definições** (menu da conta, no canto superior direito) e vai à secção **Segurança**.
4. **Carrega em "Ativar verificação em dois passos".** Aparece um código QR.
5. **Na aplicação autenticadora, escolhe "Adicionar conta" e lê o código QR.**
   - Se não conseguires lê-lo, escreve a chave que aparece por baixo do QR.
   - A aplicação passa a mostrar "EKAYA", com um código de 6 dígitos que muda a cada 30 segundos.
6. **Escreve o código de 6 dígitos no EKAYA e carrega em "Confirmar".** Aparece "Verificação em dois passos ativa".
7. A partir daí, depois da palavra-passe, o EKAYA pede sempre o código da aplicação.

**Se mudares de telemóvel**, ativa a aplicação no telemóvel novo antes de apagares a antiga.

**Se perderes o telemóvel**, pede a outro administrador para retirar a 2FA da tua conta e volta a ativá-la.

- Hoje isso faz-se no painel da Supabase/Lovable (Authentication → Users → o utilizador → remover o fator).
- Até haver um botão na administração, este pedido é feito ao responsável técnico.

**Nunca envies o código nem a chave a ninguém.** A equipa do EKAYA nunca os pede.

## 7. Corrigido no SEG-FINAL

Migração `0045_security_hardening` (aplicada; `supabase/tests/security.sql`: 15/15 PASS):

- **Médio** — `anon` tinha INSERT/UPDATE/DELETE/TRUNCATE em 24 tabelas (grants por omissão; a RLS
  já recusava as escritas, o TRUNCATE não passa pela RLS mas não é exposto pela API): retirados;
  TRUNCATE retirado também a `authenticated`.
- **Médio (funcional)** — visitantes não liam as fotos aprovadas de `community-photos` (a política
  chamava `has_role`, que `anon` não executa): política dividida por papel.
- **Baixo** — `business_decide_booking`, `can_edit_route`, `owns_experience`,
  `generate_route_code` deixaram de ser executáveis por `anon`.
- **Baixo** — links de notificação começados por `//` recusados pela BD.
- **Baixo** — buckets só aceitam imagens (JPEG, PNG, WebP, GIF, HEIC/HEIF; sem SVG).

Aplicação:

- **Crítico** — `seroval` 1.6.0 (serialização do TanStack Start, servidor e browser): override para
  1.7.3 (com `seroval-plugins`).
- `bun audit fix` dentro dos intervalos: 89 → 37 vulnerabilidades, 0 críticas.
- Cabeçalhos de segurança e `noopener` nos links externos.

## 7.1 Pendente

- Ficheiros de provas (`route-proofs`, `game-proofs`) de contas apagadas ficam no storage, sem dono
  que os possa ler (só o admin): limpeza periódica a decidir.

- `zod` 3.25.76 (validadores das server functions): aviso alto de memória com coleções enormes; a
  correção só existe no zod 4 (mudança major — migrar num bloco próprio). Exposição baixa: as
  entradas são pequenas e quase todas exigem sessão.
- Ferramentas de desenvolvimento ainda com avisos (`undici`, `ws` 8.18.0, `sharp`, `esbuild`):
  não entram no bundle; atualizar quando o wrangler/plugin da Cloudflare subirem.
- CSP obrigatória: verificada localmente nas 29 páginas da QA (`csp.ts`, 0 violações); confirmar a
  consola no preview da Lovable e no site publicado (o preview pede sessão: 401).
- 2FA para administradores (recomendação).

## 8. Checklist de lançamento

- [ ] Apagar ou desativar as 3 contas de teste (turista, negócio, admin) e o negócio
      "EKAYA Teste — não reservar" (estão marcadas como internas e fora das métricas, mas continuam
      a existir).
- [ ] Decidir sobre as 2 contas internas que ficaram (Kelvin e o 2.º admin).
- [ ] Remover a cópia de teste das credenciais (`.env.test.local`) das máquinas de quem testou.
- [ ] Rever os Redirect URLs (Lovable → Users → Settings → Advanced): só o domínio publicado
      (e o próprio, quando existir) com `/auth/callback`.
- [ ] Domínio próprio e emails de autenticação (ver `docs/email-templates.md`).
- [ ] Ligar 2FA para os administradores.
- [ ] Confirmar a CSP sem avisos e passá-la a obrigatória.
- [ ] Correr `docs/QA.md` (testes de BD incluídos) no projeto final.
