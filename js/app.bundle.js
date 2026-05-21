/* ApexENEM revisões - bundle sem módulos para abrir direto no navegador */

(function ApexEmergencyBoot(){
  window.__APEX_VERSION__ = 'revisoes-final-funcionando-v4';
  window.addEventListener('error', function(event) {
    try {
      var box = document.getElementById('apexBootError');
      if (!box) {
        box = document.createElement('div');
        box.id = 'apexBootError';
        box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;background:#7f1d1d;color:white;padding:12px 14px;border-radius:12px;font:14px system-ui;box-shadow:0 12px 40px rgba(0,0,0,.35)';
        if (document.body) document.body.appendChild(box);
        else document.addEventListener('DOMContentLoaded', function(){ document.body.appendChild(box); });
      }
      box.textContent = 'Erro no app: ' + (event.message || 'erro desconhecido') + '. Recarregue usando ABRIR_AQUI_LIMPA_CACHE.html.';
    } catch (_) {}
  });
})();

// utils/filters.js
function normalizePriority(priority) {
  if (priority === 'Very Baixa') return 'Muito Baixa';
  if (priority === 'Muito Baixa') return 'Muito Baixa';
  if (priority === 'Alta') return 'Alta';
  if (priority === 'Média') return 'Média';
  if (priority === 'Baixa') return 'Baixa';
  return 'Média';
}

function getPriorityTagLabel(priority) {
  const p = normalizePriority(priority);
  if (p === 'Alta') return 'Cai muito';
  if (p === 'Média') return 'Cai médio';
  return 'Quase não cai';
}

function sanitizeTags(tags, priority) {
  if (!Array.isArray(tags)) return [];

  const prioText = normalizePriority(priority).toLowerCase();
  const prioLabel = getPriorityTagLabel(priority).toLowerCase();
  const seen = new Set();
  const out = [];

  tags.forEach(t => {
    if (!t) return;
    const tag = t.toString().trim();
    if (!tag) return;
    if (tag.toLowerCase() === prioText) return;

    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(tag);
    }
  });

  if (!out.some(t => t.toLowerCase() === prioLabel)) {
    out.unshift(getPriorityTagLabel(priority));
  } else {
    out.sort((a, b) =>
      a.toLowerCase() === prioLabel
        ? -1
        : b.toLowerCase() === prioLabel
          ? 1
          : 0
    );
  }

  return out;
}

function normalizeText(s) {
  return String(s || '').trim();
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getSubStatus(sub, now = new Date()) {
  if (Number(sub.currentLevel) >= 8) return 'dominado';
  if (!sub.nextReviewDate) return 'não iniciado';

  const next = new Date(sub.nextReviewDate);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const nextStart = new Date(next);
  nextStart.setHours(0, 0, 0, 0);

  if (nextStart.getTime() < todayStart.getTime()) return 'atrasado';
  if (sameDay(next, now)) return 'revisão hoje';
  return 'agendado';
}

function isDueTodayOrOverdue(sub, now = new Date()) {
  const status = getSubStatus(sub, now);
  return status === 'atrasado' || status === 'revisão hoje';
}

function isHighNotStarted(sub) {
  return normalizePriority(sub.priority) === 'Alta' && !sub.nextReviewDate && Number(sub.currentLevel) < 8;
}

function filterSubjects(subjects, filters = {}, view = 'all') {
  const now = new Date();
  const search = (filters.search || '').toLowerCase();
  const groups = [];

  subjects.forEach(subject => {
    if (filters.subject && filters.subject !== 'all' && filters.subject !== subject.name) return;

    const subjectGroup = { subject, topics: [] };

    subject.topics.forEach(topic => {
      const topicGroup = { topic, subtopics: [] };

      topic.subtopics.forEach(sub => {
        sub.priority = normalizePriority(sub.priority);

        const status = getSubStatus(sub, now);
        const reviewLabel = `R${Number(sub.currentLevel) || 0}`;

        const errorSearchLabel = Number(sub.errorCount || 0) > 0 ? 'erro erros caderno dificuldade ponto fraco' : '';
        const matchesSearch = [
          sub.name, topic.name, subject.name, ...(sub.tags || []),
          sub.priority, status, reviewLabel, getPriorityTagLabel(sub.priority), errorSearchLabel
        ].some(t => String(t || '').toLowerCase().includes(search));

        const matchesPriority = !filters.priority || filters.priority === 'all' || sub.priority === filters.priority;
        const matchesReview = !filters.review || filters.review === 'all' || reviewLabel === filters.review;
        const matchesStatus = !filters.status || filters.status === 'all' || status === filters.status;
        const matchesHighOnly = !filters.highOnly || sub.priority === 'Alta';

        let matchesView = true;
        const next = sub.nextReviewDate ? new Date(sub.nextReviewDate) : null;

        if (view === 'today') {
          matchesView = next && sameDay(next, now);
        } else if (view === 'studyToday') {
          const dailyIds = Array.isArray(filters.studyTodayIds) ? filters.studyTodayIds : null;
          const isStudyCandidate = isDueTodayOrOverdue(sub, now) || isHighNotStarted(sub);
          matchesView = dailyIds ? dailyIds.includes(sub.id) && isStudyCandidate : isStudyCandidate;
        } else if (view === 'upcoming') {
          matchesView = next && next.getTime() > now.getTime() && !sameDay(next, now);
        } else if (view === 'overdue') {
          matchesView = status === 'atrasado';
        } else if (view === 'high') {
          matchesView = sub.priority === 'Alta';
        } else if (view === 'mastered') {
          matchesView = Number(sub.currentLevel) >= 8;
        } else if (view === 'finalMode') {
          const level = Number(sub.currentLevel) || 0;
          const hasSavedError = Array.isArray(filters.errorTopicKeys)
            ? filters.errorTopicKeys.includes(`${subject.name}|||${topic.name}`.toLowerCase())
            : false;
          matchesView = Number(sub.currentLevel) < 8 && (
            sub.priority === 'Alta' ||
            status === 'atrasado' ||
            level <= 2 ||
            hasSavedError
          );
        }

        if (matchesSearch && matchesPriority && matchesReview && matchesStatus && matchesHighOnly && matchesView) {
          // Não cria cópia com {...sub}: o botão Revisado precisa alterar o objeto original.
          sub.status = status;
          sub.reviewLabel = reviewLabel;
          topicGroup.subtopics.push(sub);
        }
      });

      if (topicGroup.subtopics.length) subjectGroup.topics.push(topicGroup);
    });

    if (subjectGroup.topics.length) groups.push(subjectGroup);
  });

  return groups;
}

// services/storage.js
const STORAGE_KEY = 'apex_enem_v3_state';
const LEGACY_STORAGE_KEY = 'apex_enem_v2_state';
const PROGRESS_KEY = STORAGE_KEY + '_progress';
const LEGACY_PROGRESS_KEY = LEGACY_STORAGE_KEY + '_progress';
const HISTORY_KEY = STORAGE_KEY + '_history';
const LEGACY_HISTORY_KEY = LEGACY_STORAGE_KEY + '_history';
const OPEN_TOPICS_KEY = STORAGE_KEY + '_open_topics';
const DAILY_QUEUE_KEY = STORAGE_KEY + '_daily_review_queue';
const ERROR_NOTES_KEY = STORAGE_KEY + '_error_notes';
const SIMULATIONS_KEY = STORAGE_KEY + '_simulations';

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

function saveAppState(state) {
  safeSet(STORAGE_KEY, state);
}

function loadAppState() {
  return safeGet(STORAGE_KEY, null) || safeGet(LEGACY_STORAGE_KEY, null);
}

function loadProgress() {
  return safeGet(PROGRESS_KEY, {}) || safeGet(LEGACY_PROGRESS_KEY, {}) || {};
}

function saveProgressMap(map) {
  safeSet(PROGRESS_KEY, map || {});
}

function loadHistory() {
  return safeGet(HISTORY_KEY, {}) || safeGet(LEGACY_HISTORY_KEY, {}) || {};
}

function saveHistoryMap(map) {
  safeSet(HISTORY_KEY, map || {});
}

function generateKey(subjectName, topicName, subName) {
  return `${subjectName || ''}|||${topicName || ''}|||${subName || ''}`.toLowerCase().trim();
}

function setSubProgress(subjectName, topicName, subName, data) {
  const map = loadProgress();
  map[generateKey(subjectName, topicName, subName)] = data;
  saveProgressMap(map);
}

function getSubProgress(subjectName, topicName, subName) {
  const map = loadProgress();
  return map[generateKey(subjectName, topicName, subName)] || null;
}

function deleteSubProgress(subjectName, topicName, subName) {
  const map = loadProgress();
  const key = generateKey(subjectName, topicName, subName);

  if (map[key]) {
    delete map[key];
    saveProgressMap(map);
  }
}

function pushSubSnapshot(subjectName, topicName, subName, snapshot) {
  const map = loadHistory();
  const key = generateKey(subjectName, topicName, subName);
  map[key] = map[key] || [];
  map[key].push(snapshot);
  saveHistoryMap(map);
}

function popSubSnapshot(subjectName, topicName, subName) {
  const map = loadHistory();
  const key = generateKey(subjectName, topicName, subName);

  if (!map[key] || !map[key].length) return null;

  const v = map[key].pop();
  saveHistoryMap(map);
  return v;
}

function peekSubSnapshot(subjectName, topicName, subName) {
  const map = loadHistory();
  const key = generateKey(subjectName, topicName, subName);

  if (!map[key] || !map[key].length) return null;

  return map[key][map[key].length - 1];
}

function clearSubHistory(subjectName, topicName, subName) {
  const map = loadHistory();
  const key = generateKey(subjectName, topicName, subName);

  if (map[key]) {
    delete map[key];
    saveHistoryMap(map);
  }
}

function loadOpenTopics() {
  const arr = safeGet(OPEN_TOPICS_KEY, []);
  return Array.isArray(arr) ? arr : [];
}

function saveOpenTopics(keys) {
  const arr = Array.isArray(keys) ? keys : Array.from(keys || []);
  safeSet(OPEN_TOPICS_KEY, arr);
}

function loadDailyReviewQueue() {
  const queue = safeGet(DAILY_QUEUE_KEY, null);
  return queue && typeof queue === 'object' ? queue : null;
}

function saveDailyReviewQueue(queue) {
  safeSet(DAILY_QUEUE_KEY, queue || null);
}

function clearDailyReviewQueue() {
  try {
    localStorage.removeItem(DAILY_QUEUE_KEY);
  } catch (_) {}
}


function loadErrorNotes() {
  const notes = safeGet(ERROR_NOTES_KEY, []);
  return Array.isArray(notes) ? notes : [];
}

function saveErrorNotes(notes) {
  safeSet(ERROR_NOTES_KEY, Array.isArray(notes) ? notes : []);
}

function addErrorNote(note) {
  const notes = loadErrorNotes();
  notes.unshift(note);
  saveErrorNotes(notes);
  return note;
}

function deleteErrorNote(noteId) {
  const notes = loadErrorNotes().filter(note => note.id !== noteId);
  saveErrorNotes(notes);
}

function clearErrorNotes() {
  try {
    localStorage.removeItem(ERROR_NOTES_KEY);
  } catch (_) {}
}




function loadSimulations() {
  const simulations = safeGet(SIMULATIONS_KEY, []);
  return Array.isArray(simulations) ? simulations : [];
}

function saveSimulations(simulations) {
  safeSet(SIMULATIONS_KEY, Array.isArray(simulations) ? simulations : []);
}

function addSimulation(simulation) {
  const simulations = loadSimulations();
  simulations.unshift(simulation);
  saveSimulations(simulations);
  return simulation;
}

function deleteSimulation(simulationId) {
  saveSimulations(loadSimulations().filter(sim => sim.id !== simulationId));
}


function clearAll() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(OPEN_TOPICS_KEY);
    localStorage.removeItem(DAILY_QUEUE_KEY);
    localStorage.removeItem(ERROR_NOTES_KEY);
    localStorage.removeItem(SIMULATIONS_KEY);
  } catch (_) {}
}

const storage = Object.freeze({
  saveAppState: saveAppState,
  loadAppState: loadAppState,
  loadProgress: loadProgress,
  saveProgressMap: saveProgressMap,
  loadHistory: loadHistory,
  saveHistoryMap: saveHistoryMap,
  generateKey: generateKey,
  setSubProgress: setSubProgress,
  getSubProgress: getSubProgress,
  deleteSubProgress: deleteSubProgress,
  pushSubSnapshot: pushSubSnapshot,
  popSubSnapshot: popSubSnapshot,
  peekSubSnapshot: peekSubSnapshot,
  clearSubHistory: clearSubHistory,
  loadOpenTopics: loadOpenTopics,
  saveOpenTopics: saveOpenTopics,
  loadDailyReviewQueue: loadDailyReviewQueue,
  saveDailyReviewQueue: saveDailyReviewQueue,
  clearDailyReviewQueue: clearDailyReviewQueue,
  loadErrorNotes: loadErrorNotes,
  saveErrorNotes: saveErrorNotes,
  addErrorNote: addErrorNote,
  deleteErrorNote: deleteErrorNote,
  clearErrorNotes: clearErrorNotes,
  loadSimulations: loadSimulations,
  saveSimulations: saveSimulations,
  addSimulation: addSimulation,
  deleteSimulation: deleteSimulation,
  clearAll: clearAll
});

// components/card.js
function priorityClass(priority) {
  const p = normalizePriority(priority);
  if (p === 'Alta') return 'priority-alta';
  if (p === 'Média') return 'priority-media';
  if (p === 'Baixa') return 'priority-baixa';
  return 'priority-muito-baixa';
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function fmtDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function nextDateClass(sub) {
  if (!sub.nextReviewDate || Number(sub.currentLevel) >= 8) return '';
  const now = new Date();
  const next = new Date(sub.nextReviewDate);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const nextStart = new Date(next);
  nextStart.setHours(0, 0, 0, 0);
  return nextStart.getTime() < todayStart.getTime() ? 'overdue' : '';
}

function createCardElement(sub, subject, topic, handlers = {}) {
  const el = document.createElement('article');
  el.className = 'study-card';
  el.dataset.subId = sub.id || '';

  if (sub && sub.highlight) el.classList.add('highlight');
  if (sub && sub.priority) el.dataset.priority = normalizePriority(sub.priority);

  const prioLabel = normalizePriority(sub.priority || 'Média');
  const enemLabel = getPriorityTagLabel(prioLabel);
  const tags = sanitizeTags(sub.tags || [enemLabel], prioLabel);
  const extraTags = tags.filter(t => t.toLowerCase() !== enemLabel.toLowerCase());
  const focusHtml = sub && sub.highlight ? `<span class="card-tag focus">Foco ENEM</span>` : '';
  const level = Number(sub.currentLevel) || 0;
  const isMastered = level >= 8;
  const nextClass = nextDateClass(sub);

  el.innerHTML = `
    <div class="card-meta">
      <div class="card-tags">
        <span class="card-tag ${priorityClass(prioLabel)}">${esc(prioLabel)}</span>
        <span class="card-tag status">R${level}</span>
        <span class="card-tag enem">${esc(enemLabel)}</span>
        ${focusHtml}
        ${extraTags.map(t => `<span class="card-tag card-tag-extra">${esc(t)}</span>`).join('')}
      </div>
      <h4>${esc(sub.name)}</h4>
      <p><strong>${esc(subject.name)}</strong> · ${esc(topic.name)}</p>
    </div>

    <div class="card-dates">
      <div class="date-card">
        <span>Status</span>
        <strong>${esc(sub.status || 'não iniciado')}</strong>
      </div>
      <div class="date-card">
        <span>Nível</span>
        <strong>R${level}${isMastered ? ' · Dominado' : ''}</strong>
      </div>
      <div class="date-card">
        <span>Última revisão</span>
        <strong class="${sub.lastReviewed ? '' : 'card-date-muted'}">${fmtDate(sub.lastReviewed)}</strong>
      </div>
      <div class="date-card">
        <span>Próxima revisão</span>
        <strong class="${nextClass || (!sub.nextReviewDate ? 'card-date-muted' : '')}">${isMastered ? 'Dominado' : fmtDate(sub.nextReviewDate)}</strong>
      </div>
    </div>

    <div class="card-actions">
      <button class="btn btn-success btn-mark" type="button">${isMastered ? 'Dominado' : 'Revisado'}</button>
      <button class="btn btn-soft btn-undo" type="button">Desfazer</button>
      <button class="btn btn-soft btn-error-note" type="button">Registrar erro</button>
      <button class="btn btn-soft btn-edit" type="button">Editar</button>
      <button class="btn btn-danger btn-delete" type="button">Excluir</button>
    </div>
  `;

  const markBtn = el.querySelector('.btn-mark');
  const undoBtn = el.querySelector('.btn-undo');
  const errorBtn = el.querySelector('.btn-error-note');
  const editBtn = el.querySelector('.btn-edit');
  const deleteBtn = el.querySelector('.btn-delete');

  markBtn?.addEventListener('click', () => handlers.markReviewed && handlers.markReviewed(sub, subject, topic, el));
  undoBtn?.addEventListener('click', () => handlers.undoReview && handlers.undoReview(sub, subject, topic, el));
  errorBtn?.addEventListener('click', () => handlers.openErrorNote && handlers.openErrorNote({ subject, topic, sub }));
  editBtn?.addEventListener('click', () => handlers.openEdit && handlers.openEdit(sub, subject, topic));
  deleteBtn?.addEventListener('click', () => handlers.deleteSub && handlers.deleteSub(sub, subject, topic));

  try {
    if (markBtn && sub && sub.nextReviewDate && !isMastered) {
      const now = new Date();
      const next = new Date(sub.nextReviewDate);
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const nextStart = new Date(next);
      nextStart.setHours(0, 0, 0, 0);

      if (nextStart.getTime() > todayStart.getTime()) {
        markBtn.disabled = true;
        markBtn.title = `Próxima revisão: ${fmtDateTime(sub.nextReviewDate)}`;
        markBtn.classList.add('disabled');
      }
    }
  } catch (_) {}

  return el;
}

// data/seedData.js
// Seed data: Completo e estruturado de acordo com a incidência do ENEM
const seedData = [
  // ==========================================
  // 1. ELETRODINÂMICA (~21%)
  // ==========================================
  // 🔥 Prioridade máxima
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Corrente elétrica', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Tensão (DDP)', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Potência elétrica', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Energia elétrica', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Lei de Ohm', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Potência no resistor', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Associação de resistores em série', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Associação de resistores em paralelo', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Associação mista de resistores', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Alta', title: 'Revisão de eletrodinâmica', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // 🔥 Estude depois
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Média', title: 'Carga elétrica', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Média', title: 'Segunda Lei de Ohm (resistividade)', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Média', title: 'Amperímetro e voltímetro', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Média', title: 'Leis de Kirchhoff (básico)', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // ✅ Só ver superficialmente
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Baixa', title: 'Geradores elétricos', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Baixa', title: 'Associação de geradores', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Baixa', title: 'Circuito gerador-resistor', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Baixa', title: 'Receptores elétricos', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Baixa', title: 'Geradores + receptores + resistores', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // ❌ Só estudar se sobrar MUITO tempo
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Muito Baixa', title: 'Ponte de Wheatstone', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Muito Baixa', title: 'Capacitores', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Muito Baixa', title: 'Associação de capacitores', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Muito Baixa', title: 'Demonstração de fórmulas', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Eletrodinâmica', topicWeight: '21%', priority: 'Muito Baixa', title: 'Exercícios avançados de Kirchhoff', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },

  // ==========================================
  // 2. TERMOLOGIA + CALORIMETRIA (~16%)
  // ==========================================
  // 🔥 Prioridade máxima
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Conceitos fundamentais', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Escalas térmicas (Celsius, Fahrenheit, Kelvin)', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Quantidade de calor e calor específico', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Calor latente', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Trocas de calor sem mudança de fase', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Trocas de calor com mudança de fase', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Mudanças de estado', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Propagação de calor — condução', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Alta', title: 'Propagação de calor — convecção e irradiação', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // 🔥 Estude depois
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Média', title: 'Dilatação térmica dos sólidos', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Média', title: 'Dilatação térmica dos líquidos', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Média', title: 'Transformações gasosas', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Média', title: 'Equação geral dos gases', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Média', title: '1ª Lei da Termodinâmica', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Média', title: 'Máquinas térmicas', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // ✅ Só ver superficialmente
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Baixa', title: 'Energia interna dos gases', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Baixa', title: 'Trabalho nas transformações gasosas', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Baixa', title: 'Equação de Clapeyron', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Baixa', title: 'Transformações adiabáticas', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // ❌ Só estudar se sobrar MUITO tempo
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Muito Baixa', title: 'Ciclo de Carnot', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Muito Baixa', title: '2ª Lei da Termodinâmica avançada', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Termologia + Calorimetria', topicWeight: '16%', priority: 'Muito Baixa', title: 'Entropia', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },

  // ==========================================
  // 3. ONDULATÓRIA (~14%)
  // ==========================================
  // 🔥 Prioridade máxima
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Alta', title: 'Conceitos iniciais', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Alta', title: 'Equação fundamental (v = fλ)', highlight: true, currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Alta', title: 'Reflexão e refração de ondas', highlight: true, currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Alta', title: 'Som no cotidiano / interpretação', highlight: true, currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Alta', title: 'Acústica — conceitos fundamentais', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Alta', title: 'Timbre, altura e nível sonoro', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Alta', title: 'Efeito Doppler (ambulância/sirene)', highlight: true, currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // 🔥 Estude depois
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Média', title: 'Ondas eletromagnéticas', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Média', title: 'Tsunami / aplicações do som', highlight: true, currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Média', title: 'Interferência', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Média', title: 'Ressonância', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // ✅ Só ver superficialmente
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Baixa', title: 'Cordas sonoras', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Baixa', title: 'Tubos sonoros', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Baixa', title: 'Difração', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  
  // ❌ Só estudar se sobrar MUITO tempo
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Muito Baixa', title: 'Polarização', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Muito Baixa', title: 'Experimento de Young', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Muito Baixa', title: 'MHS (Movimento Harmônico Simples)', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null },
  { subject: 'Física', topic: 'Ondulatória', topicWeight: '14%', priority: 'Muito Baixa', title: 'Equação de Taylor em cordas', currentLevel: 0, status: 'Não iniciado', nextRevisionDate: null }
];


// main.js
/**
 * ApexENEM • main.js
 * Melhorias adicionadas:
 * - Progresso visual por matéria/tópico
 * - Tela "Estudar hoje"
 * - Backup com nomes humanos
 * - Toast ao revisar/desfazer/importar/exportar
 * - Próxima/última revisão dentro dos cards
 * - Tópicos abertos salvos no navegador
 * - Modo foco simples
 * - Calendário resumido de revisões
 * - PWA/app instalável
 * - Modo Reta final
 * - Relatório semanal
 * - Limpeza segura com backup automático
 * - Manual interno
 */

// ─────────────────────────────────────────────────────────────
// CSS GLOBAL — injetado uma única vez
// ─────────────────────────────────────────────────────────────
(function injectGlobalCSS() {
  if (document.getElementById('apex-global-css')) return;

  const style = document.createElement('style');
  style.id = 'apex-global-css';
  style.textContent = `
    .topic-header { cursor: pointer; user-select: none; }
    .topic-header .topic-chevron { transition: transform 0.3s ease; display: inline-block; }
    .topic-header.open .topic-chevron { transform: rotate(180deg); }

    .topic-body {
      overflow: hidden; max-height: 0; opacity: 0; transform: translateY(-6px);
      transition: max-height 0.38s ease, opacity 0.26s ease, transform 0.28s ease;
    }
    .topic-body.open { max-height: 9999px; opacity: 1; transform: translateY(0); }

    .priority-header {
      cursor: pointer; user-select: none;
      display: flex; align-items: center; justify-content: space-between;
      gap: 0.75rem; padding: 0.65rem 0.5rem;
    }
    .priority-header .priority-chevron { transition: transform 0.28s ease; display: inline-block; }
    .priority-header.open .priority-chevron { transform: rotate(180deg); }

    .priority-section > .cards-grid {
      overflow: hidden; max-height: 0; opacity: 0; padding-top: 0;
      transition: max-height 0.35s ease, opacity 0.25s ease, padding 0.25s ease;
    }
    .priority-section > .cards-grid.open { max-height: 9999px; opacity: 1; padding-top: 0.75rem; }

    .notif-badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 20px; height: 20px; padding: 0 5px;
      border-radius: 999px; font-size: 0.7rem; font-weight: 700;
      line-height: 1; flex-shrink: 0;
    }
    .notif-badge.overdue {
      background: rgba(239,68,68,0.18); color: #fca5a5;
      border: 1px solid rgba(239,68,68,0.35);
      animation: apex-pulse 1.8s ease-in-out infinite;
    }
    .notif-badge.today {
      background: rgba(245,158,11,0.16); color: #fcd34d;
      border: 1px solid rgba(245,158,11,0.35);
    }
    @keyframes apex-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
      50% { box-shadow: 0 0 0 5px rgba(239,68,68,0); }
    }

    .urgency-banner {
      display: grid; gap: 1rem;
      padding: 1.25rem 1.35rem;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(239,68,68,0.06), rgba(124,58,237,0.06));
      border: 1px solid rgba(239,68,68,0.2);
      margin-bottom: 1.5rem;
    }
    .urgency-banner.clean {
      background: linear-gradient(135deg, rgba(16,185,129,0.06), rgba(124,58,237,0.06));
      border-color: rgba(16,185,129,0.2);
    }
    .urgency-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .urgency-icon { font-size: 1.6rem; line-height: 1; flex-shrink: 0; }
    .urgency-text { flex: 1; display: grid; gap: 0.25rem; }
    .urgency-text strong { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); }
    .urgency-text h3 { font-size: 1.05rem; line-height: 1.3; color: var(--text); margin: 0; }
    .urgency-text small { color: var(--text-muted); font-size: 0.85rem; }
    .urgency-counters { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .urgency-pill {
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.45rem 0.85rem; border-radius: 999px;
      font-size: 0.83rem; font-weight: 600; border: 1px solid transparent;
    }
    .urgency-pill.overdue { background: rgba(239,68,68,0.12); color: #fca5a5; border-color: rgba(239,68,68,0.25); }
    .urgency-pill.today { background: rgba(245,158,11,0.12); color: #fcd34d; border-color: rgba(245,158,11,0.25); }
    .urgency-pill.ok { background: rgba(16,185,129,0.1); color: #6ee7b7; border-color: rgba(16,185,129,0.2); }
    .urgency-pill i { font-size: 0.9rem; }

    .daily-limit-banner {
      display: grid;
      gap: 0.9rem;
      padding: 1.2rem 1.35rem;
      border-radius: 18px;
      background:
        linear-gradient(135deg, rgba(124,58,237,0.12), rgba(59,130,246,0.06)),
        rgba(255,255,255,0.035);
      border: 1px solid rgba(124,58,237,0.22);
      box-shadow: 0 14px 42px rgba(2,6,23,0.32);
      position: relative;
      overflow: hidden;
      margin-bottom: 1rem;
    }
    .daily-limit-banner::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at top right, rgba(250,204,21,0.12), transparent 32%);
    }
    .daily-limit-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      position: relative;
      z-index: 1;
    }
    .daily-limit-title { display: grid; gap: 0.25rem; }
    .daily-limit-title strong { font-size: 1.03rem; color: var(--text); }
    .daily-limit-title small { color: var(--text-muted); line-height: 1.45; }
    .daily-limit-big {
      min-width: 84px;
      text-align: center;
      padding: 0.65rem 0.8rem;
      border-radius: 16px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      color: var(--text);
      font-weight: 800;
      font-size: 1.25rem;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
    }
    .daily-limit-big span {
      display: block;
      font-size: 0.66rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-top: 0.1rem;
    }
    .daily-limit-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      position: relative;
      z-index: 1;
    }
    .daily-limit-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.42rem 0.72rem;
      border-radius: 999px;
      background: rgba(255,255,255,0.055);
      color: var(--text-soft);
      border: 1px solid rgba(255,255,255,0.07);
      font-size: 0.82rem;
      font-weight: 650;
    }
    .daily-limit-pill.done { color: #6ee7b7; border-color: rgba(16,185,129,0.2); background: rgba(16,185,129,0.09); }
    .daily-limit-pill.left { color: #fcd34d; border-color: rgba(245,158,11,0.22); background: rgba(245,158,11,0.10); }
    .daily-limit-pill.backlog { color: #fca5a5; border-color: rgba(239,68,68,0.18); background: rgba(239,68,68,0.08); }

    .dashboard-subtitle-alert { color: #fca5a5; font-weight: 700; }
    .dashboard-subtitle-today { color: #fcd34d; font-weight: 600; }
  `;

  document.head.appendChild(style);
})();

// ─────────────────────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────────────────────
let appState = {
  subjects: [],
  filters: {
    subject: 'all',
    priority: 'all',
    review: 'all',
    status: 'all',
    search: '',
    highOnly: false,
  },
  currentView: 'all',
  stats: { totalReviews: 0 },
  settings: { dailyLimit: 3 },
};

let editing = null;
let openTopicKeys = new Set(storage.loadOpenTopics());
let focusQueue = [];
let focusIndex = 0;

const $ = id => document.getElementById(id);
const DEFAULT_DAILY_REVIEW_LIMIT = 3;
const ALLOWED_DAILY_LIMITS = [1, 3, 5];
const REVIEWS_ONLY_VERSION = 'revisoes-only-v4';
const VALID_FILTER_VALUES = {
  priority: ['all', 'Alta', 'Média', 'Baixa', 'Muito Baixa'],
  status: ['all', 'não iniciado', 'revisão hoje', 'agendado', 'atrasado', 'dominado'],
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function computeNextIntervalForLevel(level) {
  level = Number(level) || 0;

  if (level <= 1) return 1;
  if (level === 2) return 3;
  if (level === 3) return 7;
  if (level === 4) return 10;
  if (level === 5) return 14;
  if (level === 6) return 14;
  if (level === 7) return 21;

  return 21;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days));
  return d;
}

function uuid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2, 11);
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function fmtDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDateLong(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function setEl(id, val) {
  const e = $(id);
  if (e) e.textContent = val;
}

function showToast(message, duration = 2800) {
  const toast = $('toastContainer');
  const text = $('toastText');
  if (!toast || !text) return;

  text.textContent = message;
  toast.hidden = false;
  toast.classList.add('show');

  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    toast.classList.remove('show');
    window.setTimeout(() => {
      toast.hidden = true;
    }, 250);
  }, duration);
}

function saveApp() {
  storage.saveAppState({
    modeVersion: REVIEWS_ONLY_VERSION,
    subjects: appState.subjects,
    filters: appState.filters,
    currentView: appState.currentView,
    stats: appState.stats,
    settings: appState.settings,
  });
}

function persistOpenTopics() {
  storage.saveOpenTopics(Array.from(openTopicKeys));
}

function syncProgressStorageFromSubjects() {
  const progressMap = {};

  appState.subjects.forEach(subject => {
    subject.topics.forEach(topic => {
      topic.subtopics.forEach(sub => {
        const key = storage.generateKey(subject.name, topic.name, sub.name);
        progressMap[key] = {
          currentLevel: Number(sub.currentLevel) || 0,
          lastReviewed: sub.lastReviewed || null,
          nextReviewDate: sub.nextReviewDate || null,
          updatedAt: sub.updatedAt || Date.now(),
          errorCount: Number(sub.errorCount || 0),
          lastErrorAt: sub.lastErrorAt || null,
        };
      });
    });
  });

  storage.saveProgressMap(progressMap);
}

function resetAllFilters() {
  appState.currentView = 'all';
  appState.filters = {
    subject: 'all',
    priority: 'all',
    review: 'all',
    status: 'all',
    search: '',
    highOnly: false,
  };

  const searchInput = $('searchInput');
  const subjectFilter = $('subjectFilter');
  const priorityFilter = $('priorityFilter');
  const reviewFilter = $('reviewFilter');
  const statusFilter = $('statusFilter');
  const highToggle = $('highPriorityToggle');
  const finalModeBtn = $('btnFinalMode');

  if (searchInput) searchInput.value = '';
  if (subjectFilter) subjectFilter.value = 'all';
  if (priorityFilter) priorityFilter.value = 'all';
  if (reviewFilter) reviewFilter.value = 'all';
  if (statusFilter) statusFilter.value = 'all';
  renderSearchSuggestions('');
  if (highToggle) highToggle.classList.remove('active');
  if (finalModeBtn) finalModeBtn.classList.remove('active');
}


function normalizeSavedFilters() {
  appState.filters = {
    subject: 'all',
    priority: 'all',
    review: 'all',
    status: 'all',
    search: '',
    highOnly: false,
    ...(appState.filters || {}),
  };

  const subjectNames = new Set(appState.subjects.map(s => s.name));
  if (appState.filters.subject !== 'all' && !subjectNames.has(appState.filters.subject)) {
    appState.filters.subject = 'all';
  }

  if (!VALID_FILTER_VALUES.priority.includes(appState.filters.priority)) appState.filters.priority = 'all';
  if (!VALID_FILTER_VALUES.status.includes(appState.filters.status)) appState.filters.status = 'all';

  const review = String(appState.filters.review || 'all');
  if (review !== 'all' && !/^R[0-8]$/.test(review)) appState.filters.review = 'all';

  const allowedViews = new Set(['all', 'studyToday', 'finalMode', 'high', 'today', 'upcoming', 'overdue', 'mastered']);
  if (!allowedViews.has(appState.currentView)) appState.currentView = 'all';
}

function showEverything() {
  resetAllFilters();
  renderFilters();
  renderSidebar();
  renderDashboard();
  saveApp();
  showToast('Filtros limpos. Mostrando todos os tópicos.');
}

function closeStuckOverlays() {
  ['itemModal', 'errorNotebookModal', 'reportModal', 'manualModal', 'simulationsModal'].forEach(id => {
    const modal = $(id);
    if (!modal) return;
    modal.hidden = true;
    modal.classList.add('hidden');
    modal.classList.remove('active');
  });

  const focusOverlay = $('focusOverlay');
  if (focusOverlay) {
    focusOverlay.hidden = true;
    focusOverlay.classList.add('hidden');
    focusOverlay.classList.remove('active');
  }
  document.body.classList.remove('hidden-ui');
}

function mergeSeedTopicsPreservingProgress() {
  const seedSubjects = buildSeedHierarchy();
  let changed = false;

  seedSubjects.forEach(seedSubject => {
    let subject = appState.subjects.find(s => String(s.name || '').toLowerCase() === seedSubject.name.toLowerCase());
    if (!subject) {
      appState.subjects.push(seedSubject);
      changed = true;
      return;
    }

    subject.color = subject.color || seedSubject.color;
    subject.topics = Array.isArray(subject.topics) ? subject.topics : [];

    seedSubject.topics.forEach(seedTopic => {
      let topic = subject.topics.find(t => String(t.name || '').toLowerCase() === seedTopic.name.toLowerCase());
      if (!topic) {
        subject.topics.push(seedTopic);
        changed = true;
        return;
      }

      topic.enemWeight = topic.enemWeight || seedTopic.enemWeight;
      topic.subtopics = Array.isArray(topic.subtopics) ? topic.subtopics : [];

      seedTopic.subtopics.forEach(seedSub => {
        const exists = topic.subtopics.some(sub => String(sub.name || '').toLowerCase() === seedSub.name.toLowerCase());
        if (!exists) {
          topic.subtopics.push(seedSub);
          changed = true;
        }
      });
    });
  });

  return changed;
}

function topicKey(subjectName, topicName) {
  return `${subjectName}|||${topicName}`;
}

function getViewLabel() {
  if (appState.currentView === 'studyToday') return 'Estudar hoje';
  if (appState.currentView === 'finalMode') return 'Reta final';
  if (appState.currentView === 'high') return 'Prioridades altas';
  if (appState.currentView === 'today') return 'Revisões de hoje';
  if (appState.currentView === 'overdue') return 'Atrasadas';
  if (appState.currentView === 'mastered') return 'Dominados';
  return 'Todas as revisões';
}

function flattenAllSubtopics() {
  const out = [];
  appState.subjects.forEach(subject => {
    subject.topics.forEach(topic => {
      topic.subtopics.forEach(sub => out.push({ subject, topic, sub }));
    });
  });
  return out;
}

function countTopicProgress(topic) {
  const total = topic.subtopics.length;
  const mastered = topic.subtopics.filter(s => Number(s.currentLevel) >= 8).length;
  const reviewed = topic.subtopics.filter(s => Number(s.currentLevel) > 0).length;
  const percent = total ? Math.round((reviewed / total) * 100) : 0;
  return { total, mastered, reviewed, percent };
}

function countSubjectProgress(subject) {
  const subs = subject.topics.flatMap(t => t.subtopics);
  const total = subs.length;
  const mastered = subs.filter(s => Number(s.currentLevel) >= 8).length;
  const reviewed = subs.filter(s => Number(s.currentLevel) > 0).length;
  const percent = total ? Math.round((reviewed / total) * 100) : 0;
  return { total, mastered, reviewed, percent };
}

function getTodayKey(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getDailyReviewLimit() {
  const raw = Number(appState.settings?.dailyLimit) || DEFAULT_DAILY_REVIEW_LIMIT;
  return ALLOWED_DAILY_LIMITS.includes(raw) ? raw : DEFAULT_DAILY_REVIEW_LIMIT;
}

function setDailyReviewLimit(value) {
  const limit = ALLOWED_DAILY_LIMITS.includes(Number(value)) ? Number(value) : DEFAULT_DAILY_REVIEW_LIMIT;
  appState.settings = { ...(appState.settings || {}), dailyLimit: limit };

  if (limit !== 1) {
    appState.settings.tiredModeDate = null;
  }

  return limit;
}

function isTiredModeToday() {
  return appState.settings?.tiredModeDate === getTodayKey() && getDailyReviewLimit() === 1;
}

function applyTiredModeRollover() {
  if (appState.settings?.tiredModeDate && appState.settings.tiredModeDate !== getTodayKey()) {
    appState.settings = {
      ...(appState.settings || {}),
      dailyLimit: DEFAULT_DAILY_REVIEW_LIMIT,
      tiredModeDate: null,
    };
    storage.clearDailyReviewQueue();
    saveApp();
  }
}

function refreshTiredModeButton() {
  const btn = $('btnTiredMode');
  if (!btn) return;

  const active = isTiredModeToday();
  btn.classList.toggle('active', active);
  btn.title = active
    ? 'Modo leve ativo: hoje a meta é só 1 revisão.'
    : 'Ativa uma meta leve de 1 revisão só para hoje.';
}

function activateTiredMode() {
  appState.settings = {
    ...(appState.settings || {}),
    dailyLimit: 1,
    tiredModeDate: getTodayKey(),
  };

  storage.clearDailyReviewQueue();

  const dailyLimitSelect = $('dailyLimitSelect');
  if (dailyLimitSelect) dailyLimitSelect.value = '1';

  if (appState.currentView === 'studyToday') {
    resolveDailyReviewPlan();
  }

  refreshTiredModeButton();
  renderDashboard();
  saveApp();
  showToast('Modo leve ativado: hoje você só precisa fazer 1 revisão.');
}

function getBacklogSummaryCount() {
  const today = getTodayKey();
  const candidates = buildStudyTodayCandidates();
  const queue = storage.loadDailyReviewQueue();

  if (queue && queue.date === today && Array.isArray(queue.ids)) {
    const queued = new Set(queue.ids);
    return candidates.filter(item => !queued.has(item.sub.id)).length;
  }

  return Math.max(0, candidates.length - getDailyReviewLimit());
}

function getStudyReason(item, now = new Date()) {
  const status = getSubStatus(item.sub, now);
  if (status === 'atrasado') return 'Revisão atrasada';
  if (status === 'revisão hoje') return 'Revisão marcada para hoje';
  if (hasErrorBoost(item.sub)) return `Erro recorrente no caderno (${Number(item.sub.errorCount || 0)}x)`;
  if (isHighNotStarted(item.sub)) return 'Prioridade Alta ainda não iniciada';
  return 'Item importante da fila';
}

function getStudyCandidateRank(item, now = new Date()) {
  const status = getSubStatus(item.sub, now);
  const isHighStart = isHighNotStarted(item.sub);
  const prioRank = { Alta: 0, Média: 1, Baixa: 2, 'Muito Baixa': 3 };

  const group = status === 'atrasado' ? 0
    : status === 'revisão hoje' ? 1
      : hasErrorBoost(item.sub) ? 2
        : isHighStart ? 3
          : 4;

  const dateMs = item.sub.nextReviewDate
    ? new Date(item.sub.nextReviewDate).getTime()
    : Number.MAX_SAFE_INTEGER;

  return {
    group,
    dateMs,
    priority: prioRank[normalizePriority(item.sub.priority)] ?? 99,
    level: Number(item.sub.currentLevel) || 0,
    errorBoost: -(Number(item.sub.errorCount || 0)),
    name: String(item.sub.name || '').toLowerCase(),
  };
}

function compareStudyCandidates(a, b, now = new Date()) {
  const ar = getStudyCandidateRank(a, now);
  const br = getStudyCandidateRank(b, now);

  if (ar.group !== br.group) return ar.group - br.group;
  if (ar.dateMs !== br.dateMs) return ar.dateMs - br.dateMs;
  if (ar.priority !== br.priority) return ar.priority - br.priority;
  if (ar.level !== br.level) return ar.level - br.level;
  if (ar.errorBoost !== br.errorBoost) return ar.errorBoost - br.errorBoost;
  return ar.name.localeCompare(br.name);
}

function hasErrorBoost(sub) {
  return Number(sub?.errorCount || 0) >= 2 && Number(sub?.currentLevel || 0) < 8;
}

function buildStudyTodayCandidates(now = new Date()) {
  return flattenAllSubtopics()
    .filter(({ sub }) => Number(sub.currentLevel) < 8 && (isDueTodayOrOverdue(sub, now) || isHighNotStarted(sub) || hasErrorBoost(sub)))
    .sort((a, b) => compareStudyCandidates(a, b, now));
}



function resolveErrorsToReviewToday(limit = 2) {
  return storage.loadErrorNotes()
    .filter(note => note && note.createdAt)
    .slice(0, limit);
}

function buildTodayHomeData() {
  const plan = resolveDailyReviewPlan();
  const errors = resolveErrorsToReviewToday(2);
  return {
    reviewCount: plan.remainingItems.length,
    reviewLimit: plan.limit,
    errorsToRead: errors.length,
    backlog: getBacklogSummaryCount(),
  };
}

function buildTodayHomeCard() {
  const data = buildTodayHomeData();
  const card = document.createElement('article');
  card.className = 'subject-progress-card home-today-card';
  card.innerHTML = `
    <div class="home-today-top">
      <div>
        <strong>Hoje no ApexENEM</strong>
        <small>Fila simples para revisar sem se perder no dashboard.</small>
      </div>
      <span class="home-today-badge">${data.reviewCount}/${data.reviewLimit} revisões</span>
    </div>
    <div class="home-today-grid">
      <div><span>Revisões</span><strong>${data.reviewCount}</strong><small>fila diária restante</small></div>
      <div><span>Meta diária</span><strong>${data.reviewLimit}</strong><small>limite de revisões</small></div>
      <div><span>Erros</span><strong>${data.errorsToRead}</strong><small>para reler no caderno</small></div>
      <div><span>Fora da fila</span><strong>${data.backlog}</strong><small>revisões guardadas para depois</small></div>
    </div>
    <div class="home-today-actions">
      <button class="btn btn-primary" id="homeStartNow" type="button"><i class="ph ph-play"></i> Começar revisões</button>
    </div>
  `;
  return card;
}

function resolveDailyReviewPlan() {
  const today = getTodayKey();
  const now = new Date();
  const limit = getDailyReviewLimit();
  const allItems = flattenAllSubtopics();
  const itemById = new Map(allItems.map(item => [item.sub.id, item]));
  const candidates = buildStudyTodayCandidates(now);
  const candidateIds = new Set(candidates.map(item => item.sub.id));

  let queue = storage.loadDailyReviewQueue();
  let ids = [];
  let skippedIds = [];

  if (!queue || queue.date !== today || !Array.isArray(queue.ids)) {
    ids = candidates.slice(0, limit).map(item => item.sub.id);
    skippedIds = [];
    queue = {
      date: today,
      limit,
      ids,
      skippedIds,
      createdAt: new Date().toISOString(),
      locked: true,
    };
    storage.saveDailyReviewQueue(queue);
  } else {
    skippedIds = Array.isArray(queue.skippedIds) ? queue.skippedIds.filter(id => itemById.has(id)) : [];
    ids = queue.ids.filter(id => itemById.has(id));

    const limitChanged = queue.limit !== limit;

    if (limitChanged && limit > ids.length) {
      const selected = new Set(ids);
      const fill = candidates
        .filter(item => !selected.has(item.sub.id))
        .slice(0, limit - ids.length)
        .map(item => item.sub.id);
      ids = ids.concat(fill);
    }

    if (limitChanged && limit < ids.length) {
      ids = ids.slice(0, limit);
      skippedIds = skippedIds.filter(id => ids.includes(id));
    }

    // Se algum item foi deletado e a fila ficou menor, completa só essa vaga perdida.
    if (ids.length < limit) {
      const selected = new Set(ids);
      const fill = candidates
        .filter(item => !selected.has(item.sub.id))
        .slice(0, limit - ids.length)
        .map(item => item.sub.id);
      ids = ids.concat(fill);
    }

    const changed =
      ids.join('|') !== (queue.ids || []).join('|') ||
      skippedIds.join('|') !== (queue.skippedIds || []).join('|') ||
      queue.limit !== limit ||
      queue.locked !== true;

    if (changed) {
      queue = { ...queue, ids, skippedIds, limit, locked: true };
      storage.saveDailyReviewQueue(queue);
    }
  }

  const selectedSet = new Set(ids);
  const skippedSet = new Set(skippedIds);
  const selectedItems = ids.map(id => itemById.get(id)).filter(Boolean);
  const skippedItems = selectedItems.filter(item => skippedSet.has(item.sub.id));
  const remainingItems = selectedItems.filter(item => candidateIds.has(item.sub.id) && !skippedSet.has(item.sub.id));
  const completedItems = selectedItems.filter(item => !candidateIds.has(item.sub.id) && !skippedSet.has(item.sub.id));
  const backlogItems = candidates.filter(item => !selectedSet.has(item.sub.id));

  return {
    date: today,
    limit,
    ids,
    skippedIds,
    selectedItems,
    remainingItems,
    skippedItems,
    completedItems,
    remainingIds: remainingItems.map(item => item.sub.id),
    completed: completedItems.length,
    skipped: skippedItems.length,
    selectedCount: selectedItems.length,
    backlogCount: backlogItems.length,
    candidateCount: candidates.length,
    locked: true,
  };
}

function skipDailyItem(subId) {
  const today = getTodayKey();
  const queue = storage.loadDailyReviewQueue() || { date: today, limit: getDailyReviewLimit(), ids: [], skippedIds: [] };

  if (queue.date !== today) return;

  const ids = Array.isArray(queue.ids) ? queue.ids : [];
  const skippedIds = new Set(Array.isArray(queue.skippedIds) ? queue.skippedIds : []);

  if (ids.includes(subId)) skippedIds.add(subId);

  storage.saveDailyReviewQueue({
    ...queue,
    limit: getDailyReviewLimit(),
    skippedIds: Array.from(skippedIds),
    locked: true,
  });
}

function buildDailyLimitBanner(plan) {
  const banner = document.createElement('div');
  banner.className = 'daily-limit-banner';

  const remaining = plan.remainingItems.length;
  const completed = plan.completed;
  const skipped = plan.skipped;
  const selectedCount = plan.selectedCount;
  const backlog = plan.backlogCount;

  const title = remaining > 0
    ? `Fila travada de hoje: ${remaining} revisão(ões) restante(s)`
    : selectedCount > 0
      ? 'Meta de hoje concluída ✅'
      : 'Sem revisões obrigatórias hoje ✅';

  const detail = selectedCount > 0
    ? `A fila foi escolhida e salva para ${plan.date}. Ela não muda ao recarregar a página e não puxa itens infinitos.`
    : 'Não encontrei revisão atrasada, revisão de hoje ou prioridade alta não iniciada para montar a fila.';

  banner.innerHTML = `
    <div class="daily-limit-top">
      <div class="daily-limit-title">
        <strong>${title}</strong>
        <small>${detail}</small>
      </div>
      <div class="daily-limit-big">${remaining}/${plan.limit}<span>restantes</span></div>
    </div>
    <div class="daily-limit-pills">
      <span class="daily-limit-pill left"><i class="ph ph-lock-key"></i> Fila travada</span>
      <span class="daily-limit-pill left"><i class="ph ph-lightning"></i> Meta diária: ${plan.limit}</span>
      <span class="daily-limit-pill done"><i class="ph ph-check-circle"></i> Feitas: ${completed}</span>
      <span class="daily-limit-pill skip"><i class="ph ph-skip-forward"></i> Puladas hoje: ${skipped}</span>
      <span class="daily-limit-pill backlog"><i class="ph ph-stack"></i> Fora da fila: ${backlog}</span>
    </div>
  `;

  return banner;
}

// ─────────────────────────────────────────────────────────────
// DADOS
// ─────────────────────────────────────────────────────────────
function buildSeedHierarchy() {
  const subjects = [];

  seedData.forEach(item => {
    let subject = subjects.find(s => s.name === item.subject);

    if (!subject) {
      subject = { id: uuid(), name: item.subject, color: '#7c3aed', topics: [] };
      subjects.push(subject);
    }

    let topic = subject.topics.find(t => t.name === item.topic);

    if (!topic) {
      topic = { id: uuid(), name: item.topic, enemWeight: item.topicWeight || '–', subtopics: [] };
      subject.topics.push(topic);
    }

    const priority = normalizePriority(item.priority || 'Média');
    const tags = sanitizeTags([getPriorityTagLabel(priority)], priority);

    topic.subtopics.push({
      id: uuid(),
      name: item.title,
      priority,
      currentLevel: Number(item.currentLevel) || 0,
      status: 'não iniciado',
      nextReviewDate: item.nextReviewDate || item.nextRevisionDate || null,
      lastReviewed: item.lastReviewed || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notes: '',
      tags,
      highlight: item.highlight || false,
    });
  });

  return subjects;
}

function normalizeSubjects(subjects) {
  subjects.forEach(subject => {
    if (!subject.id) subject.id = uuid();
    subject.color = subject.color || '#7c3aed';
    subject.topics = Array.isArray(subject.topics) ? subject.topics : [];

    subject.topics.forEach(topic => {
      if (!topic.id) topic.id = uuid();
      topic.enemWeight = topic.enemWeight || '–';
      topic.subtopics = Array.isArray(topic.subtopics) ? topic.subtopics : [];

      topic.subtopics.forEach(sub => {
        if (!sub.id) sub.id = uuid();
        sub.priority = normalizePriority(sub.priority || 'Média');
        sub.currentLevel = Number(sub.currentLevel) || 0;

        if (sub.nextRevisionDate && !sub.nextReviewDate) {
          sub.nextReviewDate = sub.nextRevisionDate;
        }

        sub.tags = sanitizeTags(
          Array.isArray(sub.tags) ? sub.tags : [getPriorityTagLabel(sub.priority)],
          sub.priority
        );

        sub.lastReviewed = sub.lastReviewed || null;
        sub.nextReviewDate = sub.currentLevel >= 8 ? null : (sub.nextReviewDate || null);
        sub.createdAt = sub.createdAt || Date.now();
        sub.updatedAt = sub.updatedAt || Date.now();
        sub.errorCount = Number(sub.errorCount || 0);
        sub.lastErrorAt = sub.lastErrorAt || null;
        sub.status = getSubStatus(sub);
      });
    });
  });
}

function applyProgressFromStorage() {
  appState.subjects.forEach(subject => {
    subject.topics.forEach(topic => {
      topic.subtopics.forEach(sub => {
        const p = storage.getSubProgress(subject.name, topic.name, sub.name);

        if (p) {
          sub.currentLevel = Number(p.currentLevel) || 0;
          sub.lastReviewed = p.lastReviewed || null;
          sub.nextReviewDate = sub.currentLevel >= 8 ? null : (p.nextReviewDate || null);
          sub.errorCount = Number(p.errorCount || sub.errorCount || 0);
          sub.lastErrorAt = p.lastErrorAt || sub.lastErrorAt || null;
          sub.updatedAt = p.updatedAt || Date.now();
          sub.status = getSubStatus(sub);
        }
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────
// URGÊNCIA E CALENDÁRIO
// ─────────────────────────────────────────────────────────────
function buildUrgencyStats() {
  const now = new Date();
  const stats = {
    overdue: 0,
    today: 0,
    upcoming: 0,
    notStarted: 0,
    mastered: 0,
    urgentCandidate: null,
    _worstOverdueMs: Infinity,
    _bestTodayPrio: null,
  };

  const topicPending = new Map();
  const prioPending = new Map();
  const PRIO_ORDER = { Alta: 0, Média: 1, Baixa: 2, 'Muito Baixa': 3 };

  appState.subjects.forEach(subject => {
    subject.topics.forEach(topic => {
      const tKey = topicKey(subject.name, topic.name);

      topic.subtopics.forEach(sub => {
        sub.priority = normalizePriority(sub.priority);
        sub.status = getSubStatus(sub, now);

        const pKey = `${tKey}|||${sub.priority}`;
        if (!topicPending.has(tKey)) topicPending.set(tKey, { overdue: 0, today: 0 });
        if (!prioPending.has(pKey)) prioPending.set(pKey, { overdue: 0, today: 0 });

        const tp = topicPending.get(tKey);
        const pp = prioPending.get(pKey);

        if (Number(sub.currentLevel) >= 8) {
          stats.mastered++;
          return;
        }

        if (!sub.nextReviewDate) {
          stats.notStarted++;
          return;
        }

        const nextMs = new Date(sub.nextReviewDate).getTime();

        if (sub.status === 'atrasado') {
          stats.overdue++;
          tp.overdue++;
          pp.overdue++;

          if (nextMs < stats._worstOverdueMs) {
            stats._worstOverdueMs = nextMs;
            stats.urgentCandidate = { sub, subjectName: subject.name, topicName: topic.name, nextReviewDate: sub.nextReviewDate };
          }
        } else if (sub.status === 'revisão hoje') {
          stats.today++;
          tp.today++;
          pp.today++;

          const prioRank = PRIO_ORDER[sub.priority] ?? 99;
          if (!stats.urgentCandidate && (stats._bestTodayPrio === null || prioRank < stats._bestTodayPrio)) {
            stats._bestTodayPrio = prioRank;
            stats.urgentCandidate = { sub, subjectName: subject.name, topicName: topic.name, nextReviewDate: sub.nextReviewDate };
          }
        } else {
          stats.upcoming++;
        }
      });
    });
  });

  return { stats, topicPending, prioPending };
}

function buildReviewCalendar(days = 7) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const rows = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(todayStart);
    d.setDate(todayStart.getDate() + i);
    rows.push({
      date: d,
      key: d.toISOString().slice(0, 10),
      count: 0,
      high: 0,
      medium: 0,
      low: 0,
      items: [],
    });
  }

  const overdueItems = [];

  flattenAllSubtopics().forEach(({ subject, topic, sub }) => {
    if (!sub.nextReviewDate || Number(sub.currentLevel) >= 8) return;

    const next = new Date(sub.nextReviewDate);
    const nextStart = new Date(next);
    nextStart.setHours(0, 0, 0, 0);
    const priority = normalizePriority(sub.priority);
    const item = { subject, topic, sub, priority, nextReviewDate: sub.nextReviewDate };

    if (nextStart.getTime() < todayStart.getTime()) {
      overdueItems.push(item);
      return;
    }

    const diffDays = Math.round((nextStart.getTime() - todayStart.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < rows.length) {
      const row = rows[diffDays];
      row.count++;
      if (priority === 'Alta') row.high++;
      else if (priority === 'Média') row.medium++;
      else row.low++;
      row.items.push(item);
    }
  });

  rows.forEach((row, index) => {
    row.items.sort((a, b) => {
      const order = { Alta: 0, Média: 1, Baixa: 2, 'Muito Baixa': 3 };
      return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
    });
    row.label = index === 0 ? 'Hoje' : index === 1 ? 'Amanhã' : fmtDateLong(row.date.toISOString());
    row.shortDate = row.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    row.state = index === 0 ? 'today' : index === 1 ? 'tomorrow' : row.count === 0 ? 'empty' : 'future';
  });

  const busiest = rows.reduce((best, row) => row.count > (best?.count || 0) ? row : best, null);
  const totalUpcoming = rows.reduce((sum, row) => sum + row.count, 0);

  return {
    overdue: overdueItems.length,
    overdueItems: overdueItems.sort((a, b) => {
      const order = { Alta: 0, Média: 1, Baixa: 2, 'Muito Baixa': 3 };
      return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
    }),
    totalUpcoming,
    busiestKey: busiest?.key || null,
    rows,
  };
}

function buildUrgencyBanner(stats) {
  const banner = document.createElement('div');
  const isClean = stats.overdue === 0 && stats.today === 0;
  banner.className = `urgency-banner${isClean ? ' clean' : ''}`;

  let icon;
  let heading;
  let detail;

  if (stats.urgentCandidate) {
    const c = stats.urgentCandidate;
    icon = stats.overdue > 0 ? '🚨' : '⏰';
    heading = esc(c.sub.name);
    detail = `${esc(c.subjectName)} · ${esc(c.topicName)} · Agendado para: ${fmtDateTime(c.nextReviewDate)}`;
  } else if (stats.notStarted > 0) {
    icon = '📚';
    heading = 'Nenhuma revisão agendada ainda';
    detail = `Você tem ${stats.notStarted} subassunto(s) não iniciado(s). Comece pelos de prioridade alta.`;
  } else {
    icon = '✅';
    heading = 'Tudo em dia!';
    detail = 'Nenhuma revisão atrasada ou pendente para hoje.';
  }

  banner.innerHTML = `
    <div class="urgency-top">
      <span class="urgency-icon">${icon}</span>
      <div class="urgency-text">
        <strong>${stats.overdue > 0 ? '🔴 Tarefa urgente' : stats.today > 0 ? '🟡 Próxima revisão de hoje' : '📋 Status atual'}</strong>
        <h3>${heading}</h3>
        <small>${detail}</small>
      </div>
    </div>
    <div class="urgency-counters">
      ${stats.overdue > 0 ? `<span class="urgency-pill overdue"><i class="ph ph-warning-circle"></i> ${stats.overdue} atrasada${stats.overdue !== 1 ? 's' : ''}</span>` : ''}
      ${stats.today > 0 ? `<span class="urgency-pill today"><i class="ph ph-clock"></i> ${stats.today} para hoje</span>` : ''}
      ${stats.upcoming > 0 ? `<span class="urgency-pill ok"><i class="ph ph-calendar-check"></i> ${stats.upcoming} agendada${stats.upcoming !== 1 ? 's' : ''}</span>` : ''}
      ${isClean && stats.urgentCandidate === null && stats.notStarted === 0 ? `<span class="urgency-pill ok"><i class="ph ph-check-circle"></i> Em dia!</span>` : ''}
    </div>`;

  return banner;
}

function buildNotifBadge(counts) {
  if (!counts || (counts.overdue === 0 && counts.today === 0)) return null;

  const badge = document.createElement('span');
  if (counts.overdue > 0) {
    badge.className = 'notif-badge overdue';
    badge.textContent = counts.overdue;
    badge.title = `${counts.overdue} revisão(ões) atrasada(s)`;
  } else {
    badge.className = 'notif-badge today';
    badge.textContent = counts.today;
    badge.title = `${counts.today} revisão(ões) para hoje`;
  }
  return badge;
}


function buildFinalModeStats() {
  const notes = storage.loadErrorNotes();
  const errorTopicKeys = new Set(notes.map(note => `${note.subject || ''}|||${note.topic || ''}`.toLowerCase().trim()));
  const all = flattenAllSubtopics();

  return {
    high: all.filter(({ sub }) => normalizePriority(sub.priority) === 'Alta' && Number(sub.currentLevel) < 8).length,
    overdue: all.filter(({ sub }) => getSubStatus(sub) === 'atrasado').length,
    lowReview: all.filter(({ sub }) => Number(sub.currentLevel) < 8 && Number(sub.currentLevel) <= 2).length,
    errors: errorTopicKeys.size,
    notMastered: all.filter(({ sub }) => Number(sub.currentLevel) < 8).length,
    errorTopicKeys: Array.from(errorTopicKeys),
  };
}

function buildFinalModeBanner(finalStats, visibleCount) {
  const banner = document.createElement('div');
  banner.className = 'final-mode-banner';
  banner.innerHTML = `
    <div class="urgency-top">
      <span class="urgency-icon">🏁</span>
      <div class="urgency-text">
        <strong>Modo Reta Final</strong>
        <h3>Filtro focado para os últimos 15/30 dias</h3>
        <small>Mostrando prioridade alta, atrasados, R0/R1/R2, tópicos com erros salvos e itens ainda não dominados.</small>
      </div>
    </div>
    <div class="final-mode-grid">
      <div class="final-mode-stat"><span>Visíveis agora</span><strong>${visibleCount}</strong></div>
      <div class="final-mode-stat"><span>Prioridade alta</span><strong>${finalStats.high}</strong></div>
      <div class="final-mode-stat"><span>Atrasados</span><strong>${finalStats.overdue}</strong></div>
      <div class="final-mode-stat"><span>R0/R1/R2</span><strong>${finalStats.lowReview}</strong></div>
      <div class="final-mode-stat"><span>Tópicos com erro</span><strong>${finalStats.errors}</strong></div>
    </div>
  `;
  return banner;
}

// ─────────────────────────────────────────────────────────────
// RENDERIZAÇÃO
// ─────────────────────────────────────────────────────────────
function renderProgressOverview() {
  const area = $('subjectProgressArea');
  if (!area) return;

  const frag = document.createDocumentFragment();
  frag.appendChild(buildTodayHomeCard());
  const all = flattenAllSubtopics();
  const total = all.length;
  const reviewed = all.filter(({ sub }) => Number(sub.currentLevel) > 0).length;
  const mastered = all.filter(({ sub }) => Number(sub.currentLevel) >= 8).length;
  const generalPercent = total ? Math.round((reviewed / total) * 100) : 0;

  const generalCard = document.createElement('article');
  generalCard.className = 'subject-progress-card progress-overview-card';
  generalCard.innerHTML = `
    <strong>Progresso geral</strong>
    <div class="progress-row"><span>${reviewed}/${total} itens iniciados · ${mastered}/${total} dominados</span><span class="progress-percent">${generalPercent}%</span></div>
    <div class="progress-bar"><span style="width:${generalPercent}%"></span></div>
    <small>Use o progresso como direção, não como cobrança. O foco é consistência.</small>
  `;
  frag.appendChild(generalCard);


  appState.subjects.forEach(subject => {
    const progress = countSubjectProgress(subject);
    const card = document.createElement('article');
    card.className = 'subject-progress-card progress-overview-card';
    card.innerHTML = `
      <strong>${esc(subject.name)}</strong>
      <div class="progress-row"><span>${progress.reviewed}/${progress.total} iniciados · ${progress.mastered}/${progress.total} dominados</span><span class="progress-percent">${progress.percent}%</span></div>
      <div class="progress-bar"><span style="width:${progress.percent}%"></span></div>
      <small>Progresso por matéria</small>
    `;
    frag.appendChild(card);
  });

  appState.subjects.forEach(subject => {
    subject.topics.forEach(topic => {
      const progress = countTopicProgress(topic);
      const card = document.createElement('article');
      card.className = 'subject-progress-card';
      card.innerHTML = `
        <strong>${esc(topic.name)}</strong>
        <div class="progress-row"><span>${esc(subject.name)} · ${esc(topic.enemWeight || '–')}</span><span class="progress-percent">${progress.percent}%</span></div>
        <div class="progress-bar"><span style="width:${progress.percent}%"></span></div>
        <small>${progress.reviewed}/${progress.total} iniciados · ${progress.mastered}/${progress.total} dominados</small>
      `;
      frag.appendChild(card);
    });
  });

  const calendar = buildReviewCalendar(7);
  const calendarCard = document.createElement('article');
  calendarCard.className = 'subject-progress-card review-calendar-pro-card';
  calendarCard.id = 'reviewCalendarCard';
  calendarCard.innerHTML = `
    <div class="review-calendar-head">
      <div>
        <span class="calendar-eyebrow">Agenda de revisões</span>
        <strong>Calendário de revisões</strong>
        <small>${calendar.overdue > 0 ? `Você tem ${calendar.overdue} revisão(ões) atrasada(s).` : 'Tudo em dia nas revisões atrasadas.'}</small>
      </div>
      <div class="calendar-head-badges">
        <span class="calendar-total-pill"><i class="ph ph-clock-countdown"></i> ${calendar.totalUpcoming} nos próximos 7 dias</span>
        ${calendar.busiestKey ? `<span class="calendar-total-pill"><i class="ph ph-chart-bar"></i> Maior carga: ${calendar.rows.find(r => r.key === calendar.busiestKey)?.label || '—'}</span>` : ''}
      </div>
    </div>

    ${calendar.overdue > 0 ? `
      <details class="calendar-overdue-panel" open>
        <summary><span><i class="ph ph-warning-circle"></i> Revisões atrasadas</span><strong>${calendar.overdue}</strong></summary>
        <div class="calendar-detail-list">
          ${calendar.overdueItems.slice(0, 6).map(item => `
            <div class="calendar-detail-item">
              <span class="calendar-priority-dot ${item.priority === 'Alta' ? 'high' : item.priority === 'Média' ? 'medium' : 'low'}"></span>
              <div><strong>${esc(item.sub.name)}</strong><small>${esc(item.subject.name)} · ${esc(item.topic.name)} · R${Number(item.sub.currentLevel) || 0}</small></div>
            </div>
          `).join('')}
          ${calendar.overdueItems.length > 6 ? `<small class="calendar-more">+${calendar.overdueItems.length - 6} atrasada(s) no restante da lista</small>` : ''}
        </div>
      </details>
    ` : `
      <div class="calendar-empty-state">
        <i class="ph ph-check-circle"></i>
        <div><strong>Tudo em dia</strong><small>Nenhuma revisão atrasada agora. Continue seguindo a fila diária.</small></div>
      </div>
    `}

    <div class="calendar-week-grid">
      ${calendar.rows.map(row => `
        <details class="calendar-day-pro ${row.state} ${row.key === calendar.busiestKey && row.count > 0 ? 'busiest' : ''}" ${row.state === 'today' || row.count > 0 ? 'open' : ''}>
          <summary>
            <div>
              <span>${esc(row.label)}</span>
              <small>${esc(row.shortDate)}</small>
            </div>
            <strong>${row.count}</strong>
          </summary>
          <div class="calendar-day-body">
            <div class="calendar-volume-bar" aria-label="Volume de revisões">
              <span class="high" style="width:${row.count ? Math.round((row.high / row.count) * 100) : 0}%"></span>
              <span class="medium" style="width:${row.count ? Math.round((row.medium / row.count) * 100) : 0}%"></span>
              <span class="low" style="width:${row.count ? Math.round((row.low / row.count) * 100) : 0}%"></span>
            </div>
            <div class="calendar-mini-badges">
              <span>Alta: ${row.high}</span>
              <span>Média: ${row.medium}</span>
              <span>Baixa: ${row.low}</span>
            </div>
            <div class="calendar-detail-list compact">
              ${row.items.slice(0, 4).map(item => `
                <div class="calendar-detail-item">
                  <span class="calendar-priority-dot ${item.priority === 'Alta' ? 'high' : item.priority === 'Média' ? 'medium' : 'low'}"></span>
                  <div><strong>${esc(item.sub.name)}</strong><small>${esc(item.topic.name)} · R${Number(item.sub.currentLevel) || 0}</small></div>
                </div>
              `).join('') || '<small class="calendar-no-items">Sem revisões neste dia.</small>'}
              ${row.items.length > 4 ? `<small class="calendar-more">+${row.items.length - 4} revisão(ões)</small>` : ''}
            </div>
          </div>
        </details>
      `).join('')}
    </div>
  `;
  frag.appendChild(calendarCard);

  area.replaceChildren(frag);
}

function renderDashboard() {
  const container = $('cardsContainer');
  if (!container) return;

  const { stats, topicPending, prioPending } = buildUrgencyStats();
  let dailyPlan = null;
  const dashboardFilters = { ...appState.filters };

  if (appState.currentView === 'studyToday') {
    dailyPlan = resolveDailyReviewPlan();
    dashboardFilters.studyTodayIds = dailyPlan.remainingIds;
  }

  let finalStats = null;
  if (appState.currentView === 'finalMode') {
    finalStats = buildFinalModeStats();
    dashboardFilters.errorTopicKeys = finalStats.errorTopicKeys;
    dashboardFilters.highOnly = false;
  }

  const groups = filterSubjects(appState.subjects, dashboardFilters, appState.currentView);

  const frag = document.createDocumentFragment();
  let totalMatches = groups.reduce((acc, group) => acc + group.topics.reduce((sum, topicGroup) => sum + topicGroup.subtopics.length, 0), 0);

  if (dailyPlan) frag.appendChild(buildDailyLimitBanner(dailyPlan));
  if (finalStats) frag.appendChild(buildFinalModeBanner(finalStats, totalMatches));
  frag.appendChild(buildUrgencyBanner(stats));

  const PRIORITIES = [
    { key: 'Alta', label: '🔥 Prioridade Máxima', cls: 'priority-alta' },
    { key: 'Média', label: '⚡ Estude Depois', cls: 'priority-media' },
    { key: 'Baixa', label: '✅ Superficial', cls: 'priority-baixa' },
    { key: 'Muito Baixa', label: '❌ Se Sobrar Tempo', cls: 'priority-muito-baixa' },
  ];

  groups.forEach(group => {
    group.topics.forEach(topicGroup => {
      const tKey = topicKey(group.subject.name, topicGroup.topic.name);
      const startsOpen = openTopicKeys.has(tKey);

      const topicBlock = document.createElement('div');
      topicBlock.className = 'topic-block';

      const topicHeader = document.createElement('div');
      topicHeader.className = `topic-header${startsOpen ? ' open' : ''}`;
      topicHeader.setAttribute('role', 'button');
      topicHeader.setAttribute('tabindex', '0');
      topicHeader.setAttribute('aria-expanded', String(startsOpen));

      const progress = countTopicProgress(topicGroup.topic);

      const topicTitleDiv = document.createElement('div');
      topicTitleDiv.className = 'topic-title';
      topicTitleDiv.innerHTML = `
        <strong>${esc(topicGroup.topic.name)}</strong>
        <small>Incidência ENEM ${esc(topicGroup.topic.enemWeight || '–')} &middot; ${topicGroup.subtopics.length} subassunto(s) · ${progress.percent}% iniciado</small>
      `;

      const topicControls = document.createElement('div');
      topicControls.className = 'topic-controls';
      topicControls.style.cssText = 'display:flex;align-items:center;gap:0.5rem;';

      const tCounts = topicPending.get(tKey);
      const tBadge = buildNotifBadge(tCounts);
      if (tBadge) topicControls.appendChild(tBadge);

      topicControls.insertAdjacentHTML('beforeend', `
        <span class="topic-weight">${esc(topicGroup.topic.enemWeight || '–')}</span>
        <i class="ph ph-caret-down topic-chevron"></i>
      `);

      topicHeader.appendChild(topicTitleDiv);
      topicHeader.appendChild(topicControls);

      const topicBody = document.createElement('div');
      topicBody.className = `topic-body${startsOpen ? ' open' : ''}`;

      function toggleTopic() {
        const isOpen = topicBody.classList.toggle('open');
        topicHeader.classList.toggle('open', isOpen);
        topicHeader.setAttribute('aria-expanded', String(isOpen));

        if (isOpen) openTopicKeys.add(tKey);
        else openTopicKeys.delete(tKey);
        persistOpenTopics();
      }

      topicHeader.addEventListener('click', toggleTopic);
      topicHeader.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTopic();
        }
      });

      PRIORITIES.forEach(({ key, label, cls }) => {
        const items = topicGroup.subtopics.filter(s => normalizePriority(s.priority) === key);

        const section = document.createElement('div');
        section.className = `priority-section ${cls}`;

        const prioHeader = document.createElement('div');
        prioHeader.className = 'priority-header';
        prioHeader.setAttribute('role', 'button');
        prioHeader.setAttribute('tabindex', '0');
        prioHeader.setAttribute('aria-expanded', 'false');

        const prioLeft = document.createElement('h4');
        prioLeft.textContent = label;

        const prioRight = document.createElement('div');
        prioRight.style.cssText = 'display:flex;align-items:center;gap:0.5rem;';

        const pKey = `${tKey}|||${key}`;
        const pCounts = prioPending.get(pKey);
        const pBadge = buildNotifBadge(pCounts);
        if (pBadge) prioRight.appendChild(pBadge);

        const countSpan = document.createElement('span');
        countSpan.style.cssText = 'color:var(--text-muted);font-size:0.82rem;';
        countSpan.textContent = `${items.length} item(ns)`;
        prioRight.appendChild(countSpan);
        prioRight.insertAdjacentHTML('beforeend', `<i class="ph ph-caret-down priority-chevron"></i>`);

        prioHeader.appendChild(prioLeft);
        prioHeader.appendChild(prioRight);

        const cardsGrid = document.createElement('div');
        cardsGrid.className = 'cards-grid';

        if (items.length === 0) {
          const empty = document.createElement('p');
          empty.className = 'no-results-message';
          empty.textContent = 'Nenhum conteúdo nesta prioridade.';
          cardsGrid.appendChild(empty);
        } else {
          items.forEach(sub => {
            const card = createCardElement(sub, group.subject, topicGroup.topic, {
              markReviewed,
              undoReview,
              openErrorNote: openErrorNotebookModal,
              openEdit: openEditModal,
              deleteSub: deleteSubtopic,
            });
            cardsGrid.appendChild(card);
          });
        }

        function togglePriority() {
          const isOpen = cardsGrid.classList.toggle('open');
          prioHeader.classList.toggle('open', isOpen);
          prioHeader.setAttribute('aria-expanded', String(isOpen));
        }

        prioHeader.addEventListener('click', togglePriority);
        prioHeader.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePriority();
          }
        });

        section.appendChild(prioHeader);
        section.appendChild(cardsGrid);
        topicBody.appendChild(section);
      });

      topicBlock.appendChild(topicHeader);
      topicBlock.appendChild(topicBody);
      frag.appendChild(topicBlock);
    });
  });

  if (totalMatches === 0) {
    const msg = document.createElement('div');
    msg.className = 'no-results-message';
    msg.innerHTML = `Nenhum subassunto encontrado para os filtros aplicados.<br><button class="btn btn-soft" id="btnClearFiltersInline" type="button">Limpar filtros</button>`;
    frag.appendChild(msg);
  }

  container.replaceChildren(frag);
  $('btnClearFiltersInline')?.addEventListener('click', () => {
    resetAllFilters();
    renderFilters();
    renderSidebar();
    renderDashboard();
    saveApp();
  });

  updateDashboardSubtitle(stats, totalMatches);
  renderProgressOverview();
  updateSideSummary(stats);
}

function updateDashboardSubtitle(stats, totalMatches) {
  const titleEl = $('cardsTitle');
  const subtitleEl = $('cardsSubtitle');
  const viewLabel = $('currentViewLabel');

  if (titleEl) titleEl.textContent = getViewLabel();
  if (viewLabel) viewLabel.textContent = getViewLabel();
  if (!subtitleEl) return;

  subtitleEl.textContent = '';

  if (appState.currentView === 'studyToday') {
    const plan = resolveDailyReviewPlan();
    if (plan.remainingItems.length > 0) {
      subtitleEl.textContent = `Mostrando ${totalMatches} de até ${plan.limit} revisão(ões) do dia. Fora da fila: ${plan.backlogCount}.`;
    } else {
      subtitleEl.textContent = plan.selectedCount > 0
        ? `Você concluiu a meta diária. A fila extra fica guardada para depois.`
        : `Sem revisões obrigatórias para hoje.`;
    }
    return;
  }

  if (stats.overdue > 0) {
    const alert = document.createElement('span');
    alert.className = 'dashboard-subtitle-alert';
    alert.textContent = `🚨 Você tem ${stats.overdue} revisão(ões) atrasada(s) — faça agora!`;
    subtitleEl.appendChild(alert);

    if (stats.today > 0) {
      subtitleEl.append('  ·  ');
      const todaySpan = document.createElement('span');
      todaySpan.className = 'dashboard-subtitle-today';
      todaySpan.textContent = `⏰ ${stats.today} para hoje`;
      subtitleEl.appendChild(todaySpan);
    }
  } else if (stats.today > 0) {
    const todaySpan = document.createElement('span');
    todaySpan.className = 'dashboard-subtitle-today';
    todaySpan.textContent = `⏰ ${stats.today} revisão(ões) para hoje — bora!`;
    subtitleEl.appendChild(todaySpan);
  } else {
    subtitleEl.textContent = `Mostrando ${totalMatches} subassunto(s). Tudo em dia! ✅`;
  }
}

function renderFilters() {
  const subjectFilter = $('subjectFilter');
  if (subjectFilter) {
    subjectFilter.innerHTML = '<option value="all">Todas as matérias</option>';
    appState.subjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name;
      subjectFilter.appendChild(opt);
    });
    subjectFilter.value = appState.filters.subject || 'all';
  }

  const priorityFilter = $('priorityFilter');
  if (priorityFilter) priorityFilter.value = appState.filters.priority || 'all';

  const statusFilter = $('statusFilter');
  if (statusFilter) statusFilter.value = appState.filters.status || 'all';

  const reviewFilter = $('reviewFilter');
  if (reviewFilter) {
    reviewFilter.innerHTML = '<option value="all">Todas as revisões</option>';
    for (let i = 0; i <= 8; i++) {
      const opt = document.createElement('option');
      opt.value = `R${i}`;
      opt.textContent = `Revisão R${i}`;
      reviewFilter.appendChild(opt);
    }
    reviewFilter.value = appState.filters.review || 'all';
  }

  const searchInput = $('searchInput');
  if (searchInput) searchInput.value = appState.filters.search || '';

  const highToggle = $('highPriorityToggle');
  if (highToggle) highToggle.classList.toggle('active', !!appState.filters.highOnly);

  const dailyLimitSelect = $('dailyLimitSelect');
  if (dailyLimitSelect) dailyLimitSelect.value = String(getDailyReviewLimit());
}

function renderSidebar() {
  const list = $('subjectList');
  if (!list) return;

  list.innerHTML = '';

  appState.subjects.forEach(subject => {
    const progress = countSubjectProgress(subject);
    const btn = document.createElement('button');
    btn.className = 'subject-chip';

    if (appState.filters.subject === subject.name) btn.classList.add('active');

    btn.innerHTML = `
      <span class="subject-pill" style="background:${esc(subject.color)}"></span>
      <div>
        <span>${esc(subject.name)}</span>
        <small>${progress.reviewed}/${progress.total} iniciados · ${progress.mastered}/${progress.total} dominados</small>
        <div class="subject-progress-mini"><span style="width:${progress.percent}%"></span></div>
      </div>
    `;

    btn.addEventListener('click', () => {
      appState.filters.subject = subject.name;
      appState.currentView = 'all';
      const sf = $('subjectFilter');
      if (sf) sf.value = subject.name;
      renderDashboard();
      renderSidebar();
      saveApp();
    });

    list.appendChild(btn);
  });
}

function updateSideSummary(stats) {
  const total = appState.subjects.reduce(
    (acc, s) => acc + s.topics.reduce((a, t) => a + t.subtopics.length, 0),
    0
  );

  const s = stats || buildUrgencyStats().stats;
  setEl('summaryTotal', total);
  setEl('summaryToday', s.today + s.overdue);
  setEl('summaryMastered', s.mastered);
  setEl('summaryBacklog', getBacklogSummaryCount());
  setEl('summaryErrors', storage.loadErrorNotes().length);
  setEl('statActive', total);
  setEl('statToday', s.today);
  setEl('statOverdue', s.overdue);
  setEl('statReviews', appState.stats.totalReviews || 0);
}

// ─────────────────────────────────────────────────────────────
// AÇÕES DE REVISÃO
// ─────────────────────────────────────────────────────────────
function canReviewNow(sub) {
  if (!sub || !sub.nextReviewDate) return true;

  const status = getSubStatus(sub);
  return status === 'atrasado' || status === 'revisão hoje';
}

function markReviewed(sub, subject, topic, cardEl = null) {
  if (!sub) return;

  const prevLevel = Number(sub.currentLevel || 0);

  if (prevLevel > 0 && sub.nextReviewDate && !canReviewNow(sub)) {
    showToast('Ainda não chegou o dia agendado para esta revisão.');
    return;
  }

  try {
    storage.pushSubSnapshot(subject.name, topic.name, sub.name, {
      currentLevel: sub.currentLevel,
      lastReviewed: sub.lastReviewed,
      nextReviewDate: sub.nextReviewDate,
      updatedAt: sub.updatedAt,
    });
  } catch (_) {}

  const newLevel = Math.min(prevLevel + 1, 8);
  const now = new Date();

  sub.currentLevel = newLevel;
  sub.status = newLevel >= 8 ? 'dominado' : 'em revisão';
  sub.lastReviewed = now.toISOString();
  sub.nextReviewDate = newLevel >= 8 ? null : addDays(now, computeNextIntervalForLevel(newLevel)).toISOString();
  sub.updatedAt = Date.now();

  appState.stats.totalReviews = (appState.stats.totalReviews || 0) + 1;

  storage.setSubProgress(subject.name, topic.name, sub.name, {
    currentLevel: sub.currentLevel,
    lastReviewed: sub.lastReviewed,
    nextReviewDate: sub.nextReviewDate,
    updatedAt: sub.updatedAt,
    errorCount: Number(sub.errorCount || 0),
    lastErrorAt: sub.lastErrorAt || null,
  });

  saveApp();
  cardEl?.classList.add('saved-flash');

  const msg = newLevel >= 8
    ? `${sub.name} chegou ao R8 e foi marcado como dominado.`
    : `${sub.name} foi para R${newLevel}. Próxima revisão: ${fmtDate(sub.nextReviewDate)}.`;
  showToast(msg);

  renderDashboard();
  renderSidebar();
  refreshFocusIfOpen();
}

function undoReview(sub, subject, topic) {
  if (!sub) return;

  const snap = storage.popSubSnapshot(subject.name, topic.name, sub.name);

  if (!snap) {
    showToast('Nada a desfazer para esse item.');
    return;
  }

  sub.currentLevel = Number(snap.currentLevel) || 0;
  sub.lastReviewed = snap.lastReviewed || null;
  sub.nextReviewDate = snap.nextReviewDate || null;
  sub.updatedAt = snap.updatedAt || Date.now();
  sub.status = getSubStatus(sub);

  appState.stats.totalReviews = Math.max(0, (appState.stats.totalReviews || 0) - 1);

  storage.setSubProgress(subject.name, topic.name, sub.name, {
    currentLevel: sub.currentLevel,
    lastReviewed: sub.lastReviewed,
    nextReviewDate: sub.nextReviewDate,
    updatedAt: sub.updatedAt,
    errorCount: Number(sub.errorCount || 0),
    lastErrorAt: sub.lastErrorAt || null,
  });

  saveApp();
  showToast(`${sub.name} voltou para R${Number(sub.currentLevel) || 0}.`);
  renderDashboard();
  renderSidebar();
  refreshFocusIfOpen();
}

function deleteSubtopic(sub, subject, topic) {
  if (!confirm('Deseja mesmo excluir este subassunto?')) return;

  topic.subtopics = topic.subtopics.filter(s => s.id !== sub.id);
  storage.deleteSubProgress(subject.name, topic.name, sub.name);
  storage.clearSubHistory(subject.name, topic.name, sub.name);

  subject.topics = subject.topics.filter(t => t.subtopics.length > 0);
  appState.subjects = appState.subjects.filter(s => s.topics.length > 0);

  saveApp();
  renderFilters();
  renderSidebar();
  renderDashboard();
  showToast('Subassunto excluído.');
}

// ─────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────
function openNewModal() {
  const modal = $('itemModal');
  if (modal) {
    modal.hidden = false;
    modal.classList.remove('hidden');
    modal.classList.add('active');
  }

  setEl('modalHeading', 'Adicionar novo subassunto');
  editing = null;

  ['modalSubject', 'modalTopic', 'modalSubtopic', 'modalTags'].forEach(id => {
    const el = $(id);
    if (el) el.value = '';
  });

  const mp = $('modalPriority');
  if (mp) mp.value = 'Alta';
}

function openEditModal(sub, subject, topic) {
  editing = { subject, topic, sub };

  const modal = $('itemModal');
  if (modal) {
    modal.hidden = false;
    modal.classList.remove('hidden');
    modal.classList.add('active');
  }

  setEl('modalHeading', 'Editar subassunto');

  const ms = $('modalSubject');
  const mt = $('modalTopic');
  const msub = $('modalSubtopic');
  const mprio = $('modalPriority');
  const mtags = $('modalTags');

  if (ms) ms.value = subject.name;
  if (mt) mt.value = topic.name + (topic.enemWeight && topic.enemWeight !== '–' ? ` (${topic.enemWeight})` : '');
  if (msub) msub.value = sub.name;
  if (mprio) mprio.value = normalizePriority(sub.priority);
  if (mtags) mtags.value = (sub.tags || []).join(', ');
}

function closeModal() {
  const modal = $('itemModal');
  if (modal) {
    modal.hidden = true;
    modal.classList.add('hidden');
    modal.classList.remove('active');
  }
  editing = null;
}

function saveSubtopicFromModal() {
  const subjectName = ($('modalSubject')?.value ?? '').trim();
  const topicNameRaw = ($('modalTopic')?.value ?? '').trim();
  const subName = ($('modalSubtopic')?.value ?? '').trim();
  const priority = normalizePriority($('modalPriority')?.value || 'Média');
  const tagsRaw = ($('modalTags')?.value ?? '').trim();

  if (!subjectName || !topicNameRaw || !subName) {
    showToast('Preencha matéria, tópico e subassunto.');
    return;
  }

  const topicName = topicNameRaw.replace(/\s*\(.*\)$/, '').trim();
  const wm = topicNameRaw.match(/\(([^)]+)\)/);
  const enemWeight = wm ? wm[1] : '–';

  const tags = tagsRaw
    ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    : [getPriorityTagLabel(priority)];
  const sanitized = sanitizeTags(tags, priority);

  let subject = appState.subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase());
  if (!subject) {
    subject = { id: uuid(), name: subjectName, color: '#7c3aed', topics: [] };
    appState.subjects.push(subject);
  }

  let topic = subject.topics.find(t => t.name.toLowerCase() === topicName.toLowerCase());
  if (!topic) {
    topic = { id: uuid(), name: topicName, enemWeight: enemWeight || '–', subtopics: [] };
    subject.topics.push(topic);
  }

  if (editing && editing.sub) {
    const oldSubject = editing.subject;
    const oldTopic = editing.topic;
    const oldSub = editing.sub;
    const oldSubName = oldSub.name;

    oldTopic.subtopics = oldTopic.subtopics.filter(s => s.id !== oldSub.id);

    oldSub.name = subName;
    oldSub.priority = priority;
    oldSub.tags = sanitized;
    oldSub.updatedAt = Date.now();
    oldSub.status = getSubStatus(oldSub);

    topic.subtopics.push(oldSub);

    storage.deleteSubProgress(oldSubject.name, oldTopic.name, oldSubName);
    storage.clearSubHistory(oldSubject.name, oldTopic.name, oldSubName);
    storage.setSubProgress(subject.name, topic.name, oldSub.name, {
      currentLevel: oldSub.currentLevel,
      lastReviewed: oldSub.lastReviewed,
      nextReviewDate: oldSub.nextReviewDate,
      updatedAt: oldSub.updatedAt,
      errorCount: Number(oldSub.errorCount || 0),
      lastErrorAt: oldSub.lastErrorAt || null,
    });

    oldSubject.topics = oldSubject.topics.filter(t => t.subtopics.length > 0);
    appState.subjects = appState.subjects.filter(s => s.topics.length > 0);
    showToast('Subassunto atualizado.');
  } else {
    const newSub = {
      id: uuid(),
      name: subName,
      priority,
      currentLevel: 0,
      status: 'não iniciado',
      nextReviewDate: null,
      lastReviewed: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notes: '',
      tags: sanitized,
    };

    topic.subtopics.push(newSub);
    storage.setSubProgress(subject.name, topic.name, newSub.name, {
      currentLevel: newSub.currentLevel,
      lastReviewed: newSub.lastReviewed,
      nextReviewDate: newSub.nextReviewDate,
      updatedAt: newSub.updatedAt,
      errorCount: Number(newSub.errorCount || 0),
      lastErrorAt: newSub.lastErrorAt || null,
    });
    showToast('Novo subassunto adicionado.');
  }

  normalizeSubjects(appState.subjects);
  saveApp();
  renderFilters();
  renderSidebar();
  renderDashboard();
  closeModal();
}


// ─────────────────────────────────────────────────────────────
// CADERNO DE ERROS
// ─────────────────────────────────────────────────────────────
function clearErrorNotebookForm() {
  ['errorSubject', 'errorTopic', 'errorMistake', 'errorCorrection', 'errorTags'].forEach(id => {
    const el = $(id);
    if (el) el.value = '';
  });
}

function openErrorNotebookModal(prefill = {}) {
  const modal = $('errorNotebookModal');
  if (!modal) return;

  modal.hidden = false;
  modal.classList.remove('hidden');
  modal.classList.add('active');

  if (prefill.sub?.id) modal.dataset.subId = prefill.sub.id;
  else delete modal.dataset.subId;

  if (prefill.subject || prefill.topic || prefill.sub) {
    const subjectEl = $('errorSubject');
    const topicEl = $('errorTopic');
    const mistakeEl = $('errorMistake');

    if (subjectEl) subjectEl.value = prefill.subject?.name || prefill.subject || '';
    if (topicEl) topicEl.value = prefill.topic?.name || prefill.topic || '';
    if (mistakeEl && prefill.sub?.name) {
      mistakeEl.value = `Erro em: ${prefill.sub.name}
`;
      mistakeEl.focus();
    }
  }

  renderErrorNotebookList();
}

function closeErrorNotebookModal() {
  const modal = $('errorNotebookModal');
  if (!modal) return;

  modal.hidden = true;
  modal.classList.add('hidden');
  modal.classList.remove('active');
}


function findStudyItemBySubId(subId) {
  if (!subId) return null;
  return flattenAllSubtopics().find(({ sub }) => sub.id === subId) || null;
}

function findBestMatchForErrorNote(subjectName, topicName, text = '') {
  const subjectNeedle = String(subjectName || '').toLowerCase().trim();
  const topicNeedle = String(topicName || '').toLowerCase().trim();
  const fullText = String(text || '').toLowerCase();

  let candidates = flattenAllSubtopics();
  if (subjectNeedle && subjectNeedle !== 'geral') {
    candidates = candidates.filter(({ subject }) => subject.name.toLowerCase().includes(subjectNeedle) || subjectNeedle.includes(subject.name.toLowerCase()));
  }
  if (topicNeedle && topicNeedle !== 'sem tópico') {
    candidates = candidates.filter(({ topic }) => topic.name.toLowerCase().includes(topicNeedle) || topicNeedle.includes(topic.name.toLowerCase()));
  }

  const exact = candidates.find(({ sub }) => fullText.includes(String(sub.name || '').toLowerCase()));
  return exact || candidates[0] || null;
}

function registerErrorBoostForStudyItem(item) {
  if (!item || !item.sub) return null;
  item.sub.errorCount = Number(item.sub.errorCount || 0) + 1;
  item.sub.lastErrorAt = new Date().toISOString();
  item.sub.updatedAt = Date.now();
  storage.setSubProgress(item.subject.name, item.topic.name, item.sub.name, {
    currentLevel: item.sub.currentLevel,
    lastReviewed: item.sub.lastReviewed,
    nextReviewDate: item.sub.nextReviewDate,
    updatedAt: item.sub.updatedAt,
    errorCount: item.sub.errorCount,
    lastErrorAt: item.sub.lastErrorAt,
  });
  return item.sub.errorCount;
}

function saveErrorNoteFromModal() {
  const subject = ($('errorSubject')?.value || '').trim();
  const topic = ($('errorTopic')?.value || '').trim();
  const mistake = ($('errorMistake')?.value || '').trim();
  const correction = ($('errorCorrection')?.value || '').trim();
  const tagsRaw = ($('errorTags')?.value || '').trim();

  if (!mistake || !correction) {
    showToast('Preencha o erro e a correção antes de salvar.');
    return;
  }

  const modal = $('errorNotebookModal');
  const linkedItem = findStudyItemBySubId(modal?.dataset?.subId)
    || findBestMatchForErrorNote(subject, topic, `${mistake} ${correction}`);
  const errorCount = linkedItem ? registerErrorBoostForStudyItem(linkedItem) : null;

  storage.addErrorNote({
    id: uuid(),
    subject: subject || linkedItem?.subject?.name || 'Geral',
    topic: topic || linkedItem?.topic?.name || 'Sem tópico',
    subId: linkedItem?.sub?.id || null,
    subtopic: linkedItem?.sub?.name || null,
    mistake,
    correction,
    tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  clearErrorNotebookForm();
  if (modal) delete modal.dataset.subId;
  renderErrorNotebookList();
  updateSideSummary();
  renderDashboard();
  saveApp();
  showToast(errorCount ? `Erro salvo. Esse assunto já tem ${errorCount} erro(s) registrado(s) e subiu na fila.` : 'Erro salvo no caderno.');
}

function renderErrorNotebookList() {
  const list = $('errorNotesList');
  const count = $('errorNotesCount');
  if (!list) return;

  const notes = storage.loadErrorNotes();
  if (count) count.textContent = `${notes.length} item(ns)`;

  if (!notes.length) {
    list.innerHTML = '<div class="error-note-empty">Nenhum erro salvo ainda. Quando errar uma questão, registre aqui a causa e a correção.</div>';
    return;
  }

  list.innerHTML = notes.map(note => `
    <article class="error-note-card" data-note-id="${esc(note.id)}">
      <div class="error-note-top">
        <div class="error-note-title">
          <strong>${esc(note.subject || 'Geral')} · ${esc(note.topic || 'Sem tópico')}</strong>
          <small>Salvo em ${fmtDateTime(note.createdAt)}${note.subtopic ? ` · ${esc(note.subtopic)}` : ''}</small>
        </div>
        <button class="btn btn-danger btn-delete-error" type="button" data-note-id="${esc(note.id)}">Excluir</button>
      </div>
      <div class="error-note-body">
        <div class="error-note-box"><span>Erro</span><p>${esc(note.mistake || '')}</p></div>
        <div class="error-note-box"><span>Correção</span><p>${esc(note.correction || '')}</p></div>
      </div>
      ${Array.isArray(note.tags) && note.tags.length ? `<div class="error-note-tags">${note.tags.map(tag => `<span class="card-tag">${esc(tag)}</span>`).join('')}</div>` : ''}
    </article>
  `).join('');
}

// ─────────────────────────────────────────────────────────────
// BACKUP / IMPORTAÇÃO
// ─────────────────────────────────────────────────────────────
function readApexLocalJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function writeApexLocalJson(key, value) {
  try {
    if (value === null || typeof value === 'undefined') localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

function clearPlanningLocalData() {
  [
    'apex_enem_v3_state_schedule_settings',
    'apex_enem_v3_state_schedule_week_plan',
    'apex_enem_v3_state_schedule_history',
    'apex_enem_v3_state_weekly_plan',
    'apex_enem_v3_state_daily_new_subject',
    'apex_enem_schedule_disabled',
  ].forEach(key => {
    try { localStorage.removeItem(key); } catch (_) {}
  });
}

function buildBackupObject() {
  return {
    version: '4.1',
    app: 'ApexENEM',
    exportedAt: new Date().toISOString(),
    subjects: appState.subjects,
    filters: appState.filters,
    currentView: appState.currentView,
    stats: appState.stats,
    settings: appState.settings,
    openTopics: Array.from(openTopicKeys),
    dailyReviewQueue: storage.loadDailyReviewQueue(),
    errorNotes: storage.loadErrorNotes(),
    simulations: storage.loadSimulations?.() || [],
  };
}


function downloadJsonFile(obj, fileName) {
  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadTextFile(text, fileName) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function startOfLastSevenDays() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 6);
  return d;
}

function buildReportData() {
  const start = startOfLastSevenDays();
  const now = new Date();
  const all = flattenAllSubtopics();
  const stats = buildUrgencyStats().stats;
  const errorNotes = storage.loadErrorNotes();
  const simulations = storage.loadSimulations?.() || [];

  const reviewedThisWeek = all.filter(({ sub }) => {
    if (!sub.lastReviewed) return false;
    const d = new Date(sub.lastReviewed);
    return d >= start && d <= now;
  });

  const errorsThisWeek = errorNotes.filter(note => {
    if (!note.createdAt) return false;
    const d = new Date(note.createdAt);
    return d >= start && d <= now;
  });

  const simulationsThisWeek = simulations.filter(sim => {
    const d = new Date(sim.createdAt || sim.date);
    return !Number.isNaN(d.getTime()) && d >= start && d <= now;
  });

  const mastered = all.filter(({ sub }) => Number(sub.currentLevel) >= 8);
  const highPending = all.filter(({ sub }) => normalizePriority(sub.priority) === 'Alta' && Number(sub.currentLevel) < 8);
  const subjects = appState.subjects.map(subject => ({ name: subject.name, ...countSubjectProgress(subject) }));
  const topics = appState.subjects.flatMap(subject => subject.topics.map(topic => ({
    subject: subject.name,
    name: topic.name,
    weight: topic.enemWeight || '–',
    ...countTopicProgress(topic),
  })));

  return {
    generatedAt: new Date().toISOString(),
    period: {
      from: start.toISOString(),
      to: now.toISOString(),
      label: `${fmtDate(start.toISOString())} até ${fmtDate(now.toISOString())}`,
    },
    totals: {
      totalItems: all.length,
      reviewedThisWeek: reviewedThisWeek.length,
      errorsThisWeek: errorsThisWeek.length,
      errorsTotal: errorNotes.length,
      simulationsThisWeek: simulationsThisWeek.length,
      simulationsTotal: simulations.length,
      masteredTotal: mastered.length,
      overdue: stats.overdue,
      today: stats.today,
      backlog: getBacklogSummaryCount(),
      highPending: highPending.length,
    },
    subjects,
    topics,
    highPendingItems: highPending.slice(0, 20).map(({ subject, topic, sub }) => ({
      subject: subject.name,
      topic: topic.name,
      name: sub.name,
      level: Number(sub.currentLevel) || 0,
      status: getSubStatus(sub),
    })),
  };
}

function buildReportText(data = buildReportData()) {
  const lines = [];
  lines.push('ApexENEM — Relatório de progresso');
  lines.push(`Período: ${data.period.label}`);
  lines.push('');
  lines.push('Esta semana:');
  lines.push(`- Revisões feitas: ${data.totals.reviewedThisWeek}`);
  lines.push(`- Erros registrados: ${data.totals.errorsThisWeek}`);
  lines.push(`- Simulados registrados: ${data.totals.simulationsThisWeek}`);
  lines.push(`- Tópicos dominados: ${data.totals.masteredTotal}`);
  lines.push(`- Revisões atrasadas: ${data.totals.overdue}`);
  lines.push(`- Fora da fila diária: ${data.totals.backlog}`);
  lines.push(`- Prioridade alta pendente: ${data.totals.highPending}`);
  lines.push('');
  lines.push('Progresso por matéria:');
  data.subjects.forEach(s => lines.push(`- ${s.name}: ${s.percent}% (${s.reviewed}/${s.total} iniciados, ${s.mastered}/${s.total} dominados)`));
  lines.push('');
  lines.push('Itens de prioridade alta pendentes:');
  if (!data.highPendingItems.length) lines.push('- Nenhum.');
  data.highPendingItems.forEach(item => lines.push(`- ${item.subject} > ${item.topic} > ${item.name} · R${item.level} · ${item.status}`));
  return lines.join('\n');
}

function renderReportContent(data) {
  const el = $('reportContent');
  if (!el) return;

  el.innerHTML = `
    <div class="report-grid">
      <div class="report-stat"><span>Revisões na semana</span><strong>${data.totals.reviewedThisWeek}</strong></div>
      <div class="report-stat"><span>Erros na semana</span><strong>${data.totals.errorsThisWeek}</strong></div>
      <div class="report-stat"><span>Simulados</span><strong>${data.totals.simulationsThisWeek}</strong></div>
      <div class="report-stat"><span>Dominados</span><strong>${data.totals.masteredTotal}</strong></div>
      <div class="report-stat"><span>Fora da fila</span><strong>${data.totals.backlog}</strong></div>
      <div class="report-stat"><span>Atrasadas</span><strong>${data.totals.overdue}</strong></div>
      <div class="report-stat"><span>Alta pendente</span><strong>${data.totals.highPending}</strong></div>
    </div>
    <section class="report-section">
      <h4>Progresso por matéria</h4>
      <div class="report-list">
        ${data.subjects.map(s => `<div><span>${esc(s.name)}</span><strong>${s.percent}%</strong></div>`).join('')}
      </div>
    </section>
    <section class="report-section">
      <h4>Prioridade alta pendente</h4>
      <div class="report-list">
        ${data.highPendingItems.length ? data.highPendingItems.map(item => `<div><span>${esc(item.topic)} · ${esc(item.name)}</span><strong>R${item.level}</strong></div>`).join('') : '<small>Nenhum item pendente de prioridade alta.</small>'}
      </div>
    </section>
  `;
}

function openReportModal() {
  const modal = $('reportModal');
  if (!modal) return;
  const data = buildReportData();
  openReportModal._lastData = data;
  renderReportContent(data);
  modal.hidden = false;
  modal.classList.remove('hidden');
  modal.classList.add('active');
}

function closeReportModal() {
  const modal = $('reportModal');
  if (!modal) return;
  modal.hidden = true;
  modal.classList.add('hidden');
  modal.classList.remove('active');
}

function openManualModal() {
  const modal = $('manualModal');
  if (!modal) return;
  modal.hidden = false;
  modal.classList.remove('hidden');
  modal.classList.add('active');
}

function closeManualModal() {
  const modal = $('manualModal');
  if (!modal) return;
  modal.hidden = true;
  modal.classList.add('hidden');
  modal.classList.remove('active');
}

async function safeClearWithBackup() {
  const ok = confirm('Antes de limpar, o ApexENEM vai baixar um backup do seu progresso. Deseja continuar?');
  if (!ok) return;

  const fileName = `ApexENEM_Backup_Antes_De_Limpar_${new Date().toISOString().slice(0, 10)}.json`;
  downloadJsonFile(buildBackupObject(), fileName);

  const okClear = confirm('Backup solicitado. Confirme somente depois que o download aparecer no navegador. Limpar os dados agora?');
  if (!okClear) return;

  storage.clearAll();
  clearPlanningLocalData();
  appState.subjects = buildSeedHierarchy();
  appState.filters = { subject: 'all', priority: 'all', review: 'all', status: 'all', search: '', highOnly: false };
  appState.currentView = 'all';
  appState.stats = { totalReviews: 0 };
  appState.settings = { dailyLimit: DEFAULT_DAILY_REVIEW_LIMIT, tiredModeDate: null };
  openTopicKeys = new Set();

  normalizeSubjects(appState.subjects);
  syncProgressStorageFromSubjects();
  saveApp();
  renderFilters();
  renderSidebar();
  renderDashboard();
  refreshTiredModeButton();
  showToast('Cache limpo com segurança e base inicial restaurada.');
}

async function exportBackup() {
  const backup = buildBackupObject();
  const json = JSON.stringify(backup, null, 2);
  const fileName = `ApexENEM_Progresso_${new Date().toISOString().slice(0, 10)}.json`;

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'Progresso ApexENEM',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      showToast('Progresso salvo no seu PC.');
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }

  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Progresso baixado. Veja sua pasta Downloads.');
}


function countImportedItems(parsed) {
  const subjects = Array.isArray(parsed.subjects) ? parsed.subjects : [];
  return subjects.reduce((acc, subject) => acc + (subject.topics || []).reduce((a, topic) => a + (topic.subtopics || []).length, 0), 0);
}

function buildBackupPreviewText(parsed) {
  const exportedAt = parsed.exportedAt ? fmtDateTime(parsed.exportedAt) : 'data não informada';
  const totalItems = countImportedItems(parsed);
  const reviewCount = Number(parsed.stats?.totalReviews || 0);
  const errors = Array.isArray(parsed.errorNotes) ? parsed.errorNotes.length : 0;
  const simulations = Array.isArray(parsed.simulations) ? parsed.simulations.length : 0;
  const version = parsed.version || 'sem versão';
  return [
    'Você vai substituir o progresso atual por este backup:',
    '',
    `Versão do backup: ${version}`,
    `Criado em: ${exportedAt}`,
    `Itens salvos: ${totalItems}`,
    `Revisões feitas: ${reviewCount}`,
    `Erros salvos: ${errors}`,
    `Simulados salvos: ${simulations}`,
    '',
    'Continuar?'
  ].join('\n');
}

function handleJsonImport(file) {
  const reader = new FileReader();

  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);

      if (!parsed.subjects || !Array.isArray(parsed.subjects)) {
        showToast('Arquivo inválido: não encontrei seus dados de estudo.');
        return;
      }

      const ok = confirm(buildBackupPreviewText(parsed));
      if (!ok) return;

      appState.subjects = parsed.subjects;
      appState.filters = parsed.filters || appState.filters;
      appState.currentView = parsed.currentView || 'all';
      appState.stats = parsed.stats || { totalReviews: 0 };
      appState.settings = parsed.settings || appState.settings;
      openTopicKeys = new Set(Array.isArray(parsed.openTopics) ? parsed.openTopics : []);
      if (parsed.dailyReviewQueue) storage.saveDailyReviewQueue(parsed.dailyReviewQueue);
      else storage.clearDailyReviewQueue();
      if (Array.isArray(parsed.errorNotes)) storage.saveErrorNotes(parsed.errorNotes);
      if (Array.isArray(parsed.simulations)) storage.saveSimulations?.(parsed.simulations);

      normalizeSubjects(appState.subjects);
      syncProgressStorageFromSubjects();
      persistOpenTopics();
      saveApp();

      renderFilters();
      renderSidebar();
      renderDashboard();
      refreshTiredModeButton();
      showToast('Progresso carregado com sucesso.');
    } catch (_) {
      showToast('Erro ao ler o arquivo de progresso.');
    }
  };

  reader.readAsText(file);
}

function parseTxtToSubjects(text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const map = {};

  lines.forEach(line => {
    let parts = line.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) parts = line.split(' - ').map(p => p.trim()).filter(Boolean);
    if (!parts.length) return;

    const sName = parts[0] || 'Importado';
    const tName = parts[1] || 'Geral';
    const subName = parts[2] || parts.slice(1).join(' - ') || 'Sem título';
    const prio = normalizePriority(parts[3] || 'Média');

    map[sName] = map[sName] || {};
    map[sName][tName] = map[sName][tName] || [];
    map[sName][tName].push({ title: subName, priority: prio });
  });

  return Object.entries(map).map(([sName, topics]) => ({
    id: uuid(),
    name: sName,
    color: '#7c3aed',
    topics: Object.entries(topics).map(([tName, subs]) => ({
      id: uuid(),
      name: tName,
      enemWeight: '–',
      subtopics: subs.map(s => ({
        id: uuid(),
        name: s.title,
        priority: s.priority,
        currentLevel: 0,
        status: 'não iniciado',
        nextReviewDate: null,
        lastReviewed: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        notes: '',
        tags: [getPriorityTagLabel(s.priority)],
      })),
    })),
  }));
}

function handleTxtImport(file) {
  const reader = new FileReader();

  reader.onload = e => {
    const parsed = parseTxtToSubjects(e.target.result || '');

    if (!parsed.length) {
      showToast('Nenhum conteúdo válido no TXT.');
      return;
    }

    parsed.forEach(ns => {
      let subj = appState.subjects.find(s => s.name.toLowerCase() === ns.name.toLowerCase());
      if (!subj) {
        appState.subjects.push(ns);
      } else {
        ns.topics.forEach(nt => {
          let t = subj.topics.find(x => x.name.toLowerCase() === nt.name.toLowerCase());
          if (!t) subj.topics.push(nt);
          else t.subtopics = t.subtopics.concat(nt.subtopics);
        });
      }
    });

    normalizeSubjects(appState.subjects);
    syncProgressStorageFromSubjects();
    saveApp();
    renderFilters();
    renderSidebar();
    renderDashboard();
    showToast('Lista TXT importada.');
  };

  reader.readAsText(file);
}

// ─────────────────────────────────────────────────────────────
// MODO FOCO
// ─────────────────────────────────────────────────────────────
function buildFocusQueue() {
  return resolveDailyReviewPlan().remainingItems;
}

function openFocusMode() {
  focusQueue = buildFocusQueue();
  focusIndex = 0;
  const overlay = $('focusOverlay');
  if (!overlay) return;

  document.body.classList.add('focus-active');
  overlay.hidden = false;
  overlay.classList.remove('hidden');
  renderFocusCard();
}

function closeFocusMode() {
  const overlay = $('focusOverlay');
  document.body.classList.remove('focus-active');
  if (!overlay) return;
  overlay.hidden = true;
  overlay.classList.add('hidden');
}

function refreshFocusIfOpen() {
  const overlay = $('focusOverlay');
  if (!overlay || overlay.hidden) return;
  focusQueue = buildFocusQueue();
  if (focusIndex >= focusQueue.length) focusIndex = 0;
  renderFocusCard();
}

function renderFocusCard() {
  const overlay = $('focusOverlay');
  if (!overlay) return;

  const plan = resolveDailyReviewPlan();

  if (!focusQueue.length) {
    const finishedTitle = plan.selectedCount > 0 ? 'Revisões do dia concluídas ✅' : 'Tudo em dia ✅';
    const finishedDetail = plan.selectedCount > 0
      ? `Você fechou a fila de hoje: ${plan.completed} feita(s), ${plan.skipped} pulada(s) e ${plan.backlogCount} fora da fila para outro momento.`
      : 'Não encontrei revisões obrigatórias agora.';

    overlay.innerHTML = `
      <div class="focus-card focus-finish-card">
        <div class="focus-empty focus-finish">
          <div class="focus-finish-icon">✅</div>
          <h2>${finishedTitle}</h2>
          <p>${finishedDetail}</p>
          <div class="focus-summary-grid">
            <span><strong>${plan.completed}</strong><small>feitas</small></span>
            <span><strong>${plan.skipped}</strong><small>puladas</small></span>
            <span><strong>${plan.backlogCount}</strong><small>fora da fila</small></span>
          </div>
        </div>
        <div class="focus-actions"><button class="btn btn-primary" id="focusExit" type="button">Sair</button></div>
      </div>
    `;
    $('focusExit')?.addEventListener('click', closeFocusMode);
    return;
  }

  const item = focusQueue[focusIndex];
  const { subject, topic, sub } = item;
  const level = Number(sub.currentLevel) || 0;
  const status = getSubStatus(sub);
  const reason = getStudyReason(item);

  overlay.innerHTML = `
    <div class="focus-card">
      <div class="focus-top">
        <div class="focus-title">
          <small>Modo foco · ${focusIndex + 1}/${focusQueue.length} · fila travada de ${plan.date}</small>
          <strong>${esc(sub.name)}</strong>
          <small>${esc(subject.name)} · ${esc(topic.name)}</small>
        </div>
        <button class="btn btn-soft" id="focusExit" type="button"><i class="ph ph-x"></i> Sair</button>
      </div>

      <div class="focus-reason">
        <span class="focus-reason-label"><i class="ph ph-push-pin"></i> Motivo da escolha</span>
        <strong>${esc(reason)}</strong>
        <small>O sistema prioriza atrasadas, depois revisões de hoje, depois prioridade Alta não iniciada.</small>
      </div>

      <div class="focus-meta">
        <span class="card-tag ${status === 'atrasado' ? 'priority-alta' : ''}">${esc(status)}</span>
        <span class="card-tag status">R${level}</span>
        <span class="card-tag ${level >= 8 ? 'priority-baixa' : ''}">Próxima: ${level >= 8 ? 'Dominado' : fmtDate(sub.nextReviewDate)}</span>
        <span class="card-tag">Prioridade: ${esc(normalizePriority(sub.priority))}</span>
      </div>

      <div class="card-dates">
        <div class="date-card"><span>Última revisão</span><strong>${fmtDate(sub.lastReviewed)}</strong></div>
        <div class="date-card"><span>Próxima revisão</span><strong>${level >= 8 ? 'Dominado' : fmtDate(sub.nextReviewDate)}</strong></div>
      </div>

      <div class="focus-actions">
        <button class="btn btn-success" id="focusReviewed" type="button"><i class="ph ph-check-circle"></i> Revisado</button>
        <button class="btn btn-soft" id="focusSkipToday" type="button"><i class="ph ph-skip-forward"></i> Pular por hoje</button>
        <button class="btn btn-soft" id="focusErrorNote" type="button"><i class="ph ph-notebook"></i> Registrar erro</button>
        <button class="btn btn-soft" id="focusUndo" type="button">Desfazer</button>
        <button class="btn btn-soft" id="focusNext" type="button">Próximo</button>
      </div>
    </div>
  `;

  $('focusExit')?.addEventListener('click', closeFocusMode);
  $('focusReviewed')?.addEventListener('click', () => {
    markReviewed(sub, subject, topic);
    focusIndex = Math.min(focusIndex, Math.max(0, focusQueue.length - 1));
  });
  $('focusSkipToday')?.addEventListener('click', () => {
    skipDailyItem(sub.id);
    showToast(`${sub.name} foi pulado só por hoje.`);
    refreshFocusIfOpen();
    renderDashboard();
  });
  $('focusErrorNote')?.addEventListener('click', () => openErrorNotebookModal({ subject, topic, sub }));
  $('focusUndo')?.addEventListener('click', () => undoReview(sub, subject, topic));
  $('focusNext')?.addEventListener('click', () => {
    focusIndex = (focusIndex + 1) % focusQueue.length;
    renderFocusCard();
  });
}


// ─────────────────────────────────────────────────────────────
// SIMULADOS / BUSCA / OFFLINE
// ─────────────────────────────────────────────────────────────
function clearSimulationForm() {
  ['simDate', 'simSubject', 'simCorrect', 'simWrong', 'simScore', 'simTopics'].forEach(id => {
    const el = $(id);
    if (el) el.value = '';
  });
  const date = $('simDate');
  if (date) date.value = getTodayKey();
}

function renderSimulationsList() {
  const list = $('simulationsList');
  const count = $('simCount');
  if (!list) return;
  const simulations = storage.loadSimulations?.() || [];
  if (count) count.textContent = `${simulations.length} item(ns)`;
  if (!simulations.length) {
    list.innerHTML = '<div class="simulation-empty">Nenhum simulado registrado ainda.</div>';
    return;
  }
  list.innerHTML = simulations.map(sim => `
    <article class="simulation-card" data-sim-id="${esc(sim.id)}">
      <div class="simulation-card-top">
        <div><strong>${esc(sim.subject || 'Geral')}</strong><small>${esc(sim.date || 'sem data')} · nota ${esc(sim.score || '—')}</small></div>
        <button class="btn btn-danger btn-delete-sim" type="button" data-sim-id="${esc(sim.id)}">Excluir</button>
      </div>
      <div class="simulation-stats"><span>Acertos: <b>${Number(sim.correct || 0)}</b></span><span>Erros: <b>${Number(sim.wrong || 0)}</b></span></div>
      <p>${esc(sim.topics || 'Sem assuntos registrados.')}</p>
    </article>
  `).join('');
}

function openSimulationsModal() {
  const modal = $('simulationsModal');
  if (!modal) return;
  clearSimulationForm();
  renderSimulationsList();
  modal.hidden = false;
  modal.classList.remove('hidden');
  modal.classList.add('active');
}

function closeSimulationsModal() {
  const modal = $('simulationsModal');
  if (!modal) return;
  modal.hidden = true;
  modal.classList.add('hidden');
  modal.classList.remove('active');
}

function saveSimulationFromModal() {
  const simulation = {
    id: uuid(),
    date: $('simDate')?.value || getTodayKey(),
    subject: ($('simSubject')?.value || 'Geral').trim(),
    correct: Number($('simCorrect')?.value || 0),
    wrong: Number($('simWrong')?.value || 0),
    score: ($('simScore')?.value || '').trim(),
    topics: ($('simTopics')?.value || '').trim(),
    createdAt: new Date().toISOString(),
  };
  storage.addSimulation?.(simulation);

  // Relaciona os assuntos errados ao caderno de prioridade sem criar erro obrigatório.
  if (simulation.topics) {
    simulation.topics.split(/[,;\n]/).map(t => t.trim()).filter(Boolean).forEach(topicText => {
      const item = findBestMatchForErrorNote(simulation.subject, topicText, topicText);
      if (item) registerErrorBoostForStudyItem(item);
    });
    saveApp();
  }

  clearSimulationForm();
  renderSimulationsList();
  renderDashboard();
  showToast('Simulado salvo. Assuntos errados ganharam prioridade se foram encontrados.');
}

function renderSearchSuggestions(query) {
  const box = $('searchSuggestions');
  if (!box) return;
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 2) {
    box.hidden = true;
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  const items = flattenAllSubtopics()
    .map(item => ({ ...item, status: getSubStatus(item.sub), reviewLabel: `R${Number(item.sub.currentLevel) || 0}` }))
    .filter(({ subject, topic, sub, status, reviewLabel }) => [
      subject.name, topic.name, sub.name, ...(sub.tags || []), sub.priority, status, reviewLabel,
      Number(sub.errorCount || 0) > 0 ? 'erro caderno' : ''
    ].some(v => String(v || '').toLowerCase().includes(q)))
    .slice(0, 6);

  if (!items.length) {
    box.hidden = true;
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }

  box.innerHTML = `
    <strong>Encontrado em:</strong>
    ${items.map(({ subject, topic, sub }) => `
      <button type="button" class="search-suggestion-item" data-sub-id="${esc(sub.id)}">
        <span>${esc(sub.name)}</span>
        <small>${esc(subject.name)} · ${esc(topic.name)} · R${Number(sub.currentLevel) || 0}${Number(sub.errorCount || 0) ? ` · ${Number(sub.errorCount || 0)} erro(s)` : ''}</small>
      </button>
    `).join('')}
  `;
  box.hidden = false;
  box.classList.remove('hidden');
}

function setupOfflineReliableBanner() {
  const banner = $('offlineBanner');
  if (!banner) return;
  const close = $('offlineBannerClose');
  const update = () => {
    const dismissed = sessionStorage.getItem('apex_offline_banner_closed') === '1';
    const shouldShow = !navigator.onLine && !dismissed;
    banner.hidden = !shouldShow;
    banner.classList.toggle('hidden', !shouldShow);
  };
  close?.addEventListener('click', () => {
    sessionStorage.setItem('apex_offline_banner_closed', '1');
    update();
  });
  window.addEventListener('offline', () => {
    sessionStorage.removeItem('apex_offline_banner_closed');
    update();
  });
  window.addEventListener('online', update);
  update();
}

// ─────────────────────────────────────────────────────────────
// EVENTOS
// ─────────────────────────────────────────────────────────────
function attachEventHandlers() {
  const searchEl = $('searchInput');
  if (searchEl) {
    searchEl.addEventListener('input', e => {
      appState.filters.search = e.target.value;
      renderSearchSuggestions(e.target.value);
      renderDashboard();
      saveApp();
    });
  }

  function onFilterChange(id, key) {
    const el = $(id);
    if (!el) return;

    el.addEventListener('change', e => {
      appState.filters[key] = e.target.value;
      renderDashboard();
      renderSidebar();
      saveApp();
    });
  }

  onFilterChange('subjectFilter', 'subject');
  onFilterChange('priorityFilter', 'priority');
  onFilterChange('statusFilter', 'status');
  onFilterChange('reviewFilter', 'review');

  const dailyLimitSelect = $('dailyLimitSelect');
  if (dailyLimitSelect) {
    dailyLimitSelect.value = String(getDailyReviewLimit());
    dailyLimitSelect.addEventListener('change', e => {
      const limit = setDailyReviewLimit(e.target.value);
      storage.clearDailyReviewQueue();
      const plan = resolveDailyReviewPlan();
      refreshTiredModeButton();
      renderDashboard();
      saveApp();
      showToast(`Meta diária ajustada para ${limit}. Nova fila travada com ${plan.selectedCount} item(ns).`);
    });
  }

  $('btnTiredMode')?.addEventListener('click', activateTiredMode);

  $('btnErrorNotebook')?.addEventListener('click', () => openErrorNotebookModal());
  $('errorNotebookClose')?.addEventListener('click', closeErrorNotebookModal);
  $('errorNotebookClearForm')?.addEventListener('click', clearErrorNotebookForm);
  $('errorNotebookSave')?.addEventListener('click', saveErrorNoteFromModal);

  const errorNotebookModal = $('errorNotebookModal');
  errorNotebookModal?.addEventListener('click', e => {
    if (e.target === errorNotebookModal) closeErrorNotebookModal();
  });

  $('errorNotesList')?.addEventListener('click', e => {
    const btn = e.target.closest?.('.btn-delete-error');
    if (!btn) return;

    storage.deleteErrorNote(btn.dataset.noteId);
    renderErrorNotebookList();
    updateSideSummary();
    showToast('Erro removido do caderno.');
  });

  $('searchSuggestions')?.addEventListener('click', e => {
    const btn = e.target.closest?.('.search-suggestion-item');
    if (!btn) return;
    const item = findStudyItemBySubId(btn.dataset.subId);
    if (!item) return;
    const searchEl = $('searchInput');
    renderSearchSuggestions('');
    resetAllFilters();
    appState.filters.search = item.sub.name;
    if (searchEl) searchEl.value = item.sub.name;
    openTopicKeys.add(topicKey(item.subject.name, item.topic.name));
    persistOpenTopics();
    renderDashboard();
    saveApp();
  });

  $('subjectProgressArea')?.addEventListener('click', e => {
    const startBtn = e.target.closest?.('#homeStartNow');
    if (startBtn) {
      appState.currentView = 'studyToday';
      resolveDailyReviewPlan();
      renderDashboard();
      saveApp();
      return;
    }
  });

  $('btnStudyToday')?.addEventListener('click', () => {
    appState.currentView = 'studyToday';
    appState.filters.highOnly = false;
    $('highPriorityToggle')?.classList.remove('active');
    $('btnFinalMode')?.classList.remove('active');
    const plan = resolveDailyReviewPlan();
    renderDashboard();
    saveApp();
    showToast(`Estudar hoje ativado: ${plan.remainingItems.length}/${plan.limit} revisão(ões) restante(s).`);
  });

  $('btnFinalMode')?.addEventListener('click', () => {
    appState.currentView = appState.currentView === 'finalMode' ? 'all' : 'finalMode';
    appState.filters.highOnly = false;
    $('highPriorityToggle')?.classList.remove('active');
    $('btnFinalMode')?.classList.toggle('active', appState.currentView === 'finalMode');
    renderDashboard();
    saveApp();
    showToast(appState.currentView === 'finalMode' ? 'Modo Reta Final ativado.' : 'Modo Reta Final desativado.');
  });


  $('btnSimulations')?.addEventListener('click', openSimulationsModal);
  $('simulationsClose')?.addEventListener('click', closeSimulationsModal);
  $('simClear')?.addEventListener('click', clearSimulationForm);
  $('simSave')?.addEventListener('click', saveSimulationFromModal);
  $('simulationsModal')?.addEventListener('click', e => { if (e.target === $('simulationsModal')) closeSimulationsModal(); });
  $('simulationsList')?.addEventListener('click', e => {
    const btn = e.target.closest?.('.btn-delete-sim');
    if (!btn) return;
    storage.deleteSimulation?.(btn.dataset.simId);
    renderSimulationsList();
    showToast('Simulado removido.');
  });

  $('btnCalendar')?.addEventListener('click', () => {
    $('reviewCalendarCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  $('btnFocusMode')?.addEventListener('click', openFocusMode);

  const highToggle = $('highPriorityToggle');
  if (highToggle) {
    highToggle.addEventListener('click', () => {
      appState.filters.highOnly = !appState.filters.highOnly;
      appState.currentView = appState.filters.highOnly ? 'high' : 'all';
      highToggle.classList.toggle('active', appState.filters.highOnly);
      $('btnFinalMode')?.classList.remove('active');
      renderDashboard();
      saveApp();
    });
  }

  $('currentViewLabel')?.addEventListener('click', showEverything);
  $('btnShowAll')?.addEventListener('click', showEverything);

  $('btnAdd')?.addEventListener('click', openNewModal);
  $('btnNew')?.addEventListener('click', openNewModal);
  $('modalCancel')?.addEventListener('click', closeModal);
  $('modalSave')?.addEventListener('click', saveSubtopicFromModal);

  const itemModal = $('itemModal');
  if (itemModal) {
    itemModal.addEventListener('click', e => {
      if (e.target === itemModal) closeModal();
    });
  }

  $('btnExportJson')?.addEventListener('click', exportBackup);
  $('btnReport')?.addEventListener('click', openReportModal);
  $('reportClose')?.addEventListener('click', closeReportModal);
  $('reportDownloadTxt')?.addEventListener('click', () => {
    const data = openReportModal._lastData || buildReportData();
    downloadTextFile(buildReportText(data), `ApexENEM_Relatorio_${new Date().toISOString().slice(0, 10)}.txt`);
    showToast('Relatório TXT baixado.');
  });
  $('reportDownloadJson')?.addEventListener('click', () => {
    const data = openReportModal._lastData || buildReportData();
    downloadJsonFile(data, `ApexENEM_Relatorio_${new Date().toISOString().slice(0, 10)}.json`);
    showToast('Relatório JSON baixado.');
  });
  $('btnManual')?.addEventListener('click', openManualModal);
  $('manualClose')?.addEventListener('click', closeManualModal);
  $('btnSafeClear')?.addEventListener('click', safeClearWithBackup);

  const reportModal = $('reportModal');
  reportModal?.addEventListener('click', e => {
    if (e.target === reportModal) closeReportModal();
  });

  const manualModal = $('manualModal');
  manualModal?.addEventListener('click', e => {
    if (e.target === manualModal) closeManualModal();
  });

  const jsonFile = $('jsonImportFile');
  $('btnImportJson')?.addEventListener('click', () => jsonFile?.click());
  jsonFile?.addEventListener('change', e => {
    const f = e.target.files?.[0];
    if (f) handleJsonImport(f);
    e.target.value = '';
  });

  $('btnImportTxt')?.addEventListener('click', () => {
    const fi = document.createElement('input');
    fi.type = 'file';
    fi.accept = '.txt,text/plain';
    fi.addEventListener('change', e => {
      const f = e.target.files?.[0];
      if (f) handleTxtImport(f);
    });
    fi.click();
  });

  $('btnReset')?.addEventListener('click', safeClearWithBackup);

  const sidebarToggle = $('sidebarToggle');
  const sidebar = $('sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== sidebarToggle) {
        sidebar.classList.remove('open');
      }
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeErrorNotebookModal();
      closeFocusMode();
      closeReportModal();
      closeManualModal();
      closeSimulationsModal();
    }
  });
}

// ─────────────────────────────────────────────────────────────
// INICIALIZAÇÃO
// ─────────────────────────────────────────────────────────────
function initialize() {
  const persisted = storage.loadAppState();
  const isFirstRunOfReviewsOnly = !persisted || persisted.modeVersion !== REVIEWS_ONLY_VERSION;

  if (persisted && Array.isArray(persisted.subjects) && persisted.subjects.length) {
    appState.subjects = persisted.subjects;
    if (persisted.stats) appState.stats = persisted.stats;
    if (persisted.filters && !isFirstRunOfReviewsOnly) appState.filters = { ...appState.filters, ...persisted.filters };
    if (persisted.currentView && !isFirstRunOfReviewsOnly) appState.currentView = persisted.currentView;
    if (persisted.settings) appState.settings = { ...appState.settings, ...persisted.settings };
  } else {
    appState.subjects = buildSeedHierarchy();
  }

  normalizeSubjects(appState.subjects);
  const restoredMissingSeedTopics = mergeSeedTopicsPreservingProgress();
  normalizeSubjects(appState.subjects);
  applyProgressFromStorage();
  applyTiredModeRollover();
  normalizeSavedFilters();

  if (isFirstRunOfReviewsOnly || restoredMissingSeedTopics) {
    resetAllFilters();
    openTopicKeys = new Set();
  }

  closeStuckOverlays();
  renderFilters();
  renderSidebar();
  renderDashboard();
  setupOfflineReliableBanner();
  attachEventHandlers();
  refreshTiredModeButton();
  $('btnFinalMode')?.classList.toggle('active', appState.currentView === 'finalMode');
  saveApp();
}



// API segura para componentes extras de revisão.
function findSubtopicByNames(subjectName, topicName, subtopicName) {
  let found = null;
  appState.subjects.forEach(subject => {
    if (subject.name !== subjectName) return;
    subject.topics.forEach(topic => {
      if (topic.name !== topicName) return;
      topic.subtopics.forEach(sub => {
        if (sub.name === subtopicName) found = { subject, topic, sub };
      });
    });
  });
  return found;
}

window.ApexENEMApp = {
  getState: () => appState,
  showToast,
  refresh: () => {
    normalizeSubjects(appState.subjects);
    applyProgressFromStorage();
    renderFilters();
    renderSidebar();
    renderDashboard();
    refreshTiredModeButton();
  },
  markReviewedByKey: task => {
    const found = findSubtopicByNames(task.subject, task.topic, task.subtopic);
    if (!found) return false;
    markReviewed(found.sub, found.subject, found.topic);
    return true;
  },
  openErrorNotebook: prefill => openErrorNotebookModal(prefill || {}),
};

document.addEventListener('DOMContentLoaded', initialize);
