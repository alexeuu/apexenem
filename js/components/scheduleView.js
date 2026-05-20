/**
 * ApexENEM • scheduleView.js
 * Interface visual do cronograma inteligente.
 *
 * Mantém a lógica em js/services/schedule.js e cuida apenas da experiência:
 * - Semana mais limpa
 * - Cards mais claros
 * - Backlog organizado
 * - Aba "Como funciona"
 */

import {
  DAY_LABELS,
  DAY_ORDER,
  backlogBreakdown,
  clearLowPriorityBacklog,
  clearSchedulePlan,
  completeTaskProgress,
  ensureCurrentPlan,
  findTaskInPlan,
  formatDateBR,
  generateSchedulePlan,
  loadAppStateFromStorage,
  loadScheduleSettings,
  markTaskDone,
  markTodayMissedAndReplan,
  minutesToLabel,
  moveTaskToDay,
  pullBacklogTaskToWeek,
  saveScheduleSettings,
  skipTask,
  taskTypeLabel,
} from '../services/schedule.js';

const $ = id => document.getElementById(id);
let activeTab = 'week';

const SCHEDULE_DISABLED_KEY = 'apex_enem_schedule_disabled';

function isScheduleDisabled() {
  try {
    return localStorage.getItem(SCHEDULE_DISABLED_KEY) === 'true';
  } catch (_) {
    return false;
  }
}

function saveScheduleDisabled(disabled) {
  try {
    localStorage.setItem(SCHEDULE_DISABLED_KEY, disabled ? 'true' : 'false');
  } catch (_) {}
}

function ensureScheduleToggleButton() {
  const topbar = document.querySelector('.topbar-actions');
  if (!topbar || $('btnScheduleToggle')) return;

  const btn = document.createElement('button');
  btn.className = 'btn btn-soft schedule-toggle-reviews-only';
  btn.id = 'btnScheduleToggle';
  btn.type = 'button';

  const scheduleBtn = $('btnSchedule');
  if (scheduleBtn && scheduleBtn.parentElement === topbar) {
    topbar.insertBefore(btn, scheduleBtn.nextSibling);
  } else {
    topbar.prepend(btn);
  }
}

function updateScheduleModeUI(closeIfDisabled = false) {
  const disabled = isScheduleDisabled();
  document.body.classList.toggle('schedule-disabled-mode', disabled);

  const toggleBtn = $('btnScheduleToggle');
  if (toggleBtn) {
    toggleBtn.classList.toggle('active', disabled);
    toggleBtn.setAttribute('aria-pressed', String(disabled));
    toggleBtn.innerHTML = disabled
      ? '<i class="ph ph-repeat"></i> Só revisões: ligado'
      : '<i class="ph ph-repeat"></i> Usar só revisões';
    toggleBtn.title = disabled
      ? 'Clique para reativar o cronograma.'
      : 'Desativa o cronograma e deixa o site focado só em revisões.';
  }

  const scheduleBtn = $('btnSchedule');
  if (scheduleBtn) {
    scheduleBtn.hidden = disabled;
    scheduleBtn.disabled = disabled;
    scheduleBtn.classList.toggle('hidden', disabled);
  }

  const weeklyBtn = $('btnWeeklyPlan');
  if (weeklyBtn) {
    weeklyBtn.hidden = disabled;
    weeklyBtn.disabled = disabled;
    weeklyBtn.classList.toggle('hidden', disabled);
  }

  if (disabled && closeIfDisabled) {
    closeModal('scheduleModal');
  }
}

function toggleScheduleMode() {
  const nextDisabled = !isScheduleDisabled();
  saveScheduleDisabled(nextDisabled);
  updateScheduleModeUI(true);

  if (nextDisabled) {
    toast('Cronograma desativado. Agora o ApexENEM fica focado só nas revisões.');
  } else {
    toast('Cronograma reativado.');
  }
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toast(message) {
  if (window.ApexENEMApp?.showToast) window.ApexENEMApp.showToast(message);
  else alert(message);
}

function refreshApp() {
  window.ApexENEMApp?.refresh?.();
}

function getState() {
  return window.ApexENEMApp?.getState?.() || loadAppStateFromStorage();
}

function subjectOptions(selected = 'all') {
  const state = getState();
  const subjects = Array.isArray(state.subjects) ? state.subjects : [];
  return ['<option value="all">Todas as matérias</option>']
    .concat(subjects.map(s => `<option value="${esc(s.name)}" ${selected === s.name ? 'selected' : ''}>${esc(s.name)}</option>`))
    .join('');
}

function ensureModal() {
  let modal = $('scheduleModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.className = 'modal-overlay schedule-modal hidden';
  modal.id = 'scheduleModal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="modal-card schedule-modal-card">
      <div class="schedule-shell">
        <header class="schedule-hero">
          <div class="schedule-hero-icon"><i class="ph ph-calendar-check"></i></div>
          <div class="schedule-hero-copy">
            <span class="schedule-eyebrow">Organização semanal</span>
            <h3>Cronograma inteligente</h3>
            <p>Monte uma semana realista com revisões, assunto novo, exercícios e erros, sem transformar atraso em bola de neve.</p>
          </div>
          <div class="schedule-actions schedule-hero-actions">
            <button class="btn btn-soft" id="scheduleRegenerate" type="button"><i class="ph ph-arrows-clockwise"></i> Recalcular</button>
            <button class="btn btn-danger" id="scheduleMissedToday" type="button"><i class="ph ph-calendar-x"></i> Não estudei hoje</button>
            <button class="btn btn-soft" id="scheduleClose" type="button"><i class="ph ph-x"></i> Fechar</button>
          </div>
        </header>

        <nav class="schedule-tabs" aria-label="Abas do cronograma">
          <button class="schedule-tab active" data-schedule-tab="week" type="button"><i class="ph ph-calendar-dots"></i> Semana</button>
          <button class="schedule-tab" data-schedule-tab="settings" type="button"><i class="ph ph-sliders-horizontal"></i> Configuração</button>
          <button class="schedule-tab" data-schedule-tab="backlog" type="button"><i class="ph ph-tray"></i> Backlog</button>
          <button class="schedule-tab" data-schedule-tab="help" type="button"><i class="ph ph-question"></i> Como funciona</button>
        </nav>

        <div id="scheduleContent" class="schedule-content"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function openModal(id) {
  const modal = $(id);
  if (!modal) return;
  modal.hidden = false;
  modal.classList.remove('hidden');
  modal.classList.add('active');
}

function closeModal(id) {
  const modal = $(id);
  if (!modal) return;
  modal.hidden = true;
  modal.classList.add('hidden');
  modal.classList.remove('active');
}

function typeClass(type) {
  if (type === 'review') return 'is-review';
  if (type === 'quick-review') return 'is-quick';
  if (type === 'new') return 'is-new';
  if (type === 'exercise') return 'is-exercise';
  if (type === 'error') return 'is-error';
  return 'is-task';
}

function typeIcon(type) {
  if (type === 'review') return 'ph-repeat';
  if (type === 'quick-review') return 'ph-lightning';
  if (type === 'new') return 'ph-book-open';
  if (type === 'exercise') return 'ph-pencil-line';
  if (type === 'error') return 'ph-warning-octagon';
  return 'ph-check-square';
}

function priorityClass(priority) {
  if (priority === 'Alta') return 'priority-high';
  if (priority === 'Média') return 'priority-medium';
  if (priority === 'Baixa') return 'priority-low';
  return 'priority-very-low';
}

function statusIcon(status) {
  if (status === 'done') return 'ph-check-circle';
  if (status === 'skipped') return 'ph-fast-forward';
  if (status === 'missed') return 'ph-calendar-x';
  return 'ph-clock';
}

function taskStatusLabel(status) {
  if (status === 'done') return 'Concluída';
  if (status === 'skipped') return 'Pulada';
  if (status === 'missed') return 'Dia perdido';
  return 'Pendente';
}

function dayOptions() {
  return DAY_ORDER.map(key => `${key}:${DAY_LABELS[key]}`).join('\n');
}

function taskBucket(task) {
  if (!task) return 'other';
  if (task.type === 'review' || task.type === 'quick-review') return 'review';
  if (task.type === 'new') return 'new';
  if (task.type === 'error') return 'error';
  if (task.type === 'exercise') return 'exercise';
  return 'other';
}

function dayStats(day) {
  const tasks = day?.tasks || [];
  const done = tasks.filter(task => task.status === 'done').length;
  const pending = tasks.filter(task => task.status === 'pending').length;
  const used = tasks.reduce((sum, task) => sum + (Number(task.minutes) || 0), 0);
  const byType = tasks.reduce((acc, task) => {
    const bucket = taskBucket(task);
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return { done, pending, used, byType, percent, total: tasks.length };
}

function progressBar(percent, label = 'Progresso') {
  const safe = Math.max(0, Math.min(100, Number(percent) || 0));
  return `
    <div class="schedule-progress-wrap" aria-label="${esc(label)}">
      <div class="schedule-progress-line"><span style="width:${safe}%"></span></div>
      <small>${safe}% concluído</small>
    </div>
  `;
}

function renderEmergencyAlert(plan) {
  if (!plan.emergency) return '';
  return `
    <div class="schedule-alert pro-alert">
      <div class="schedule-alert-icon"><i class="ph ph-warning-circle"></i></div>
      <div>
        <strong>Modo emergência ativado</strong>
        <p>Você acumulou muita coisa. Nesta semana o cronograma cortou prioridade baixa e focou no essencial: atrasados, erros, prioridade alta e R0/R1/R2.</p>
      </div>
    </div>
  `;
}

function statCard(icon, label, value, hint = '') {
  return `
    <div class="schedule-stat pro-stat">
      <i class="ph ${icon}"></i>
      <span>${esc(label)}</span>
      <strong>${esc(value)}</strong>
      ${hint ? `<small>${esc(hint)}</small>` : ''}
    </div>
  `;
}

function renderSummary(plan) {
  const s = plan.summary || {};
  const backlogLabel = `${s.backlog || 0}`;
  return `
    <section class="schedule-summary pro-summary">
      <div class="schedule-summary-header">
        <div>
          <span class="schedule-eyebrow">Resumo da semana</span>
          <strong>Seu plano em números</strong>
          <small>O cronograma respeita seu tempo. O que não couber aparece no backlog, sem apagar nada.</small>
        </div>
        <div class="schedule-week-progress">${progressBar(s.progressPercent || 0, 'Progresso semanal')}</div>
      </div>

      <div class="schedule-summary-grid pro-summary-grid">
        ${statCard('ph-calendar-blank', 'Dias', s.plannedDays || 0, 'planejados')}
        ${statCard('ph-clock', 'Tempo', minutesToLabel(s.totalMinutes || 0), 'na semana')}
        ${statCard('ph-repeat', 'Revisões', s.reviews || 0)}
        ${statCard('ph-book-open', 'Novos', s.newSubjects || 0)}
        ${statCard('ph-pencil-line', 'Exercícios', s.exercises || 0)}
        ${statCard('ph-warning-octagon', 'Erros', s.errors || 0)}
        ${statCard('ph-check-circle', 'Concluídas', s.doneCount || 0)}
        ${statCard('ph-tray', 'Backlog', backlogLabel)}
      </div>

      ${renderEmergencyAlert(plan)}
    </section>
  `;
}

function renderTask(task) {
  const disabled = task.status !== 'pending';
  const status = task.status || 'pending';
  return `
    <article class="schedule-task pro-task ${esc(status)} ${typeClass(task.type)}" data-task-id="${esc(task.id)}">
      <div class="schedule-task-accent"><i class="ph ${typeIcon(task.type)}"></i></div>
      <div class="schedule-task-main">
        <div class="schedule-task-top">
          <span class="schedule-chip schedule-type ${typeClass(task.type)}"><i class="ph ${typeIcon(task.type)}"></i> ${esc(taskTypeLabel(task.type))}</span>
          <span class="schedule-chip ${priorityClass(task.priority)}">${esc(task.priority || 'Média')}</span>
          <span class="schedule-chip">R${Number(task.level) || 0}</span>
          <span class="schedule-chip"><i class="ph ph-clock"></i> ${minutesToLabel(task.minutes)}</span>
          <span class="schedule-chip status-chip ${esc(status)}"><i class="ph ${statusIcon(status)}"></i> ${taskStatusLabel(status)}</span>
        </div>

        <div class="schedule-task-title">${esc(task.subtopic)}</div>
        <div class="schedule-task-subtitle">${esc(task.subject)} · ${esc(task.topic)}</div>
        <div class="schedule-task-reason"><i class="ph ph-target"></i> ${esc(task.reason || 'prioridade do cronograma')}</div>
      </div>

      <div class="schedule-task-actions pro-task-actions">
        <button class="btn btn-success schedule-done" type="button" ${disabled ? 'disabled' : ''}><i class="ph ph-check"></i> Concluir</button>
        <button class="btn btn-soft schedule-skip" type="button" ${disabled ? 'disabled' : ''}><i class="ph ph-fast-forward"></i> Pular</button>
        <button class="btn btn-soft schedule-move" type="button" ${disabled ? 'disabled' : ''}><i class="ph ph-arrows-left-right"></i> Mover</button>
        <button class="btn btn-soft schedule-details" type="button"><i class="ph ph-info"></i> Detalhes</button>
      </div>
    </article>
  `;
}

function renderDay(day) {
  const stats = dayStats(day);
  const isToday = day.date === new Date().toISOString().slice(0, 10);
  const badges = day.rest
    ? '<span class="schedule-day-badge rest">Descanso</span>'
    : `
      <span class="schedule-day-badge"><i class="ph ph-clock"></i> ${minutesToLabel(day.availableMinutes)}</span>
      <span class="schedule-day-badge"><i class="ph ph-list-checks"></i> ${stats.total} tarefa(s)</span>
      ${stats.pending ? `<span class="schedule-day-badge pending">${stats.pending} pendente(s)</span>` : ''}
    `;

  return `
    <section class="schedule-day-card pro-day-card ${day.rest ? 'rest' : ''} ${day.missed ? 'missed' : ''} ${isToday ? 'today' : ''}">
      <div class="schedule-day-header pro-day-header">
        <div>
          <span class="schedule-day-kicker">${isToday ? 'Hoje' : day.missed ? 'Dia perdido' : day.rest ? 'Pausa planejada' : 'Dia de estudo'}</span>
          <strong>${esc(day.label)}</strong>
          <small>${formatDateBR(day.date)}${day.missed ? ' · reorganizado' : ''}</small>
        </div>
        <div class="schedule-day-badges">${badges}</div>
      </div>

      ${!day.rest ? `
        <div class="schedule-day-mini-progress">
          <span>${stats.done}/${stats.total || 0} concluídas</span>
          <div class="schedule-progress-line compact"><span style="width:${stats.percent}%"></span></div>
        </div>
      ` : ''}

      <div class="schedule-task-list pro-task-list">
        ${day.rest ? '<div class="schedule-empty-day pro-empty"><i class="ph ph-coffee"></i><strong>Dia livre</strong><span>Use para descansar ou recuperar energia.</span></div>' : ''}
        ${!day.rest && !day.tasks.length ? '<div class="schedule-empty-day pro-empty"><i class="ph ph-calendar-blank"></i><strong>Nada encaixado aqui</strong><span>As tarefas podem estar em outro dia ou no backlog.</span></div>' : ''}
        ${(day.tasks || []).map(renderTask).join('')}
      </div>
    </section>
  `;
}

function renderWeek() {
  const plan = ensureCurrentPlan();
  return `
    ${renderSummary(plan)}
    <section class="schedule-week pro-week">
      ${(plan.days || []).map(renderDay).join('')}
    </section>
  `;
}

function renderSettings() {
  const settings = loadScheduleSettings();
  const dayChecks = DAY_ORDER.map(day => `
    <label class="schedule-day-check pro-check">
      <input type="checkbox" name="scheduleDay" value="${day}" ${settings.studyDays.includes(day) ? 'checked' : ''}>
      <span>${DAY_LABELS[day].replace('-feira', '')}</span>
    </label>
  `).join('');

  return `
    <form id="scheduleSettingsForm" class="schedule-settings-grid pro-settings">
      <fieldset class="schedule-fieldset pro-fieldset">
        <legend><i class="ph ph-clock"></i> Disponibilidade</legend>
        <div class="field">
          <label>Horas por dia</label>
          <input id="scheduleHours" type="number" min="0.5" max="8" step="0.5" value="${esc(settings.hoursPerDay)}">
        </div>
        <div class="field">
          <label>Data da prova</label>
          <input id="scheduleExamDate" type="date" value="${esc(settings.examDate || '')}">
        </div>
        <div class="field field-wide">
          <label>Dias da semana</label>
          <div class="schedule-days pro-days">${dayChecks}</div>
          <small>Marque só os dias em que você realmente consegue estudar. O cronograma não força tarefa em dia de descanso.</small>
        </div>
      </fieldset>

      <fieldset class="schedule-fieldset pro-fieldset">
        <legend><i class="ph ph-target"></i> Foco do cronograma</legend>
        <div class="field">
          <label>Matérias</label>
          <select id="scheduleSubjectMode">
            <option value="all" ${settings.subjectMode !== 'single' ? 'selected' : ''}>Todas as matérias</option>
            <option value="single" ${settings.subjectMode === 'single' ? 'selected' : ''}>Apenas uma matéria</option>
          </select>
        </div>
        <div class="field">
          <label>Matéria específica</label>
          <select id="scheduleSelectedSubject">${subjectOptions(settings.selectedSubject)}</select>
        </div>
        <div class="field">
          <label>Modo</label>
          <select id="scheduleMode">
            <option value="normal" ${settings.mode === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="intense" ${settings.mode === 'intense' ? 'selected' : ''}>Intenso</option>
            <option value="final" ${settings.mode === 'final' ? 'selected' : ''}>Reta final</option>
          </select>
        </div>
        <div class="field">
          <label>Preferência</label>
          <select id="schedulePreference">
            <option value="balanced" ${settings.preference === 'balanced' ? 'selected' : ''}>Equilibrado</option>
            <option value="moreReview" ${settings.preference === 'moreReview' ? 'selected' : ''}>Mais revisão</option>
            <option value="moreNew" ${settings.preference === 'moreNew' ? 'selected' : ''}>Mais assunto novo</option>
            <option value="moreExercises" ${settings.preference === 'moreExercises' ? 'selected' : ''}>Mais exercícios</option>
            <option value="focusErrors" ${settings.preference === 'focusErrors' ? 'selected' : ''}>Foco em erros</option>
          </select>
        </div>
        <label class="schedule-day-check pro-check wide-check">
          <input id="scheduleIncludeErrors" type="checkbox" ${settings.includeErrors ? 'checked' : ''}>
          <span>Incluir erros salvos no planejamento</span>
        </label>
      </fieldset>

      <div class="modal-actions schedule-form-actions">
        <button class="btn btn-soft" id="scheduleClearPlan" type="button"><i class="ph ph-eraser"></i> Limpar cronograma salvo</button>
        <button class="btn btn-primary" type="submit"><i class="ph ph-floppy-disk"></i> Salvar e gerar cronograma</button>
      </div>
    </form>
  `;
}

function renderBacklog() {
  const plan = ensureCurrentPlan();
  const b = backlogBreakdown(plan);
  return `
    <section class="schedule-backlog pro-backlog">
      <div class="schedule-backlog-head">
        <div>
          <span class="schedule-eyebrow">Pendências que não couberam</span>
          <strong>Backlog da semana</strong>
          <p>Backlog não é conteúdo apagado. É o que ficou pendente porque não cabia no tempo disponível.</p>
        </div>
        <div class="schedule-actions">
          <button class="btn btn-soft" id="scheduleClearLowBacklog" type="button"><i class="ph ph-broom"></i> Limpar prioridade baixa</button>
          <button class="btn btn-primary" id="scheduleReorganizeBacklog" type="button"><i class="ph ph-arrows-clockwise"></i> Reorganizar</button>
        </div>
      </div>

      <div class="schedule-backlog-grid pro-backlog-grid">
        ${statCard('ph-tray', 'Totais', b.total)}
        ${statCard('ph-repeat', 'Revisões', b.reviews)}
        ${statCard('ph-book-open', 'Novos', b.newSubjects)}
        ${statCard('ph-pencil-line', 'Exercícios', b.exercises)}
        ${statCard('ph-warning-octagon', 'Erros', b.errors)}
        ${statCard('ph-fire', 'Alta', b.high)}
        ${statCard('ph-arrow-down', 'Baixa', b.low)}
      </div>

      <div class="schedule-backlog-list pro-backlog-list">
        ${(plan.backlogTasks || []).map(task => `
          <div class="schedule-backlog-row pro-backlog-row" data-task-id="${esc(task.id)}">
            <div>
              <span class="schedule-chip schedule-type ${typeClass(task.type)}"><i class="ph ${typeIcon(task.type)}"></i> ${esc(taskTypeLabel(task.type))}</span>
              <strong>${esc(task.subtopic)}</strong>
              <small>${esc(task.subject)} · ${esc(task.topic)} · ${minutesToLabel(task.minutes)} · ${esc(task.priority)}</small>
            </div>
            <div class="schedule-backlog-actions">
              <button class="btn btn-soft schedule-backlog-details" type="button"><i class="ph ph-info"></i> Detalhes</button>
              <button class="btn btn-primary schedule-pull-backlog" type="button"><i class="ph ph-arrow-bend-up-left"></i> Puxar para semana</button>
            </div>
          </div>
        `).join('') || '<div class="schedule-empty-day pro-empty"><i class="ph ph-check-circle"></i><strong>Nada no backlog</strong><span>Seu planejamento coube no tempo disponível.</span></div>'}
      </div>
    </section>
  `;
}

function helpBlock(icon, title, text) {
  return `
    <article class="schedule-help-card">
      <div class="schedule-help-icon"><i class="ph ${icon}"></i></div>
      <div>
        <strong>${esc(title)}</strong>
        <p>${text}</p>
      </div>
    </article>
  `;
}

function renderHelp() {
  return `
    <section class="schedule-help">
      <div class="schedule-help-hero">
        <span class="schedule-eyebrow">Guia rápido</span>
        <h3>Como funciona o cronograma?</h3>
        <p>Ele não substitui a revisão espaçada. Ele organiza sua semana para você saber o que fazer primeiro, sem lotar um único dia.</p>
      </div>

      <div class="schedule-help-grid">
        ${helpBlock('ph-calendar-check', 'Semana', 'Mostra os dias planejados e os blocos de estudo. Cada dia respeita as horas que você configurou.')}
        ${helpBlock('ph-sliders-horizontal', 'Configuração', 'É onde você define dias disponíveis, horas por dia, data da prova, matéria e tipo de foco.')}
        ${helpBlock('ph-tray', 'Backlog', 'É a lista do que não coube na semana. Nada é apagado; apenas fica guardado para reorganizar depois.')}
        ${helpBlock('ph-warning-circle', 'Modo emergência', 'Quando acumula muita coisa, o sistema foca no essencial: atrasados, erros, prioridade alta e R0/R1/R2.')}
      </div>

      <div class="schedule-help-section">
        <h4>Como ele decide o que entra primeiro?</h4>
        <ol>
          <li>Revisões atrasadas</li>
          <li>Erros salvos importantes</li>
          <li>Prioridade alta</li>
          <li>Assuntos R0, R1 e R2</li>
          <li>Assuntos novos importantes</li>
          <li>Prioridade média e baixa só se sobrar tempo</li>
        </ol>
      </div>

      <div class="schedule-help-grid two">
        ${helpBlock('ph-repeat', 'Revisão', 'Serve para manter na memória algo que você já estudou. Se concluir, o nível R aumenta e a próxima revisão é agendada.')}
        ${helpBlock('ph-lightning', 'Revisão rápida', 'É uma revisão curta para não deixar um conteúdo esfriar.')}
        ${helpBlock('ph-book-open', 'Assunto novo', 'Serve para avançar conteúdo. Aprender é diferente de revisar.')}
        ${helpBlock('ph-pencil-line', 'Exercícios', 'Serve para fixar o assunto com prática.')}
        ${helpBlock('ph-warning-octagon', 'Correção de erro', 'Serve para atacar pontos fracos salvos no caderno de erros.')}
        ${helpBlock('ph-stairs', 'R0, R1, R2...', 'R0 é inicial. R1 é primeira revisão. R2 é segunda revisão. Dominado significa conteúdo bem consolidado.')}
      </div>

      <div class="schedule-help-section">
        <h4>O que cada botão faz?</h4>
        <div class="schedule-faq-list">
          <p><strong>Concluir:</strong> marca a tarefa como feita. Se for revisão, atualiza a revisão espaçada.</p>
          <p><strong>Pular:</strong> manda a tarefa para o backlog sem apagar progresso.</p>
          <p><strong>Mover:</strong> tenta encaixar a tarefa em outro dia disponível.</p>
          <p><strong>Detalhes:</strong> mostra matéria, tópico, prioridade, motivo e tempo estimado.</p>
          <p><strong>Não estudei hoje:</strong> marca o dia como perdido e reorganiza o restante da semana.</p>
          <p><strong>Recalcular:</strong> gera uma nova semana com base nas configurações atuais.</p>
        </div>
      </div>

      <div class="schedule-alert soft-alert">
        <div class="schedule-alert-icon"><i class="ph ph-lightbulb"></i></div>
        <div>
          <strong>Dica de uso</strong>
          <p>Não tente zerar tudo. Faça o que está na semana. Se não couber, o backlog existe justamente para guardar o resto sem bagunçar seu estudo.</p>
        </div>
      </div>
    </section>
  `;
}

function renderContent() {
  const content = $('scheduleContent');
  if (!content) return;
  document.querySelectorAll('[data-schedule-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.scheduleTab === activeTab));
  if (activeTab === 'settings') content.innerHTML = renderSettings();
  else if (activeTab === 'backlog') content.innerHTML = renderBacklog();
  else if (activeTab === 'help') content.innerHTML = renderHelp();
  else content.innerHTML = renderWeek();
  bindDynamicActions();
}

function setActiveTab(tab) {
  activeTab = tab;
  renderContent();
}

function readSettingsFromForm() {
  const days = Array.from(document.querySelectorAll('input[name="scheduleDay"]:checked')).map(input => input.value);
  const selectedSubject = $('scheduleSelectedSubject')?.value || 'all';
  const subjectMode = $('scheduleSubjectMode')?.value || 'all';
  return saveScheduleSettings({
    hoursPerDay: Number($('scheduleHours')?.value || 2),
    examDate: $('scheduleExamDate')?.value || '',
    studyDays: days,
    subjectMode,
    selectedSubject,
    mode: $('scheduleMode')?.value || 'normal',
    preference: $('schedulePreference')?.value || 'balanced',
    includeErrors: Boolean($('scheduleIncludeErrors')?.checked),
  });
}

function promptTargetDay() {
  const raw = prompt('Para qual dia mover? Digite uma das opções:\n\n' + dayOptions(), 'wed');
  if (!raw) return null;
  const normalized = String(raw).trim().toLowerCase();
  const key = normalized.slice(0, 3);
  const map = {
    seg: 'mon', mon: 'mon', segunda: 'mon',
    ter: 'tue', tue: 'tue', terca: 'tue', terça: 'tue',
    qua: 'wed', wed: 'wed', quarta: 'wed',
    qui: 'thu', thu: 'thu', quinta: 'thu',
    sex: 'fri', fri: 'fri', sexta: 'fri',
    sab: 'sat', sáb: 'sat', sat: 'sat', sabado: 'sat', sábado: 'sat',
    dom: 'sun', sun: 'sun', domingo: 'sun',
  };
  return map[key] || map[normalized] || DAY_ORDER.find(day => day === key) || null;
}

function showDetails(taskId) {
  const found = findTaskInPlan(taskId);
  if (!found) {
    toast('Não encontrei os detalhes dessa tarefa.');
    return;
  }
  const { task, day, location } = found;
  const lines = [
    `${taskTypeLabel(task.type)} — ${task.subtopic}`,
    `Matéria: ${task.subject}`,
    `Tópico: ${task.topic}`,
    `Prioridade: ${task.priority}`,
    `Nível: R${Number(task.level) || 0}`,
    `Tempo: ${minutesToLabel(task.minutes)}`,
    `Status: ${taskStatusLabel(task.status)}`,
    `Motivo: ${task.reason || 'prioridade do cronograma'}`,
    `Local: ${location === 'backlog' ? 'Backlog' : `${day.label} (${formatDateBR(day.date)})`}`,
  ];
  if (task.details?.topicWeight) lines.push(`Incidência: ${task.details.topicWeight}`);
  if (task.details?.nextReviewDate) lines.push(`Próxima revisão: ${new Date(task.details.nextReviewDate).toLocaleDateString('pt-BR')}`);
  if (task.details?.noteCorrection) lines.push(`Correção do erro: ${task.details.noteCorrection}`);
  alert(lines.join('\n'));
}

function bindDynamicActions() {
  $('scheduleSettingsForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const settings = readSettingsFromForm();
    generateSchedulePlan(settings, getState());
    activeTab = 'week';
    renderContent();
    toast('Cronograma gerado com segurança.');
  });

  $('scheduleClearPlan')?.addEventListener('click', () => {
    clearSchedulePlan();
    renderContent();
    toast('Cronograma salvo foi limpo.');
  });

  document.querySelectorAll('.schedule-done').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.closest('.schedule-task')?.dataset.taskId;
      const task = markTaskDone(taskId);
      if (task) completeTaskProgress(task);
      renderContent();
      refreshApp();
      toast('Tarefa concluída e progresso atualizado.');
    });
  });

  document.querySelectorAll('.schedule-skip').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.closest('.schedule-task')?.dataset.taskId;
      skipTask(taskId);
      renderContent();
      toast('Tarefa pulada e enviada para o backlog.');
    });
  });

  document.querySelectorAll('.schedule-move').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.closest('.schedule-task')?.dataset.taskId;
      const dayKey = promptTargetDay();
      if (!dayKey) return;
      const result = moveTaskToDay(taskId, dayKey);
      renderContent();
      toast(result.ok ? `Tarefa movida para ${DAY_LABELS[dayKey]}.` : result.reason || 'Tarefa movida para o backlog.');
    });
  });

  document.querySelectorAll('.schedule-details, .schedule-backlog-details').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.closest('[data-task-id]')?.dataset.taskId;
      showDetails(taskId);
    });
  });

  document.querySelectorAll('.schedule-pull-backlog').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.closest('[data-task-id]')?.dataset.taskId;
      const result = pullBacklogTaskToWeek(taskId);
      renderContent();
      toast(result.ok ? `Tarefa puxada para ${result.day.label}.` : result.reason);
    });
  });

  $('scheduleClearLowBacklog')?.addEventListener('click', () => {
    if (!confirm('Remover tarefas de prioridade Baixa e Muito Baixa do backlog desta semana? O conteúdo não será apagado, só sai do backlog atual.')) return;
    const result = clearLowPriorityBacklog();
    renderContent();
    toast(`${result.removed} tarefa(s) de prioridade baixa removida(s) do backlog.`);
  });

  $('scheduleReorganizeBacklog')?.addEventListener('click', () => {
    const plan = generateSchedulePlan(loadScheduleSettings(), getState());
    renderContent();
    toast(plan.emergency ? 'Backlog reorganizado em modo emergência.' : 'Backlog reorganizado.');
  });
}

export function closeSchedule() {
  closeModal('scheduleModal');
}

export function openSchedule() {
  if (isScheduleDisabled()) {
    toast('Cronograma está desativado. Use o botão “Só revisões” para reativar.');
    return;
  }

  ensureModal();
  openModal('scheduleModal');
  activeTab = 'week';
  ensureCurrentPlan();
  renderContent();
}

function bindStaticActions() {
  const modal = ensureModal();
  $('scheduleClose')?.addEventListener('click', closeSchedule);
  $('scheduleRegenerate')?.addEventListener('click', () => {
    generateSchedulePlan(loadScheduleSettings(), getState());
    renderContent();
    toast('Cronograma recalculado.');
  });
  $('scheduleMissedToday')?.addEventListener('click', () => {
    if (!confirm('Marcar hoje como dia perdido e reorganizar o restante da semana?')) return;
    const result = markTodayMissedAndReplan();
    renderContent();
    toast(result.moved ? `Dia marcado como perdido. ${result.moved} tarefa(s) foram reorganizadas.` : 'Hoje foi marcado como perdido.');
  });

  modal.addEventListener('click', e => {
    if (e.target === modal) closeSchedule();
  });

  modal.querySelectorAll('[data-schedule-tab]').forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.scheduleTab));
  });
}

function injectButtonIfMissing() {
  const topbar = document.querySelector('.topbar-actions');
  if (!topbar || $('btnSchedule')) return;
  const btn = document.createElement('button');
  btn.className = 'btn btn-soft';
  btn.id = 'btnSchedule';
  btn.type = 'button';
  btn.innerHTML = '<i class="ph ph-calendar-check"></i> Cronograma';
  topbar.prepend(btn);
}

function initializeScheduleUI() {
  injectButtonIfMissing();
  ensureScheduleToggleButton();
  ensureModal();
  bindStaticActions();
  $('btnSchedule')?.addEventListener('click', openSchedule);
  $('btnScheduleToggle')?.addEventListener('click', toggleScheduleMode);
  updateScheduleModeUI(false);
}

document.addEventListener('DOMContentLoaded', initializeScheduleUI);
