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

export function saveAppState(state) {
  safeSet(STORAGE_KEY, state);
}

export function loadAppState() {
  return safeGet(STORAGE_KEY, null) || safeGet(LEGACY_STORAGE_KEY, null);
}

export function loadProgress() {
  return safeGet(PROGRESS_KEY, {}) || safeGet(LEGACY_PROGRESS_KEY, {}) || {};
}

export function saveProgressMap(map) {
  safeSet(PROGRESS_KEY, map || {});
}

export function loadHistory() {
  return safeGet(HISTORY_KEY, {}) || safeGet(LEGACY_HISTORY_KEY, {}) || {};
}

export function saveHistoryMap(map) {
  safeSet(HISTORY_KEY, map || {});
}

export function generateKey(subjectName, topicName, subName) {
  return `${subjectName || ''}|||${topicName || ''}|||${subName || ''}`.toLowerCase().trim();
}

export function setSubProgress(subjectName, topicName, subName, data) {
  const map = loadProgress();
  map[generateKey(subjectName, topicName, subName)] = data;
  saveProgressMap(map);
}

export function getSubProgress(subjectName, topicName, subName) {
  const map = loadProgress();
  return map[generateKey(subjectName, topicName, subName)] || null;
}

export function deleteSubProgress(subjectName, topicName, subName) {
  const map = loadProgress();
  const key = generateKey(subjectName, topicName, subName);

  if (map[key]) {
    delete map[key];
    saveProgressMap(map);
  }
}

export function pushSubSnapshot(subjectName, topicName, subName, snapshot) {
  const map = loadHistory();
  const key = generateKey(subjectName, topicName, subName);
  map[key] = map[key] || [];
  map[key].push(snapshot);
  saveHistoryMap(map);
}

export function popSubSnapshot(subjectName, topicName, subName) {
  const map = loadHistory();
  const key = generateKey(subjectName, topicName, subName);

  if (!map[key] || !map[key].length) return null;

  const v = map[key].pop();
  saveHistoryMap(map);
  return v;
}

export function peekSubSnapshot(subjectName, topicName, subName) {
  const map = loadHistory();
  const key = generateKey(subjectName, topicName, subName);

  if (!map[key] || !map[key].length) return null;

  return map[key][map[key].length - 1];
}

export function clearSubHistory(subjectName, topicName, subName) {
  const map = loadHistory();
  const key = generateKey(subjectName, topicName, subName);

  if (map[key]) {
    delete map[key];
    saveHistoryMap(map);
  }
}

export function loadOpenTopics() {
  const arr = safeGet(OPEN_TOPICS_KEY, []);
  return Array.isArray(arr) ? arr : [];
}

export function saveOpenTopics(keys) {
  const arr = Array.isArray(keys) ? keys : Array.from(keys || []);
  safeSet(OPEN_TOPICS_KEY, arr);
}

export function loadDailyReviewQueue() {
  const queue = safeGet(DAILY_QUEUE_KEY, null);
  return queue && typeof queue === 'object' ? queue : null;
}

export function saveDailyReviewQueue(queue) {
  safeSet(DAILY_QUEUE_KEY, queue || null);
}

export function clearDailyReviewQueue() {
  try {
    localStorage.removeItem(DAILY_QUEUE_KEY);
  } catch (_) {}
}


export function loadErrorNotes() {
  const notes = safeGet(ERROR_NOTES_KEY, []);
  return Array.isArray(notes) ? notes : [];
}

export function saveErrorNotes(notes) {
  safeSet(ERROR_NOTES_KEY, Array.isArray(notes) ? notes : []);
}

export function addErrorNote(note) {
  const notes = loadErrorNotes();
  notes.unshift(note);
  saveErrorNotes(notes);
  return note;
}

export function deleteErrorNote(noteId) {
  const notes = loadErrorNotes().filter(note => note.id !== noteId);
  saveErrorNotes(notes);
}

export function clearErrorNotes() {
  try {
    localStorage.removeItem(ERROR_NOTES_KEY);
  } catch (_) {}
}




export function loadSimulations() {
  const simulations = safeGet(SIMULATIONS_KEY, []);
  return Array.isArray(simulations) ? simulations : [];
}

export function saveSimulations(simulations) {
  safeSet(SIMULATIONS_KEY, Array.isArray(simulations) ? simulations : []);
}

export function addSimulation(simulation) {
  const simulations = loadSimulations();
  simulations.unshift(simulation);
  saveSimulations(simulations);
  return simulation;
}

export function deleteSimulation(simulationId) {
  saveSimulations(loadSimulations().filter(sim => sim.id !== simulationId));
}


export function clearAll() {
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
