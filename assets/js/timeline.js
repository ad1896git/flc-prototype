window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const LANES = Object.freeze([
    { key: 'kwl', label: 'KWL 起点' },
    { key: 'companion', label: '学伴尝试与提示' },
    { key: 'progress', label: '进度红黄绿' },
    { key: 'product', label: '作品' },
    { key: 'reflection', label: '反思' },
    { key: 'declaration', label: 'AI 声明' },
    { key: 'quiz', label: '无工具测验成绩' }
  ].map(Object.freeze));
  const CRISIS_MASK = '[此消息已转由专业人员处理]';
  const STEP = 2 * 60 * 1000;
  const formats = { report: '报告', video: '视频', oral: '口述', poster: '海报', code: '代码',
    artifact: '实物', prototype: '原型', audio: '音频', other: '其他' };
  const colors = { red: '红', yellow: '黄', green: '绿' };
  const copy = value => JSON.parse(JSON.stringify(value));
  const crisis = msg => msg.sensitivity === 'crisis' || msg.kind === 'crisis_response';
  const hasTime = msg => typeof msg.created_at === 'string' && Number.isFinite(Date.parse(msg.created_at));
  const byTime = (a, b) => Date.parse(a.at) - Date.parse(b.at);

  FLC.store.registerSeed('timeline_anchors', () => []);
  FLC.store.registerSeed('task_adjustments', () => []);

  function anchorFor(conv, now = FLC.time.now()) {
    const anchors = FLC.store.collection('timeline_anchors');
    const found = anchors.get(conv.id);
    if (found) return found.anchor_ms;
    const messages = conv.messages || [];
    const missing = messages.filter(msg => !hasTime(msg)).length;
    const earliest = messages.filter(hasTime).reduce((min, msg) => Math.min(min, Date.parse(msg.created_at)), Infinity);
    const anchor = Math.min(now - 2 * 60 * 60 * 1000, earliest - (missing + 1) * STEP);
    anchors.upsert({ id: conv.id, anchor_ms: anchor });
    return anchor;
  }

  function stampedMessages(conv, now = FLC.time.now()) {
    const messages = copy(conv.messages || []);
    if (!messages.some(msg => !hasTime(msg))) return messages;
    const anchor = anchorFor(conv, now);
    return messages.map(msg => hasTime(msg) ? msg : {
      ...msg, created_at: new Date(anchor + msg.seq * STEP).toISOString()
    });
  }

  function maskedMessages(conv, now = FLC.time.now()) {
    return stampedMessages(conv, now).map(msg => crisis(msg)
      ? { ...msg, content: CRISIS_MASK, citations: [] } : msg);
  }

  function build({ studentId, taskId, conversations = [], submissions = [], evidence = [], now = FLC.time.now() }) {
    const lanes = LANES.map(lane => ({ ...lane, events: [] }));
    const eventsOf = Object.fromEntries(lanes.map(lane => [lane.key, lane.events]));
    const hintSeries = [];
    const belongs = record => record.user_id === studentId && record.task_id === taskId;
    conversations.filter(belongs).forEach(conv => {
      const match = /-p(\d+)$/.exec(conv.problem_id || '');
      const number = match ? Number(match[1]) : '?';
      stampedMessages(conv, now).filter(msg => !crisis(msg)).forEach(msg => {
        const hint = msg.kind === 'hint' && msg.role === 'assistant';
        const attempt = msg.kind === 'attempt' && msg.role === 'user';
        if (!hint && !attempt) return;
        eventsOf.companion.push({
          at: msg.created_at,
          title: '第 ' + number + ' 题 · ' + (hint ? '提示 ' + msg.hint_level + '/3' : '提交尝试'),
          ref: { type: 'conversation', conversation_id: conv.id, problem_id: conv.problem_id, message_id: msg.id }
        });
        if (hint) hintSeries.push({ at: msg.created_at, level: msg.hint_level,
          conversation_id: conv.id, problem_id: conv.problem_id });
      });
    });
    submissions.filter(belongs).forEach(sub => {
      const ref = { type: 'submission', id: sub.id };
      eventsOf.product.push({ at: sub.submitted_at,
        title: '第 ' + sub.version + ' 版提交（' + (formats[sub.format] || '其他') + '）', ref });
      const declaration = sub.declaration;
      if (!declaration) return;
      const title = declaration.boundary === 'forbidden' ? '已承诺未使用 AI'
        : declaration.used_ai === false ? '声明未使用'
          : '声明使用 ' + (declaration.items || []).length + ' 项工具';
      eventsOf.declaration.push({ at: declaration.created_at, title, ref: { ...ref } });
    });
    evidence.filter(belongs).forEach(entry => {
      // Only the evidence-entry types belong here; companion and declaration come from their own sources.
      if (!['kwl', 'progress', 'product', 'reflection', 'quiz'].includes(entry.type)) return;
      const titles = {
        kwl: 'KWL 起点', progress: '进度：' + (colors[entry.color] || '未标记'),
        product: entry.title || '作品', reflection: '反思',
        quiz: '无工具测验成绩：' + entry.score + '/' + entry.max_score
      };
      eventsOf[entry.type].push({ at: entry.created_at, title: titles[entry.type],
        ref: { type: 'evidence', id: entry.id } });
    });
    lanes.forEach(lane => lane.events.sort(byTime));
    hintSeries.sort(byTime);
    return { lanes, hintSeries };
  }

  function roster(account, offerings = [], enrollments = []) {
    const owned = offerings.filter(item => account && item.teacher_id === account.id);
    return {
      offerings: copy(owned),
      studentsOf(offeringId) {
        if (!owned.some(item => item.id === offeringId)) return [];
        return Array.from(new Set(enrollments.filter(item => item.offering_id === offeringId &&
          item.role === 'learner' && item.status === 'active').map(item => item.user_id)));
      }
    };
  }

  function adjustment({ task, account, offeringId, studentId, summary, refs = [], existing = [], now = FLC.time.now() }) {
    const changeSummary = typeof summary === 'string' ? summary.trim() : '';
    if (!changeSummary) return { ok: false,
      errors: [{ field: 'change_summary', message: '请填写任务调整说明。' }] };
    const prefix = 'adj-' + task.id + '-' + now + '-';
    let seq = existing.filter(item => item.id.startsWith(prefix)).length + 1;
    while (existing.some(item => item.id === prefix + seq)) seq += 1;
    return {
      id: prefix + seq, task_id: task.id, offering_id: offeringId,
      evidence_ref: { student_id: studentId, refs: copy(refs) }, change_summary: changeSummary,
      created_by: account.id, created_at: new Date(now).toISOString()
    };
  }

  FLC.timeline = { LANES, CRISIS_MASK, anchorFor, stampedMessages, build, maskedMessages, roster, adjustment };
})(window.FLC);
