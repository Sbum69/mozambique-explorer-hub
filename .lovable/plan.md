# Bloco 6A — Autenticação real

## Objetivo
Substituir apenas o login, registo, sessão e controlo de acesso simulados pela autenticação real do Lovable Cloud, preservando temporariamente XP, preferências, visitas e restantes dados ainda locais.

## Implementação
- Ativar autenticação por email e palavra-passe sem alterar a política atual de confirmação de email.
- Criar uma migration mínima que atribui `tourist` no servidor a cada novo utilizador, sem aceitar roles do cliente e sem permitir autoatribuição privilegiada.
- Refatorar o contexto global para:
  - restaurar a sessão real ao iniciar;
  - acompanhar login, logout, expiração e atualização da sessão;
  - carregar `profiles` e `user_roles` pela identidade autenticada;
  - manter a API usada pelas páginas e preservar os dados locais não migrados numa chave separada por utilizador;
  - remover passwords, utilizadores demo, `ekaya.auth.user` e `ekaya.registeredUsers` do fluxo de autenticação.
- Atualizar Login para email + palavra-passe, mensagens de erro claras e redirecionamento por role real.
- Atualizar Signup para criar a conta real, enviar apenas metadata segura para o perfil e tratar corretamente confirmação de email.
- Manter “continuar como convidado” como modo público local, sem o considerar uma sessão autenticada nem lhe conceder acesso privilegiado.
- Implementar uma proteção central reutilizável para páginas privadas e proteções específicas de admin e negócio, sempre baseadas na sessão e em `user_roles`.
- Tornar logout assíncrono, terminar a sessão real e limpar apenas o estado de autenticação.
- Não migrar o registo de negócios neste bloco; o formulário atual deixará de criar credenciais simuladas e encaminhará para o registo normal de conta quando necessário.

## Verificação
- Confirmar signup, criação automática de profile e role `tourist`.
- Confirmar login válido, password errada e utilizador inexistente.
- Confirmar persistência após refresh e remoção da sessão após logout.
- Confirmar que alterações em localStorage não concedem admin/business.
- Confirmar que não há passwords ou service role no frontend.
- Verificar páginas privadas, públicas, erros de runtime e compilação.
- Reportar quaisquer limitações de testes relacionadas com confirmação de email, sem a desativar.

## Fora do âmbito
Bookings, favoritos, roteiros, XP, gamificação, comunidade, notificações, conteúdo mock, pagamentos e Bloco 6B permanecem sem migração.
