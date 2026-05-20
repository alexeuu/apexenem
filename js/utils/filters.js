export function normalizePriority(priority) {
  if (priority === 'Very Baixa') return 'Muito Baixa';
  if (priority === 'Muito Baixa') return 'Muito Baixa';
  if (priority === 'Alta') return 'Alta';
  if (priority === 'Média') return 'Média';
  if (priority === 'Baixa') return 'Baixa';
  return 'Média';
}

export function getPriorityTagLabel(priority) {
  const p = normalizePriority(priority);
  if (p === 'Alta') return 'Cai muito';
  if (p === 'Média') return 'Cai médio';
  return 'Quase não cai';
}

export function sanitizeTags(tags, priority) {
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

export function normalizeText(s) {
  return String(s || '').trim();
}

export function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getSubStatus(sub, now = new Date()) {
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

export function isDueTodayOrOverdue(sub, now = new Date()) {
  const status = getSubStatus(sub, now);
  return status === 'atrasado' || status === 'revisão hoje';
}

export function isHighNotStarted(sub) {
  return normalizePriority(sub.priority) === 'Alta' && !sub.nextReviewDate && Number(sub.currentLevel) < 8;
}

export function filterSubjects(subjects, filters = {}, view = 'all') {
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
