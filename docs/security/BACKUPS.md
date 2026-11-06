# Backups e restauro

> Verificado por leitura da documentação oficial a 06/11/2026. Os valores dependem do plano e podem
> mudar: confirmar no painel antes do lançamento.

## O que existe hoje

| O quê                                          | Backup automático?                                                                                | Retenção                           | Onde se vê                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------ |
| Base de dados (tabelas, funções, RLS, contas)  | Sim: backup **diário** da Lovable Cloud (Supabase por baixo)                                      | Cerca de **14 dias** **[VALIDAR]** | Lovable → Cloud → Database → Backups |
| Recuperação para um instante (PITR)            | **Não** por omissão. Na Supabase é um extra pago; na Lovable Cloud não está exposto **[VALIDAR]** | —                                  | —                                    |
| Ficheiros do Storage (fotos, provas, avatares) | **Não**: os backups da BD guardam só os metadados dos objetos, não os ficheiros                   | —                                  | —                                    |
| Código                                         | Sim: GitHub (`main` e branches)                                                                   | Ilimitada                          | GitHub                               |
| Migrações                                      | Sim: `drizzle/migrations` no repositório (refazem o esquema, não os dados)                        | Ilimitada                          | Repositório                          |

**Conclusão:** com backups diários, pode perder-se até 1 dia de dados. As fotos e as provas não têm
backup. Para um lançamento pequeno, a alternativa grátis abaixo cobre o que falta.

## O que tens de fazer (alternativa grátis)

### Semanal (ex.: à segunda-feira), 10 minutos

1. **Exportar a BD.** No painel da Lovable Cloud (Database → Backups), descarrega o backup mais
   recente, se houver botão de descarga. Se não houver, usa `pg_dump` com a connection string do
   painel (Cloud → Settings → Database). Nunca a coles no chat nem no repositório.

   ```sh
   pg_dump "<connection string>" --format=custom --no-owner --file="ekaya-AAAA-MM-DD.dump"
   ```

   **[VALIDAR]** se a Lovable Cloud dá acesso direto ao Postgres. Se não der, pede à Lovable uma
   exportação ou confirma que o backup diário chega.

2. **Descarregar o Storage.** Descarrega os buckets `community-photos`, `route-proofs`, o das provas dos
   jogos, `content-photos` e `avatars`. Usa o painel (Cloud → Storage) ou um script com a service role
   corrido só na tua máquina.
3. **Guardar cifrado** fora da conta Lovable: um disco externo, ou uma nuvem pessoal com cifra. Mantém
   as últimas 4 semanas e apaga as mais antigas. Têm dados pessoais: aplica-se a Política de
   Privacidade (prazos e segurança).

### Antes de cada migração de risco

Faz um backup manual (passo 1) antes de migrações que apagam ou transformam dados.

## Restauro

### A. Dados apagados ou estragados há menos de ~14 dias

1. Pára as escritas na área afetada. Desliga a funcionalidade (`docs/security/INCIDENTES.md`, secção 3).
2. Lovable → Cloud → Database → Backups → escolhe o backup anterior ao problema → Restore.
   - **Atenção:** o restauro substitui a BD inteira. Perdem-se as escritas feitas depois desse backup.
   - Se só faltar uma tabela, é melhor restaurar o dump semanal numa BD temporária e copiar só as
     linhas em falta, com SQL aprovado.
3. Depois do restauro, confirma por leitura:
   - `select count(*) from drizzle.__drizzle_migrations` (tem de dar o número de migrações do
     repositório);
   - `current_legal_versions()`;
   - os papéis de admin e a 2FA.
4. Regista no registo de incidentes.

### B. A partir do dump semanal

```sh
pg_restore --dbname="<connection string de uma BD temporária>" --no-owner --clean --if-exists ekaya-AAAA-MM-DD.dump
```

Copia para produção só o necessário, numa transação, com o SQL aprovado.

### C. Ficheiros do Storage

Volta a carregar os ficheiros para o mesmo bucket e o mesmo caminho (`<id>/<ficheiro>`), para os
caminhos guardados na BD continuarem válidos.

## Teste de restauro

**[FUTURO]** Uma vez por trimestre:

1. restaurar o dump semanal numa BD temporária;
2. confirmar as contagens das tabelas principais;
3. registar a data aqui.
