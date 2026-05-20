/**
 * ApexENEM • schedule.js
 * Serviço puro para cronograma inteligente, sem dependências externas.
 *
 * Ideia central:
 * - Revisão espaçada decide quando voltar em um conteúdo.
 * - Cronograma decide como organizar a semana respeitando tempo, prioridade e backlog.
 */

const STORAGE_KEY = 'apex_enem_v3_state';
const PROGRESS_KEY = STORAGE_KEY + '_progress';
const ERROR_NOTES_KEY = STORAGE_KEY + '_error_notes';
const SCHEDULE_SETTINGS_KEY = STORAGE_KEY + '_schedule_settings';
const SCHEDULE_PLAN_KEY = STORAGE_KEY + '_schedule_week_plan';
const SCHEDULE_HISTORY_KEY = STORAGE_KEY + '_schedule_history';

export const DAY_LABELS = {
  mon: 'Segunda-feira',
  tue: 'Terça-feira',
  wed: 'Quarta-feira',
  thu: 'Quinta-feira',
  fri: 'Sexta-feira',
  sat: 'Sábado',
  sun: 'Domingo',
};

export const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const PRIORITY_RANK = {
  Alta: 4,
  Média: 3,
  Baixa: 2,
  'Muito Baixa': 1,
};

const MIN_BLOCK_MINUTES = 15;

function safeGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

function uid(prefix = 'task') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneTask(task, overrides = {}) {
  return {
    ...task,
    ...overrides,
    id: overrides.id || uid(task.type || 'task'),
  };
}

function normalizePriority(priority) {
  if (priority === 'Very Baixa') return 'Muito Baixa';
  if (['Alta', 'Média', 'Baixa', 'Muito Baixa'].includes(priority)) return priority;
  return 'Média';
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

export function parseDateKey(key) {
  const [y, m, d] = String(key || '').split('-').map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
}

export function getDayKey(date) {
  return DAY_ORDER[(date.getDay() + 6) % 7];
}

export function formatDateBR(keyOrDate) {
  const date = typeof keyOrDate === 'string' ? parseDateKey(keyOrDate) : keyOrDate;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function minutesToLabel(minutes) {
  const n = Number(minutes) || 0;
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h && m) return `${h}h${String(m).padStart(2, '0')}`;
  if (h) return `${h}h`;
  return `${m}min`;
}

export function weekStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function currentWeekKey(date = new Date()) {
  return dateKey(weekStart(date));
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseWeight(weight) {
  const n = Number(String(weight || '').replace(',', '.').match(/\d+(\.\d+)?/)?.[0] || 0);
  return Number.isFinite(n) ? n : 0;
}

function isFinalStretch(settings) {
  if (settings.mode === 'final') return true;
  if (!settings.examDate) return false;
  const target = parseDateKey(settings.examDate);
  const diffDays = Math.ceil((target.getTime() - Date.now()) / 86400000);
  return diffDays <= 30;
}

export function defaultScheduleSettings() {
  return {
    studyDays: ['mon', 'wed', 'fri'],
    hoursPerDay: 2,
    examDate: '',
    subjectMode: 'all',
    selectedSubject: 'all',
    mode: 'normal',
    preference: 'balanced',
    includeErrors: true,
    lastGeneratedWeek: null,
  };
}

export function loadScheduleSettings() {
  const settings = safeGet(SCHEDULE_SETTINGS_KEY, null);
  return { ...defaultScheduleSettings(), ...(settings || {}) };
}

export function saveScheduleSettings(settings) {
  const clean = { ...defaultScheduleSettings(), ...(settings || {}) };
  clean.hoursPerDay = Math.max(0.5, Math.min(8, Number(clean.hoursPerDay) || 2));
  clean.studyDays = Array.isArray(clean.studyDays) && clean.studyDays.length ? clean.studyDays : ['mon', 'wed', 'fri'];
  clean.mode = ['normal', 'intense', 'final'].includes(clean.mode) ? clean.mode : 'normal';
  clean.preference = ['balanced', 'moreReview', 'moreNew', 'moreExercises', 'focusErrors'].includes(clean.preference)
    ? clean.preference
    : 'balanced';
  safeSet(SCHEDULE_SETTINGS_KEY, clean);
  return clean;
}

export function loadSchedulePlan() {
  const plan = safeGet(SCHEDULE_PLAN_KEY, null);
  return plan && typeof plan === 'object' ? plan : null;
}

export function saveSchedulePlan(plan) {
  safeSet(SCHEDULE_PLAN_KEY, plan || null);
}

export function clearSchedulePlan() {
  try {
    localStorage.removeItem(SCHEDULE_PLAN_KEY);
  } catch (_) {}
}

export function loadScheduleHistory() {
  const history = safeGet(SCHEDULE_HISTORY_KEY, []);
  return Array.isArray(history) ? history : [];
}

export function saveScheduleHistory(history) {
  safeSet(SCHEDULE_HISTORY_KEY, Array.isArray(history) ? history : []);
}

export function loadAppStateFromStorage() {
  return safeGet(STORAGE_KEY, null) || { subjects: [], stats: { totalReviews: 0 } };
}

export function saveAppStateToStorage(state) {
  safeSet(STORAGE_KEY, state);
}

export function loadErrorNotesFromStorage() {
  const notes = safeGet(ERROR_NOTES_KEY, []);
  return Array.isArray(notes) ? notes : [];
}

function generateProgressKey(subjectName, topicName, subName) {
  return `${subjectName || ''}|||${topicName || ''}|||${subName || ''}`.toLowerCase().trim();
}

function loadProgressMap() {
  return safeGet(PROGRESS_KEY, {}) || {};
}

function saveProgressMap(map) {
  safeSet(PROGRESS_KEY, map || {});
}

function getSubStatus(sub, now = new Date()) {
  if (Number(sub.currentLevel) >= 8) return 'dominado';
  if (!sub.nextReviewDate) return 'não iniciado';
  const next = startOfDay(new Date(sub.nextReviewDate));
  const today = startOfDay(now);
  if (next.getTime() < today.getTime()) return 'atrasado';
  if (sameDay(next, today)) return 'revisão hoje';
  return 'agendado';
}

function computeNextIntervalForLevel(level) {
  const n = Number(level) || 0;
  if (n <= 1) return 1;
  if (n === 2) return 3;
  if (n === 3) return 7;
  if (n === 4) return 10;
  if (n === 5) return 14;
  if (n === 6) return 14;
  if (n === 7) return 21;
  return 21;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

function shouldIncludeSubject(subject, settings) {
  if (!settings || settings.subjectMode !== 'single') return true;
  if (!settings.selectedSubject || settings.selectedSubject === 'all') return true;
  return subject.name === settings.selectedSubject;
}

function noteImportance(note, index = 0) {
  const text = `${note?.mistake || ''} ${note?.correction || ''} ${(note?.tags || []).join(' ')}`.toLowerCase();
  let score = 0;
  if (text.includes('importante') || text.includes('recorrente') || text.includes('enem')) score += 100;
  if (text.includes('errei') || text.includes('erro')) score += 40;
  return score + Math.max(0, 80 - index * 4);
}

function baseTask({ type, subject, topic, sub, note, minutes, reason, score, source = 'generated' }) {
  const subjectName = subject?.name || note?.subject || 'Geral';
  const topicName = topic?.name || note?.topic || 'Geral';
  const subtopicName = sub?.name || note?.mistake || 'Item do caderno de erros';
  const priority = normalizePriority(sub?.priority || note?.priority || 'Média');
  const level = Number(sub?.currentLevel) || 0;
  const weight = parseWeight(topic?.enemWeight);

  return {
    id: uid(type),
    stableId: `${type}|${subjectName}|${topicName}|${subtopicName}`.toLowerCase(),
    type,
    subject: subjectName,
    topic: topicName,
    subtopic: subtopicName,
    subId: sub?.id || null,
    noteId: note?.id || null,
    priority,
    level,
    weight,
    minutes,
    reason,
    score,
    source,
    status: 'pending',
    movedFrom: null,
    details: {
      nextReviewDate: sub?.nextReviewDate || null,
      lastReviewed: sub?.lastReviewed || null,
      noteMistake: note?.mistake || null,
      noteCorrection: note?.correction || null,
      topicWeight: topic?.enemWeight || null,
    },
  };
}

function buildCandidates(state, settings) {
  const now = new Date();
  const subjects = Array.isArray(state?.subjects) ? state.subjects : [];
  const tasks = [];

  subjects.forEach(subject => {
    if (!shouldIncludeSubject(subject, settings)) return;
    (subject.topics || []).forEach(topic => {
      (topic.subtopics || []).forEach(sub => {
        sub.priority = normalizePriority(sub.priority);
        const level = Number(sub.currentLevel) || 0;
        if (level >= 8) return;

        const status = getSubStatus(sub, now);
        const prio = PRIORITY_RANK[sub.priority] || 0;
        const weight = parseWeight(topic.enemWeight);
        const lowPriorityPenalty = sub.priority === 'Muito Baixa' ? -80 : sub.priority === 'Baixa' ? -28 : 0;
        const highBoost = sub.priority === 'Alta' ? 190 : 0;
        const lowLevelBoost = level <= 2 ? (3 - level) * 60 : 0;
        const noStartBoost = !sub.nextReviewDate && level === 0 ? 130 : 0;

        if (status === 'atrasado' || status === 'revisão hoje') {
          const overdueDays = sub.nextReviewDate
            ? Math.max(0, Math.ceil((startOfDay(now).getTime() - startOfDay(new Date(sub.nextReviewDate)).getTime()) / 86400000))
            : 0;
          tasks.push(baseTask({
            type: 'review',
            subject,
            topic,
            sub,
            minutes: level <= 2 ? 20 : 15,
            reason: status === 'atrasado' ? 'Revisão atrasada' : 'Revisão marcada para hoje',
            score: 1500 + overdueDays * 50 + prio * 95 + lowLevelBoost + weight * 2 + highBoost + lowPriorityPenalty,
          }));
        }

        if (level <= 2 && (status === 'não iniciado' || status === 'atrasado' || status === 'revisão hoje')) {
          tasks.push(baseTask({
            type: 'quick-review',
            subject,
            topic,
            sub,
            minutes: 15,
            reason: `Nível baixo: R${level}`,
            score: 980 + prio * 80 + lowLevelBoost + weight * 1.5 + highBoost + lowPriorityPenalty,
          }));
        }

        if (!sub.nextReviewDate && level === 0) {
          tasks.push(baseTask({
            type: 'new',
            subject,
            topic,
            sub,
            minutes: sub.priority === 'Alta' ? 45 : sub.priority === 'Média' ? 35 : 30,
            reason: 'Assunto novo não iniciado',
            score: 900 + noStartBoost + prio * 100 + weight * 3 + highBoost + lowPriorityPenalty,
          }));
        }

        if (sub.priority !== 'Muito Baixa') {
          tasks.push(baseTask({
            type: 'exercise',
            subject,
            topic,
            sub,
            minutes: sub.priority === 'Alta' ? 30 : 25,
            reason: 'Prática para fixar o conteúdo',
            score: 520 + prio * 55 + weight + (level <= 2 ? 55 : 0) + highBoost / 2 + lowPriorityPenalty,
          }));
        }
      });
    });
  });

  if (settings.includeErrors) {
    const notes = loadErrorNotesFromStorage();
    notes.forEach((note, index) => {
      if (settings.subjectMode === 'single' && settings.selectedSubject !== 'all' && note.subject !== settings.selectedSubject) return;
      tasks.push(baseTask({
        type: 'error',
        note,
        minutes: 20,
        reason: 'Erro salvo no caderno de erros',
        score: 1250 + noteImportance(note, index),
      }));
    });
  }

  return tasks.sort((a, b) => b.score - a.score);
}

function getRatios(settings) {
  const hours = Number(settings.hoursPerDay) || 2;
  if (isFinalStretch(settings)) return { review: 0.5, new: 0.2, exercise: 0.2, error: 0.1 };
  if (settings.mode === 'intense') return { review: 0.32, new: 0.28, exercise: 0.32, error: 0.08 };
  if (settings.preference === 'moreReview') return { review: 0.5, new: 0.25, exercise: 0.2, error: 0.05 };
  if (settings.preference === 'moreNew') return { review: 0.25, new: 0.5, exercise: 0.2, error: 0.05 };
  if (settings.preference === 'moreExercises') return { review: 0.28, new: 0.22, exercise: 0.45, error: 0.05 };
  if (settings.preference === 'focusErrors') return { review: 0.35, new: 0.15, exercise: 0.25, error: 0.25 };
  if (hours <= 1) return { review: 0.4, new: 0.4, exercise: 0.2, error: 0.0 };
  if (hours <= 2) return { review: 0.3, new: 0.4, exercise: 0.25, error: 0.05 };
  return { review: 0.3, new: 0.35, exercise: 0.25, error: 0.1 };
}

function typeBucket(type) {
  if (type === 'review' || type === 'quick-review') return 'review';
  if (type === 'new') return 'new';
  if (type === 'error') return 'error';
  return 'exercise';
}

function labelForType(type) {
  if (type === 'review') return 'Revisão';
  if (type === 'quick-review') return 'Revisão rápida';
  if (type === 'new') return 'Assunto novo';
  if (type === 'exercise') return 'Exercícios';
  if (type === 'error') return 'Correção de erro';
  return 'Tarefa';
}

export function taskTypeLabel(type) {
  return labelForType(type);
}

function taskIsEssential(task) {
  if (!task) return false;
  if (task.priority === 'Alta') return true;
  if (task.type === 'review' || task.type === 'quick-review' || task.type === 'error') return true;
  if (Number(task.level) <= 2 && task.priority !== 'Muito Baixa') return true;
  return false;
}

function detectEmergency(candidatePool, settings) {
  const studySlots = Math.max(1, settings.studyDays.length);
  const reviewCount = candidatePool.filter(task => task.type === 'review' || task.type === 'quick-review').length;
  const errorCount = candidatePool.filter(task => task.type === 'error').length;
  const essentialCount = candidatePool.filter(taskIsEssential).length;
  const dailyCapacity = Math.max(1, Math.floor((Number(settings.hoursPerDay) || 2) * 60 / 20));
  const weeklyCapacity = dailyCapacity * studySlots;

  return reviewCount > Math.max(8, studySlots * 3) || essentialCount > weeklyCapacity * 1.45 || errorCount > studySlots * 2.5;
}

function taskAllowedInEmergency(task) {
  if (!task) return false;
  if (task.priority === 'Baixa' || task.priority === 'Muito Baixa') return false;
  if (task.type === 'new' && task.priority !== 'Alta') return false;
  return taskIsEssential(task);
}

function chooseTask(pool, usedStableIds, remainingMinutes, quotas, dayTasks, emergency) {
  const countByBucket = dayTasks.reduce((acc, task) => {
    const b = typeBucket(task.type);
    acc[b] = (acc[b] || 0) + task.minutes;
    return acc;
  }, {});

  const valid = pool.filter(task => {
    if (task.status && task.status !== 'pending') return false;
    if (usedStableIds.has(task.stableId)) return false;
    if (task.minutes > remainingMinutes) return false;
    if (emergency && !taskAllowedInEmergency(task)) return false;
    return true;
  });

  if (!valid.length) return null;

  const underQuota = valid
    .map(task => {
      const bucket = typeBucket(task.type);
      const used = countByBucket[bucket] || 0;
      const target = quotas[bucket] || 0;
      const bonus = used < target ? 180 : 0;
      const priorityBonus = (PRIORITY_RANK[task.priority] || 0) * 25;
      const emergencyBonus = emergency && taskIsEssential(task) ? 220 : 0;
      return { task, adjusted: (task.score || 0) + bonus + priorityBonus + emergencyBonus };
    })
    .sort((a, b) => b.adjusted - a.adjusted);

  return underQuota[0].task;
}

function makeWeekDays(settings, start, totalMinutes) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dayKey = getDayKey(date);
    const isStudyDay = settings.studyDays.includes(dayKey);
    days.push({
      key: dayKey,
      label: DAY_LABELS[dayKey],
      date: dateKey(date),
      availableMinutes: isStudyDay ? totalMinutes : 0,
      rest: !isStudyDay,
      missed: false,
      tasks: [],
    });
  }
  return days;
}

function fillDays({ days, pool, settings, quotas, emergency, startIndex = 0, preserveStableIds = new Set() }) {
  const usedStableIds = new Set(preserveStableIds);

  for (let i = startIndex; i < days.length; i++) {
    const day = days[i];
    if (day.rest || day.missed) continue;

    let remaining = Math.max(0, day.availableMinutes - day.tasks.reduce((sum, task) => sum + (task.minutes || 0), 0));
    while (remaining >= MIN_BLOCK_MINUTES) {
      const task = chooseTask(pool, usedStableIds, remaining, quotas, day.tasks, emergency);
      if (!task) break;
      const clone = cloneTask(task, { status: 'pending' });
      day.tasks.push(clone);
      usedStableIds.add(task.stableId);
      remaining -= clone.minutes;
    }
  }

  return usedStableIds;
}

function makeBacklog(pool, usedStableIds, emergency, limit = 80) {
  return pool
    .filter(task => !usedStableIds.has(task.stableId))
    .filter(task => task.status === 'pending' || !task.status)
    .filter(task => !emergency || task.priority !== 'Muito Baixa')
    .slice(0, limit)
    .map(task => cloneTask(task, { status: 'pending' }));
}

export function generateSchedulePlan(settingsInput = loadScheduleSettings(), stateInput = null, carryOverTasks = []) {
  const settings = saveScheduleSettings(settingsInput);
  const state = stateInput || loadAppStateFromStorage();
  const start = weekStart(new Date());
  const weekKey = dateKey(start);
  const totalMinutes = Math.round((Number(settings.hoursPerDay) || 2) * 60);
  const ratios = getRatios(settings);
  const quotas = {
    review: Math.round(totalMinutes * ratios.review),
    new: Math.round(totalMinutes * ratios.new),
    exercise: Math.round(totalMinutes * ratios.exercise),
    error: Math.round(totalMinutes * ratios.error),
  };

  const candidatePool = [...carryOverTasks, ...buildCandidates(state, settings)]
    .filter(task => task && (task.status === 'pending' || !task.status))
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const emergency = detectEmergency(candidatePool, settings);
  const days = makeWeekDays(settings, start, totalMinutes);
  const usedStableIds = fillDays({ days, pool: candidatePool, settings, quotas, emergency });
  const backlogTasks = makeBacklog(candidatePool, usedStableIds, emergency);

  const plan = {
    version: '1.1',
    weekKey,
    generatedAt: new Date().toISOString(),
    settings,
    emergency,
    ratios,
    days,
    backlogTasks,
    summary: buildSummary(days, backlogTasks),
  };

  saveSchedulePlan(plan);
  return plan;
}

export function buildSummary(days, backlogTasks = []) {
  const plannedDays = days.filter(day => !day.rest).length;
  const totalMinutes = days.reduce((sum, day) => sum + day.tasks.reduce((s, t) => s + (t.minutes || 0), 0), 0);
  const counts = { review: 0, new: 0, exercise: 0, error: 0 };
  const doneCount = days.reduce((sum, day) => sum + day.tasks.filter(task => task.status === 'done').length, 0);
  const pendingCount = days.reduce((sum, day) => sum + day.tasks.filter(task => task.status === 'pending').length, 0);
  const missedDays = days.filter(day => day.missed).length;
  const doneDays = days.filter(day => !day.rest && day.tasks.length && day.tasks.every(task => task.status === 'done')).length;
  days.forEach(day => day.tasks.forEach(task => {
    counts[typeBucket(task.type)] = (counts[typeBucket(task.type)] || 0) + 1;
  }));
  const totalTasks = doneCount + pendingCount + days.reduce((sum, day) => sum + day.tasks.filter(task => ['skipped', 'missed'].includes(task.status)).length, 0);
  return {
    plannedDays,
    totalMinutes,
    reviews: counts.review || 0,
    newSubjects: counts.new || 0,
    exercises: counts.exercise || 0,
    errors: counts.error || 0,
    backlog: backlogTasks.length,
    doneCount,
    pendingCount,
    doneDays,
    missedDays,
    progressPercent: totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0,
  };
}

export function ensureCurrentPlan() {
  const settings = loadScheduleSettings();
  const plan = loadSchedulePlan();
  if (!plan || plan.weekKey !== currentWeekKey() || JSON.stringify(plan.settings) !== JSON.stringify(settings)) {
    return generateSchedulePlan(settings);
  }
  plan.summary = buildSummary(plan.days || [], plan.backlogTasks || []);
  saveSchedulePlan(plan);
  return plan;
}

export function markTaskDone(taskId) {
  const plan = loadSchedulePlan();
  if (!plan) return null;
  let found = null;
  plan.days.forEach(day => day.tasks.forEach(task => {
    if (task.id === taskId) {
      task.status = 'done';
      task.completedAt = new Date().toISOString();
      found = task;
    }
  }));
  plan.summary = buildSummary(plan.days, plan.backlogTasks);
  saveSchedulePlan(plan);

  const history = loadScheduleHistory();
  history.unshift({ action: 'done', date: todayKey(), at: new Date().toISOString(), task: found });
  saveScheduleHistory(history.slice(0, 250));
  return found;
}

export function skipTask(taskId) {
  const plan = loadSchedulePlan();
  if (!plan) return null;
  let found = null;
  plan.days.forEach(day => day.tasks.forEach(task => {
    if (task.id === taskId) {
      task.status = 'skipped';
      task.skippedAt = new Date().toISOString();
      found = task;
      plan.backlogTasks.unshift(cloneTask(task, { status: 'pending', source: 'skipped' }));
    }
  }));
  plan.summary = buildSummary(plan.days, plan.backlogTasks);
  saveSchedulePlan(plan);

  const history = loadScheduleHistory();
  history.unshift({ action: 'skip', date: todayKey(), at: new Date().toISOString(), task: found });
  saveScheduleHistory(history.slice(0, 250));
  return found;
}

export function moveTaskToDay(taskId, targetDayKey) {
  const plan = loadSchedulePlan();
  if (!plan) return { ok: false, reason: 'Cronograma não encontrado.' };

  let found = null;
  let fromDay = null;
  plan.days.forEach(day => {
    const idx = day.tasks.findIndex(task => task.id === taskId);
    if (idx >= 0) {
      found = day.tasks.splice(idx, 1)[0];
      fromDay = day;
    }
  });

  if (!found) return { ok: false, reason: 'Tarefa não encontrada.' };

  const target = plan.days.find(day => day.key === targetDayKey && !day.rest);
  if (!target) {
    plan.backlogTasks.unshift(cloneTask(found, { status: 'pending', source: 'moved-to-backlog' }));
    plan.summary = buildSummary(plan.days, plan.backlogTasks);
    saveSchedulePlan(plan);
    return { ok: false, reason: 'Dia escolhido não é dia de estudo. A tarefa foi para o backlog.', task: found };
  }

  const used = target.tasks.reduce((sum, task) => sum + (task.minutes || 0), 0);
  if (used + found.minutes <= target.availableMinutes) {
    found.movedFrom = fromDay?.date || null;
    found.status = 'pending';
    target.tasks.push(found);
    plan.summary = buildSummary(plan.days, plan.backlogTasks);
    saveSchedulePlan(plan);
    return { ok: true, task: found, day: target };
  }

  plan.backlogTasks.unshift(cloneTask(found, { status: 'pending', source: 'moved-to-backlog' }));
  plan.summary = buildSummary(plan.days, plan.backlogTasks);
  saveSchedulePlan(plan);
  return { ok: false, reason: 'Não coube no dia escolhido. A tarefa foi para o backlog.', task: found };
}

export function moveTaskToNextStudyDay(taskId) {
  const plan = loadSchedulePlan();
  if (!plan) return null;
  let found = null;
  let fromDay = null;

  plan.days.forEach(day => {
    const idx = day.tasks.findIndex(task => task.id === taskId);
    if (idx >= 0) {
      found = day.tasks[idx];
      fromDay = day;
    }
  });

  if (!found) return null;

  const startIndex = plan.days.findIndex(day => day.date === fromDay.date);
  const nextDay = plan.days.slice(startIndex + 1).find(day => !day.rest && (day.tasks.reduce((s, t) => s + t.minutes, 0) + found.minutes <= day.availableMinutes));
  return moveTaskToDay(taskId, nextDay?.key || 'backlog');
}

function flattenPendingTasksFromDays(days) {
  return days.flatMap(day => day.tasks.filter(task => task.status === 'pending').map(task => cloneTask(task, { status: 'pending', source: task.source || 'replan' })));
}

export function markTodayMissedAndReplan() {
  const plan = loadSchedulePlan() || ensureCurrentPlan();
  const today = todayKey();
  const todayIndex = plan.days.findIndex(d => d.date === today);
  const day = plan.days[todayIndex];
  if (!day || day.rest) return { plan, moved: 0 };

  const lostTasks = day.tasks
    .filter(task => task.status === 'pending')
    .map(task => cloneTask(task, { status: 'pending', source: 'missed-day', score: (task.score || 0) + 700 }));

  day.tasks.forEach(task => {
    if (task.status === 'pending') task.status = 'missed';
  });
  day.missed = true;

  const futureDays = plan.days.slice(todayIndex + 1);
  const futurePending = flattenPendingTasksFromDays(futureDays);
  futureDays.forEach(futureDay => {
    futureDay.tasks = futureDay.tasks.filter(task => task.status !== 'pending');
  });

  const settings = plan.settings || loadScheduleSettings();
  const totalMinutes = Math.round((Number(settings.hoursPerDay) || 2) * 60);
  const ratios = getRatios(settings);
  const quotas = {
    review: Math.round(totalMinutes * ratios.review),
    new: Math.round(totalMinutes * ratios.new),
    exercise: Math.round(totalMinutes * ratios.exercise),
    error: Math.round(totalMinutes * ratios.error),
  };

  const pool = [
    ...lostTasks,
    ...(plan.backlogTasks || []).map(task => cloneTask(task, { status: 'pending', score: (task.score || 0) + 150 })),
    ...futurePending,
    ...buildCandidates(loadAppStateFromStorage(), settings),
  ].filter(task => task && task.status === 'pending')
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const emergency = detectEmergency(pool, settings);
  const preserve = new Set(plan.days.slice(0, todayIndex + 1).flatMap(d => d.tasks.map(task => task.stableId)));
  const used = fillDays({
    days: plan.days,
    pool,
    settings,
    quotas,
    emergency,
    startIndex: todayIndex + 1,
    preserveStableIds: preserve,
  });

  plan.emergency = emergency;
  plan.backlogTasks = makeBacklog(pool, used, emergency);
  plan.summary = buildSummary(plan.days, plan.backlogTasks);
  saveSchedulePlan(plan);

  const history = loadScheduleHistory();
  history.unshift({ action: 'missed-day', date: today, at: new Date().toISOString(), moved: lostTasks.length });
  saveScheduleHistory(history.slice(0, 250));

  return { plan, moved: lostTasks.length };
}

export function completeTaskProgress(task) {
  if (!task || !['review', 'quick-review', 'new'].includes(task.type)) return false;

  const state = loadAppStateFromStorage();
  let found = null;
  (state.subjects || []).forEach(subject => {
    (subject.topics || []).forEach(topic => {
      (topic.subtopics || []).forEach(sub => {
        if (subject.name === task.subject && topic.name === task.topic && sub.name === task.subtopic) {
          found = { subject, topic, sub };
        }
      });
    });
  });

  if (!found) return false;

  const prevLevel = Number(found.sub.currentLevel) || 0;
  const newLevel = Math.min(prevLevel + 1, 8);
  const now = new Date();
  found.sub.currentLevel = newLevel;
  found.sub.status = newLevel >= 8 ? 'dominado' : 'em revisão';
  found.sub.lastReviewed = now.toISOString();
  found.sub.nextReviewDate = newLevel >= 8 ? null : addDays(now, computeNextIntervalForLevel(newLevel)).toISOString();
  found.sub.updatedAt = Date.now();
  state.stats = state.stats || { totalReviews: 0 };
  state.stats.totalReviews = (state.stats.totalReviews || 0) + 1;
  saveAppStateToStorage(state);

  const progress = loadProgressMap();
  progress[generateProgressKey(found.subject.name, found.topic.name, found.sub.name)] = {
    currentLevel: found.sub.currentLevel,
    lastReviewed: found.sub.lastReviewed,
    nextReviewDate: found.sub.nextReviewDate,
    updatedAt: found.sub.updatedAt,
  };
  saveProgressMap(progress);

  return true;
}

export function pullBacklogTaskToWeek(taskId) {
  const plan = loadSchedulePlan();
  if (!plan) return { ok: false, reason: 'Cronograma não encontrado.' };
  const index = (plan.backlogTasks || []).findIndex(task => task.id === taskId);
  if (index < 0) return { ok: false, reason: 'Tarefa não encontrada no backlog.' };

  const task = plan.backlogTasks.splice(index, 1)[0];
  const startDate = startOfDay(new Date());
  const day = plan.days.find(d => {
    if (d.rest || d.missed) return false;
    if (startOfDay(parseDateKey(d.date)).getTime() < startDate.getTime()) return false;
    const used = d.tasks.reduce((sum, t) => sum + (t.minutes || 0), 0);
    return used + task.minutes <= d.availableMinutes;
  });

  if (!day) {
    plan.backlogTasks.unshift(task);
    saveSchedulePlan(plan);
    return { ok: false, reason: 'Não coube em nenhum dia restante da semana.' };
  }

  day.tasks.push(cloneTask(task, { status: 'pending', source: 'pulled-from-backlog' }));
  plan.summary = buildSummary(plan.days, plan.backlogTasks);
  saveSchedulePlan(plan);
  return { ok: true, task, day };
}

export function clearLowPriorityBacklog() {
  const plan = loadSchedulePlan();
  if (!plan) return { removed: 0 };
  const before = plan.backlogTasks.length;
  plan.backlogTasks = plan.backlogTasks.filter(task => !['Baixa', 'Muito Baixa'].includes(task.priority));
  const removed = before - plan.backlogTasks.length;
  plan.summary = buildSummary(plan.days, plan.backlogTasks);
  saveSchedulePlan(plan);

  const history = loadScheduleHistory();
  history.unshift({ action: 'clear-low-backlog', date: todayKey(), at: new Date().toISOString(), removed });
  saveScheduleHistory(history.slice(0, 250));
  return { removed };
}

export function backlogBreakdown(plan = loadSchedulePlan()) {
  const items = plan?.backlogTasks || [];
  return {
    total: items.length,
    reviews: items.filter(t => t.type === 'review' || t.type === 'quick-review').length,
    newSubjects: items.filter(t => t.type === 'new').length,
    exercises: items.filter(t => t.type === 'exercise').length,
    errors: items.filter(t => t.type === 'error').length,
    high: items.filter(t => t.priority === 'Alta').length,
    low: items.filter(t => ['Baixa', 'Muito Baixa'].includes(t.priority)).length,
  };
}

export function findTaskInPlan(taskId) {
  const plan = loadSchedulePlan();
  if (!plan) return null;
  for (const day of plan.days || []) {
    const task = (day.tasks || []).find(t => t.id === taskId);
    if (task) return { task, day, location: 'week' };
  }
  const task = (plan.backlogTasks || []).find(t => t.id === taskId);
  if (task) return { task, day: null, location: 'backlog' };
  return null;
}
