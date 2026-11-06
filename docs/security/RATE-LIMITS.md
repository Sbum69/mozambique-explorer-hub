# Limites de pedidos (rate limiting)

> Verificado a 06/11/2026: documentação oficial da Supabase
> (https://supabase.com/docs/guides/auth/rate-limits) e as migrações do repositório.

## 1. Autenticação (Supabase Auth, por omissão)

Os valores do projeto podem ser diferentes. Confirma-os no painel (Lovable → Cloud → Auth → Rate
limits) **[VALIDAR]**.

| Ação                                                               | Endpoint                                          | Limite por omissão                   | Âmbito         |
| ------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------ | -------------- |
| **Login com palavra-passe** (e renovação da sessão)                | `/token`                                          | 150 pedidos / 5 min (rajadas até 30) | Por IP         |
| **Registo** (e recuperação, reenvio, OTP, alteração do utilizador) | `/signup`, `/recover`, `/resend`, `/otp`, `/user` | 30 pedidos / 5 min                   | Por IP         |
| **Recuperação da palavra-passe**                                   | `/recover`                                        | 1 pedido / 60 s                      | Por utilizador |
| Confirmação do registo                                             | `/signup`                                         | 1 pedido / 60 s                      | Por utilizador |
| Verificação (links e códigos)                                      | `/verify`                                         | 30 pedidos / 5 min                   | Por IP         |
| 2FA (desafio e verificação)                                        | `/factors/:id/…`                                  | 15 pedidos / min (não configurável)  | Por IP         |
| Emails enviados (servidor de email incluído)                       | todos                                             | **2 emails / hora**                  | Projeto        |

Pedidos acima do limite recebem `429`. A app trata o `429` da recuperação ("rate" em
`src/lib/password-reset.ts`). A resposta é sempre a mesma, para não revelar se uma conta existe.

### Avaliação do login

150 tentativas por 5 minutos e por IP chegam para travar ataques automáticos grandes, mas são largas
para tentativas de adivinhar uma palavra-passe. O mesmo limite cobre a renovação de sessões. Em
Moçambique, muitos utilizadores móveis partilham o mesmo IP (CGNAT). Baixar demasiado este limite
bloquearia pessoas legítimas.

**Proposta [DECIDIR], no painel (Cloud → Auth):**

1. **Rate limits → Token endpoint**: baixar de 150 para **90 / 5 min**. É um compromisso entre a
   proteção e os IPs partilhados.
2. **Rate limits → Sign-ups and sign-ins**: manter 30 / 5 min.
3. **Password → comprimento mínimo**: subir de 6 para **8**, e exigir letras e números.
   - Mudar também `MIN_PASSWORD_LENGTH` em `src/lib/password-reset.ts`, para a app avisar antes.
   - Isto aplica-se a palavras-passe novas.
4. **Email**: o limite de 2 emails/hora do servidor incluído é baixo para o lançamento (registos e
   recuperações). **[DECIDIR]** Configurar um SMTP próprio com plano grátis (ex.: Resend, Brevo) e
   subir o limite para 30/hora. O fornecedor entra em `docs/legal/SUBCONTRATANTES.md` e na Política.
5. **CAPTCHA [FUTURO]**: a Supabase suporta hCaptcha e Cloudflare Turnstile. Ambos carregam um script
   de terceiros, o que hoje não se faz. Avaliar só se houver abuso.

## 2. Limites próprios da app (na BD, por RPC)

| Funcionalidade                                 | Limite                                                                                                                | Onde                                              |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Pedidos de adesão ("Para negócios", visitante) | **3 por dia por IP** (código diário com hash, sem guardar o IP) e **200 por dia no total**; campo-armadilha para bots | `submit_business_lead`, 0055                      |
| Perguntas sem resposta do assistente           | 500 por dia no total. A partir daí, não grava (o utilizador não vê erro)                                              | 0056                                              |
| Avaliações do assistente                       | 2 000 por dia no total                                                                                                | 0056                                              |
| IA do assistente (desligada)                   | Teto de 9 000 Neurons/dia (plano grátis do Workers AI)                                                                | `assistant_llm_usage`, 0056                       |
| Registo de erros da app                        | 2 000 por dia no total; mensagens cortadas a 300 caracteres e sem dados pessoais                                      | `log_app_error`, 0057                             |
| Avisos do admin                                | 10 por admin por hora                                                                                                 | `admin_send_notification`, 0042                   |
| Reservas                                       | Validações de integridade (datas, capacidade, um pedido ativo); sem limite por hora                                   | ver `supabase/tests/seg-2_bookings_integrity.sql` |

**[FUTURO]** Os limites "no total" protegem a BD e a quota, mas um abusador pode gastá-los e impedir
envios legítimos nesse dia. Se acontecer, passar a limites por IP (código com hash, como nos pedidos
de adesão).
