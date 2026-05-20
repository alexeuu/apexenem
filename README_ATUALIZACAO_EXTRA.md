# ApexENEM — atualização extra

Esta versão adiciona melhorias em cima do ApexENEM com PWA, Reta Final e Cronograma.

## Implementado

- Tela inicial simples "Hoje no ApexENEM"
- Plano da semana simples
- Página/modal de Simulados
- Relação entre erro e assunto: erros recorrentes aumentam prioridade do assunto
- Busca melhor com sugestões rápidas
- Aviso de modo offline confiável
- Pré-visualização do backup antes de importar

## Como testar

1. Rode `python -m http.server 5500`
2. Abra `http://localhost:5500`
3. Teste os botões: Plano da semana, Simulados, Caderno de erros, Salvar/Carregar progresso.
4. Na busca, digite termos como `ohm`, `R0`, `alta`, `erro`, `atrasado`.
5. Registre erros em um assunto e veja a prioridade dele subir na fila.
