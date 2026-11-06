# Privilégios de administração (menor privilégio)

## Quem é admin

O papel `admin` (`user_roles`) é dado só a quem gere a plataforma. A 06/11/2026 há 2 contas admin:

| Conta                             | Para quê                                          | 2FA        |
| --------------------------------- | ------------------------------------------------- | ---------- |
| Conta pessoal do responsável      | Gestão diária                                     | Verificada |
| Conta de teste de admin (interna) | Acesso de reserva e testes, **até ao lançamento** | Verificada |

Antes do lançamento, a conta de teste é apagada ou perde o papel. Fica então 1 admin. Se for preciso
um segundo admin de reserva, tem de ser uma pessoa de confiança, com 2FA.

Os emails não ficam neste ficheiro: veem-se por leitura na BD.

## Regras

1. **2FA obrigatória.** Os poderes de admin só existem numa sessão `aal2` (`has_role`, 0050). Sem
   2FA, a conta admin comporta-se como uma conta normal. Como ativar: `docs/SECURITY.md`, secção 6.1.
2. **Menor privilégio.**
   - Negócios têm `business_small`/`business_large` e só veem os seus dados (RLS).
   - Ninguém recebe `admin` para "ver uma coisa".
   - A chave service role existe só no servidor.
3. **Tudo fica registado.** As mudanças de papéis (`admin_set_user_role`) escrevem em `admin_audit`
   desde a 0060: quem, o quê, papéis antes e depois. As outras ações de admin (FAQ, condições
   comerciais, destaques) também escrevem lá.
4. **Salvaguardas na BD.** Ninguém retira o próprio papel de admin (`CANNOT_REVOKE_OWN_ADMIN`). O
   último admin não pode ser removido (`LAST_ADMIN`).

## Revisão trimestral (janeiro, abril, julho, outubro)

Só leituras, cerca de 15 minutos:

1. Lista os admins e confirma que cada um tem um fator 2FA verificado:
   ```sql
   select ur.user_id, p.display_name,
          exists (select 1 from auth.mfa_factors f where f.user_id = ur.user_id and f.status = 'verified') as tem_2fa
   from public.user_roles ur join public.profiles p on p.id = ur.user_id
   where ur.role = 'admin';
   ```
2. Revê as mudanças de papéis do trimestre:
   ```sql
   select created_at, actor_id, entity_id, action, before, after, reason
   from public.admin_audit where entity = 'user_roles' and created_at > now() - interval '3 months'
   order by created_at desc;
   ```
3. Retira o papel a quem já não precisa (pela app, que fica registado).
4. Confirma que a chave service role não foi exposta: não está no repositório nem nos registos do CI.
   Roda-a se houver dúvida (`INCIDENTES.md`, secção 3).
5. Anota a data e o resultado aqui:

| Data | Admins | Todos com 2FA | Alterações | Quem reviu |
| ---- | ------ | ------------- | ---------- | ---------- |
|      |        |               |            |            |
