import { getPriorityTagLabel, sanitizeTags, normalizePriority } from '../utils/filters.js';

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

export function createCardElement(sub, subject, topic, handlers = {}) {
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
