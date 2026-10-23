# Bloco 7A — Cultura & História

## Objetivo
Corrigir a tradução PT/EN de toda a secção Cultura & História e ampliar apenas a área de leitura dos detalhes, preservando conteúdo, design e navegação existentes.

## Alterações
- Reutilizar `LanguageProvider`, `useLang` e `LanguageToggle`; não criar outro sistema de idioma.
- Converter os seis tópicos locais para campos PT/EN, incluindo títulos, subtítulos, datas, resumos, secções e curiosidades.
- Traduzir todos os restantes textos visíveis e acessíveis da página: cabeçalho, apresentação, etiquetas, ações, texto do diálogo, alternativas de imagem e rótulos de fechar.
- Manter a seleção global já persistida pelo contexto durante a navegação e garantir atualização imediata em ambas as direções.
- Aumentar apenas o diálogo de detalhe e a sua área rolável, com proporções adequadas em desktop e mobile; preservar cartões e layout global.
- Não alterar a lógica do botão Voltar.
- Atualizar `EKAYA_FIXES.md` com o audit, a correção e os testes do Bloco 7A.

## Verificação
- Testar todas as seis abas/tópicos em PT e EN.
- Alternar PT → EN → PT repetidamente, incluindo com um detalhe aberto.
- Confirmar navegação entre tópicos e botão Voltar.
- Validar desktop e mobile, consola e compilação.
