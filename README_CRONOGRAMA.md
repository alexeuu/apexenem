# ApexENEM — Cronograma inteligente Pro

## Lógica rápida

O cronograma é diferente da revisão espaçada:

- Revisão espaçada: decide quando voltar em um conteúdo já estudado.
- Cronograma: decide como distribuir a semana respeitando seu tempo.

## Como ele escolhe as tarefas

A fila é ordenada por prioridade real:

1. Revisões atrasadas
2. Erros salvos importantes
3. Prioridade alta
4. R0, R1 e R2
5. Assuntos ainda não iniciados
6. Maior incidência ENEM
7. Prioridade média
8. Prioridade baixa
9. Muito baixa só se sobrar tempo

## Tipos de bloco

- Revisão
- Revisão rápida
- Assunto novo
- Exercícios
- Correção de erro

## Não estudei hoje

Quando você clica em “Não estudei hoje”, o sistema:

1. Marca o dia atual como perdido.
2. Não apaga progresso.
3. Pega as tarefas pendentes daquele dia.
4. Reorganiza os próximos dias disponíveis.
5. Mantém tarefas urgentes no topo.
6. Manda o que não couber para o backlog.

## Backlog

Backlog é o que não coube na semana. O conteúdo continua existindo; ele apenas não entrou no cronograma por limite de tempo.

Você pode:

- Ver o backlog.
- Reorganizar o backlog.
- Puxar uma tarefa para a semana.
- Limpar tarefas de prioridade baixa do backlog atual.

## Modo emergência

Quando acumula muita tarefa, o cronograma ativa uma lógica essencial:

- Corta prioridade baixa temporariamente.
- Corta prioridade muito baixa.
- Foca em atrasados.
- Foca em prioridade alta.
- Foca em R0/R1/R2.
- Foca em erros importantes.
- Reduz assunto novo que não seja urgente.

## Arquivos principais

- `js/services/schedule.js`: lógica do cronograma.
- `js/components/scheduleView.js`: tela do cronograma.
- `css/schedule.css`: visual do cronograma.
