# ApexENEM — UI do Cronograma e Calendário

Esta atualização melhora a parte visual e de usabilidade do cronograma inteligente e do calendário de revisões.

## Principais mudanças

- Cronograma com cabeçalho mais limpo e hierarquia visual melhor.
- Cards de resumo semanal redesenhados.
- Alerta de modo emergência com visual mais claro.
- Dias da semana com cabeçalho, tempo, pendências e barra de progresso.
- Tarefas do cronograma mais compactas e legíveis.
- Botões Concluir, Pular, Mover e Detalhes com ícones.
- Nova aba "Como funciona" dentro do cronograma.
- Backlog com cards, ações e explicação mais clara.
- Calendário de revisões com estados para atrasadas, hoje, amanhã, vazio e maior carga.
- Calendário com detalhes expansíveis por dia.

## Arquivos alterados

- css/schedule.css
- css/components.css
- js/components/scheduleView.js
- js/main.js
- service-worker.js

## Como testar

Rode o projeto com servidor local:

```bash
python -m http.server 5500
```

Acesse:

```txt
http://localhost:5500
```

Teste:

1. Clique em Cronograma.
2. Veja a aba Semana.
3. Veja a aba Configuração.
4. Veja a aba Backlog.
5. Abra a aba Como funciona.
6. Clique no botão Calendário no topo.
7. Confira o novo calendário de revisões no dashboard.

