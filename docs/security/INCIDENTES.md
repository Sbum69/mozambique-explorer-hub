# Plano de resposta a incidentes

> Rascunho — sujeito a revisão jurídica nos prazos de notificação. 06/11/2026.

Um incidente é qualquer acontecimento que ponha em risco a confidencialidade, a integridade ou a
disponibilidade dos dados ou do serviço. Exemplos:

- uma conta comprometida;
- dados vistos por quem não devia;
- uma chave exposta;
- a app em baixo;
- dados apagados por engano.

## 1. Papéis

| Papel                      | Quem                                       | O que faz                                                                          |
| -------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Responsável pelo incidente | Sheldon Jasse (responsável do EKAYA)       | Decide, contém, notifica e fecha o incidente. Mantém o registo (secção 6).         |
| Apoio técnico              | Quem estiver a desenvolver (incl. agente)  | Investiga só com leituras, prepara o SQL de correção, que só corre com aprovação.  |
| Contacto externo           | Lovable / Supabase (suporte da plataforma) | Restauro de backups, registos da plataforma, incidentes da própria infraestrutura. |
| Aconselhamento jurídico    | Jurista **[VALIDAR COM JURISTA]**          | Confirma se é preciso notificar e o texto das notificações.                        |

## 2. Deteção

| Fonte                                  | Onde                                                      | Com que frequência                                          |
| -------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| Registo de erros da app (`app_errors`) | Admin → Estado do lançamento (erros das últimas 24 h)     | Diariamente na primeira semana; depois, semanalmente        |
| Painel de estado do lançamento         | Admin → Estado do lançamento                              | Diariamente na primeira semana                              |
| Registos da Supabase (Auth, API, BD)   | Lovable → Cloud → Logs                                    | Quando há suspeita, ou um erro novo no registo              |
| Registo de auditoria (`admin_audit`)   | BD (leitura): ações de administração e mudanças de papéis | Na revisão trimestral (PRIVILEGIOS.md) e se houver suspeita |
| Denúncias e emails                     | Email de suporte; denúncias da comunidade                 | À medida que chegam                                         |

**Alerta por email acima de X erros por hora: [FUTURO].**

- A forma grátis seria um `pg_cron` a contar os `app_errors` da última hora, que chama um envio de
  email por `pg_net`.
- Hoje não há fornecedor de email transacional configurado fora da autenticação, por isso o alerta
  não existe.
- Quando houver um fornecedor com plano grátis (ex.: Resend), criar o job com um limite inicial de
  50 erros por hora. Isto precisa de uma migração aprovada.
- Até lá, o registo é visto à mão (tabela acima).

O registo de erros não guarda dados pessoais:

- `log_app_error` esconde emails, UUIDs e números longos e corta as mensagens a 300 caracteres;
- os registos `console.*` das server functions só têm ids internos e mensagens de erro, sem emails,
  tokens nem chaves.

## 3. Contenção (pela ordem que fizer sentido)

1. **Terminar sessões.** Conta comprometida: Lovable → Cloud → Users → utilizador → terminar sessões
   (ou forçar a mudança da palavra-passe). Admin comprometido: retirar o papel com
   `admin_set_user_role(…, 'admin', false)`. Fica registado em `admin_audit` desde a 0060.
2. **Suspender uma conta ou um negócio.**
   - Negócio: Admin → Negócios → Suspender (`admin_decide_business`).
   - Conta: retirar os papéis e, se for preciso, bloquear o utilizador no painel da Cloud.
3. **Desligar funcionalidades** por flags no código (deploy de uma linha):
   - `ASSISTANT_LLM_ENABLED` (IA do assistente);
   - `SHOW_EMERGENCY_NUMBERS`;
   - pedidos de destaque e de adesão, se for preciso (desligar o botão e recusar na RPC).
4. **Rodar chaves da Supabase** se uma chave secreta (service role) puder ter sido exposta: Lovable →
   Cloud → Settings → API keys → rodar, e atualizar o segredo no servidor. A chave publicável
   (`VITE_SUPABASE_PUBLISHABLE_KEY`) é pública por natureza e está protegida pela RLS. Só se roda se
   houver abuso.
5. **Restaurar dados** apagados ou estragados: ver `docs/security/BACKUPS.md`.

Guardar provas antes de corrigir: capturas, linhas dos registos, hora (UTC e Maputo).

## 4. Notificação

| A quem                                               | Quando                                                                                           | Prazo                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Autoridade de controlo da UE (há utilizadores na UE) | Violação de dados pessoais com risco para as pessoas (RGPD, art. 33.º)                           | **72 horas** desde que se teve conhecimento. Se não houver tudo, notificar por fases |
| Pessoas afetadas                                     | Se o risco for elevado (RGPD, art. 34.º): palavras-passe, contactos, localização, fotos privadas | Sem demora injustificada                                                             |
| Moçambique                                           | **[VALIDAR COM JURISTA]** autoridade competente, obrigação e prazo                               | **[VALIDAR COM JURISTA]**                                                            |
| Lovable / Supabase                                   | Se o incidente vier da plataforma ou precisar dela                                               | Logo que possível                                                                    |

Autoridade da UE: a do país onde estão as pessoas afetadas, enquanto o EKAYA não tiver
estabelecimento na UE. **[VALIDAR COM JURISTA]** Confirmar também se é preciso nomear um representante
na UE (RGPD, art. 27.º).

Mesmo que não seja preciso notificar, o incidente entra no registo (secção 6).

## 5. Modelo de email para as pessoas afetadas

Assunto: **EKAYA — aviso de segurança sobre a tua conta**

> Olá,
>
> No dia [data], detetámos [o que aconteceu, em linguagem simples]. Os dados envolvidos foram
> [lista: ex. email e nome a mostrar]. **Não** foram envolvidos [ex. palavras-passe, que estão cifradas].
>
> O que já fizemos: [ex. terminámos todas as sessões, corrigimos a falha, avisámos a autoridade].
>
> O que te recomendamos: [ex. muda a palavra-passe em Definições → Conta; desconfia de emails que
> > peçam os teus dados em nome do EKAYA].
>
> Se tiveres dúvidas, responde a este email ou escreve para [SUPPORT_EMAIL]. Podes também apresentar
> queixa à autoridade de proteção de dados.
>
> Pedimos desculpa pelo incómodo.
> Sheldon Jasse, EKAYA

English version: same structure, subject **"EKAYA — security notice about your account"**.

## 6. Registo de incidentes

Guardar fora do repositório (ex.: uma folha privada), uma linha por incidente, **sem dados pessoais
das pessoas afetadas**:

| N.º | Data/hora deteção | Data/hora início | Descrição | Dados e n.º de pessoas | Risco (baixo/médio/elevado) | Contenção | Notificado a (e quando) | Lições e ações | Fechado em |
| --- | ----------------- | ---------------- | --------- | ---------------------- | --------------------------- | --------- | ----------------------- | -------------- | ---------- |
|     |                   |                  |           |                        |                             |           |                         |                |            |

Rever este plano depois de cada incidente e, no mínimo, uma vez por ano.
