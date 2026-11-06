# Encarregado de proteção de dados (DPO) e contacto de privacidade

> Rascunho — sujeito a revisão jurídica. 06/11/2026.

## Contacto de privacidade

Os pedidos sobre dados pessoais (acesso, retificação, apagamento, oposição, queixas) vão para o email
de suporte, `SUPPORT_EMAIL` em `src/lib/app-info.ts`. Esse email aparece na Política de Privacidade
(secções 1 e 7), no rodapé e em Definições → Sobre. A resposta é dada em 30 dias. Se o pedido for
complexo, avisa-se a pessoa dentro desse prazo e pode prolongar-se até mais 60 dias.

Quem responde: o responsável do EKAYA (Sheldon Jasse), enquanto a equipa for de uma pessoa.

## É preciso um DPO formal?

**Provavelmente não, à escala atual. [VALIDAR COM JURISTA]**

O RGPD (art. 37.º) só obriga a designar um DPO em três casos:

1. o tratamento é feito por uma autoridade ou organismo público;
2. a atividade principal é o controlo regular e sistemático de pessoas em grande escala;
3. a atividade principal é tratar em grande escala categorias especiais de dados (saúde, origem,
   religião…) ou dados sobre condenações.

O EKAYA não é público. Trata dados de conta, reservas e atividade de um número pequeno de pessoas. Não
faz perfis para publicidade nem segue o comportamento das pessoas. Também não trata categorias
especiais: a localização só é usada quando a pessoa a pede, e as fotos não são usadas para identificar
ninguém. Nenhuma das três condições parece aplicar-se.

Mesmo sem DPO, mantém-se:

- um contacto de privacidade visível (acima);
- o registo das atividades de tratamento (a Política e `docs/legal/SUBCONTRATANTES.md` servem de base);
- o processo de incidentes (`docs/security/INCIDENTES.md`).

A decisão de não designar um DPO, com esta justificação, deve ser registada e revista quando:

- o número de utilizadores crescer muito;
- o assistente com IA for ligado;
- passar a haver pagamentos na app;
- forem tratados dados sensíveis.

**Moçambique: [VALIDAR COM JURISTA].** Confirmar se a legislação aplicável exige um responsável ou um
registo junto de alguma autoridade:

- a Lei n.º 3/2017 (Transações Eletrónicas);
- uma eventual lei de proteção de dados pessoais em vigor à data do lançamento.

## Auditor

Não é obrigatório nesta fase. A revisão de segurança faz-se em cada PR (`docs/security/REVISAO.md`) e
os privilégios de administrador são revistos todos os trimestres (`docs/security/PRIVILEGIOS.md`).
