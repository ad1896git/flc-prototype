window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const METACOG_QUESTIONS = Object.freeze([
    '请用一两句话说说这道题的关键思路。',
    '如果不用学伴，你有多大把握独立做出类似的题？（1–5）'
  ]);
  const FEEDBACK = Object.freeze(['helpful', 'not_helpful', 'disagree', 'need_teacher']);
  const ATTEMPT_REQUIREMENTS = Object.freeze({
    numeric: '请补充一个数值，或至少 30 字的思路说明。',
    expression: '请补充一个含数字的表达式，或至少 30 字的思路说明。',
    choice: '请选择 A–D 或选项一至四，并补充至少 15 字的理由。',
    short_answer: '请补充至少 50 字的作答思路。',
    essay: '请补充至少 50 字的论证思路。',
    design: '请补充至少 50 字的需求、约束与初步构想。',
    open_ended: '请补充至少 50 字的探索思路。',
    proof: '请补充至少 15 字的推理步骤或拟用方法。',
    code: '请补充至少 5 行非空代码，或至少 30 字的伪代码。'
  });
  const clone = value => JSON.parse(JSON.stringify(value));
  const clean = text => typeof text === 'string' ? text.trim() : '';
  const length = text => Array.from(text).length;
  const choice = /(?:\b[A-D]\b|[Ａ-Ｄ]|选项[一二三四])/gi;

  function isValidAttempt(text, problem_type) {
    const value = clean(text);
    if (!value) return false;
    if (['numeric', 'expression'].includes(problem_type)) return /[0-9０-９]/.test(value) || length(value) >= 30;
    if (problem_type === 'choice') return (value.match(choice) || []).length > 0 && length(value.replace(choice, '').trim()) >= 15;
    if (['short_answer', 'essay', 'design', 'open_ended'].includes(problem_type)) return length(value) >= 50;
    if (problem_type === 'proof') return length(value) >= 15;
    if (problem_type === 'code') return value.split(/\r?\n/).filter(line => line.trim()).length >= 5 || length(value) >= 30;
    return false;
  }

  function deliveryMode(boundary) {
    return { restricted: 'verified', encouraged: 'verified', open: 'stream', forbidden: 'none' }[boundary] || 'none';
  }

  // Only this function accesses collections. All transitions below return values.
  function findOrCreate(userId, taskId, problemId) {
    const records = FLC.store.collection('conversations');
    const found = records.list().find(conv => conv.user_id === userId && conv.task_id === taskId && conv.problem_id === problemId);
    if (found) return found;
    const task = FLC.store.collection('tasks').get(taskId);
    if (!task || !task.problems.some(problem => problem.id === problemId)) throw new Error('任务或题目不存在。');
    const rule = FLC.boundary.RULES[task.ai_boundary];
    return records.upsert({
      id: 'conv-' + problemId + '-' + userId, user_id: userId, task_id: taskId, problem_id: problemId,
      boundary: task.ai_boundary, mode: task.companion_mode || rule.default_mode,
      attempt_first: task.attempt_first === true, hint_level: 0, attempt_submitted: false,
      crisis_flagged: false, status: 'active', messages: []
    });
  }

  function blocked(conv) {
    return conv.status === 'active' ? null : { blocked: conv.status };
  }

  function append(conv, role, kind, content, extra = {}) {
    const next = clone(conv);
    const seq = next.messages.reduce((max, msg) => Math.max(max, msg.seq), 0) + 1;
    next.messages.push({ id: next.id + '-m' + seq, seq, role, kind, content,
      created_at: new Date(FLC.time.now()).toISOString(),
      hint_level: null, citations: [], flags: [], sensitivity: 'normal', feedback: [], ...clone(extra) });
    return next;
  }

  function scriptFor(conv, script) {
    if (script && script.boundary === conv.boundary) return script;
    const scripts = FLC.data.companion.scripts;
    return scripts.find(item => item.problem_id === conv.problem_id && item.boundary === conv.boundary) ||
      scripts.find(item => item.boundary === conv.boundary);
  }

  function output(conv, script, turn, kind) {
    const challenge = conv.pending_challenge && script.turns.find(item => item.situation === 'challenge');
    const answer = (challenge || turn || { reply: script.generic }).reply;
    const forbidden = conv.boundary === 'forbidden';
    const next = append(conv, forbidden ? 'system_notice' : 'assistant', forbidden ? 'system' : kind,
      answer.content, { citations: answer.citations || [], hint_level: kind === 'hint' ? conv.hint_level : null });
    next.pending_challenge = false;
    return next;
  }

  function canHint(conv, task = conv) {
    return conv.status === 'active' && conv.boundary !== 'forbidden' && conv.hint_level < 3 &&
      !(task.attempt_first === true && !conv.attempt_submitted);
  }

  function requestHint(conv, task = conv, script) {
    const denied = blocked(conv);
    if (denied) return denied;
    const selected = scriptFor(conv, script);
    if (conv.boundary === 'forbidden') return output(conv, selected, selected.turns.find(turn => turn.situation === 'hint'), 'system');
    if (!canHint(conv, task)) return { blocked: task.attempt_first && !conv.attempt_submitted ? 'attempt_first' : 'hint_limit' };
    const level = conv.hint_level + 1;
    const turn = selected.turns.find(item => item.situation === 'hint' && item.reply.hint_level === level);
    return output({ ...conv, hint_level: level }, selected, turn, 'hint');
  }

  function submitAttempt(conv, text, problem) {
    if (detectCrisis(text)) return { blocked: 'crisis' };
    const denied = blocked(conv);
    if (denied) return denied;
    if (conv.boundary === 'forbidden') return requestHint(conv);
    if (!isValidAttempt(text, problem.problem_type)) return {
      blocked: 'invalid_attempt', conversation: conv,
      message: ATTEMPT_REQUIREMENTS[problem.problem_type] || '请先确认题型，再补充你的尝试。'
    };
    return { ...append(conv, 'user', 'attempt', clean(text)), attempt_submitted: true };
  }

  function reply(conv, studentText, script) {
    if (detectCrisis(studentText)) return { blocked: 'crisis' };
    const denied = blocked(conv);
    if (denied) return denied;
    const text = clean(studentText);
    if (!text) return { blocked: 'empty_message' };
    const selected = scriptFor(conv, script);
    const turn = selected.turns.find(item => clean(item.student) === text);
    if (turn && turn.situation === 'hint' && !conv.pending_challenge) {
      if (conv.boundary !== 'forbidden' && !canHint(conv)) {
        return { blocked: conv.attempt_first && !conv.attempt_submitted ? 'attempt_first' : 'hint_limit' };
      }
      const requested = append(conv, 'user', 'chat', text);
      return requestHint(requested, requested, selected);
    }
    const next = append(conv, 'user', 'chat', text);
    if (conv.boundary !== 'forbidden' && conv.attempt_first && !conv.attempt_submitted && !conv.pending_challenge) {
      return append(next, 'system_notice', 'system', '先写下你的尝试。');
    }
    return output(next, selected, turn, 'chat');
  }

  function addFeedback(conv, msgId, value) {
    if (!FEEDBACK.includes(value)) return { blocked: 'invalid_feedback' };
    const next = clone(conv);
    const msg = next.messages.find(item => item.id === msgId);
    if (!msg || !['assistant', 'system_notice'].includes(msg.role)) return { blocked: 'message_not_found' };
    if (!msg.feedback.includes(value)) msg.feedback.push(value);
    if (value === 'disagree') next.pending_challenge = true;
    return next;
  }

  function needTeacherCase(conv, msgId, user, cases, now) {
    if (user.id !== conv.user_id || !conv.messages.some(msg => msg.id === msgId)) throw new Error('会话或消息不属于该学生。');
    const date = new Date(now).toISOString();
    const max = cases.reduce((n, item) => {
      const match = /^TK-\d{8}-(\d+)$/.exec(item.ticket_no);
      return match ? Math.max(n, Number(match[1])) : n;
    }, 0);
    let idTime = now;
    while (cases.some(item => item.id === 'case-academic_help-' + idTime.toString(36))) idTime += 1;
    return {
      id: 'case-academic_help-' + idTime.toString(36),
      ticket_no: 'TK-' + date.slice(0, 10).replace(/-/g, '') + '-' + String(max + 1).padStart(6, '0'),
      type: 'academic_help', subtype: null, priority: 'P2', subject_user_id: user.id,
      source_ref: conv.id, source_msg_id: msgId, summary: '学生请求教师协助复核本题对话。',
      visibility: 'standard', status: 'new', assignee_role: 'teacher', created_at: date,
      sla_due_at: new Date(now + FLC.data.companion.academicHelpSlaMs).toISOString(),
      claimed_at: null, resolution_code: null, resolution: null
    };
  }

  function detectCrisis(text) {
    const terms = FLC.data && FLC.data.crisis ? FLC.data.crisis.terms : [];
    return terms.some(term => clean(text).includes(term));
  }

  function activeHold(holds, userId) {
    return holds.find(hold => hold.user_id === userId && hold.released_at === null) || null;
  }

  function triggerCrisis(conv, text, user, cases, now) {
    if (user.id !== conv.user_id) throw new Error('会话不属于该学生。');
    const data = FLC.data.crisis;
    const date = new Date(now).toISOString();
    // Safety takes precedence over active/frozen/closing/closed state checks.
    let conversation = append(conv, 'user', 'chat', clean(text), { sensitivity: 'crisis' });
    const sourceMessages = conversation.messages.slice(-3);
    sourceMessages.forEach(msg => { msg.sensitivity = 'crisis'; });
    const sourceMsgIds = sourceMessages.map(msg => msg.id);
    conversation = append(conversation, 'system_notice', 'crisis_response', data.copy.care);
    conversation.crisis_flagged = true;
    const max = cases.reduce((n, item) => {
      const match = /^TK-\d{8}-(\d+)$/.exec(item.ticket_no);
      return match ? Math.max(n, Number(match[1])) : n;
    }, 0);
    let idTime = now;
    while (cases.some(item => item.id === 'case-crisis-' + idTime.toString(36))) idTime += 1;
    const ticket = {
      id: 'case-crisis-' + idTime.toString(36),
      ticket_no: 'TK-' + date.slice(0, 10).replace(/-/g, '') + '-' + String(max + 1).padStart(6, '0'),
      type: 'crisis', subtype: null, priority: 'P0', subject_user_id: user.id,
      source_ref: conv.id, source_msg_ids: sourceMsgIds, summary: '学生需要专业人员联系与支持。',
      visibility: 'restricted_psych', status: 'new', assignee_role: 'psych_staff', created_at: date,
      sla_due_at: new Date(now + data.config.crisis_sla_ms).toISOString(),
      claimed_at: null, resolution_code: null, resolution: null
    };
    const hold = {
      id: 'hold-' + ticket.id, user_id: user.id, ticket_id: ticket.id,
      mode: data.config.mode, started_at: date, released_at: null
    };
    return { conversation, ticket, hold };
  }

  function finish(conv) {
    const denied = blocked(conv);
    if (denied) return denied;
    if (conv.boundary === 'forbidden') return { blocked: 'forbidden' };
    return { ...METACOG_QUESTIONS.reduce((next, question) =>
      append(next, 'assistant', 'metacog_prompt', question), conv), status: 'closing' };
  }

  function metacogAnswer(conv, answers) {
    if (conv.status !== 'closing') return { blocked: conv.status };
    if (!Array.isArray(answers) || answers.length !== 2 || !clean(answers[0]) || !/^[1-5]$/.test(String(answers[1]).trim())) {
      return { blocked: 'invalid_metacog_answer' };
    }
    return { ...answers.reduce((next, answer) => append(next, 'user', 'metacog_answer', String(answer).trim()), conv), status: 'closed' };
  }

  function metacogSkip(conv) {
    if (conv.status !== 'closing') return { blocked: conv.status };
    return { ...append(conv, 'system_notice', 'metacog_skipped', '已跳过元认知收尾。', { flags: ['metacog_skipped'] }), status: 'closed' };
  }

  FLC.companion = { METACOG_QUESTIONS, FEEDBACK, findOrCreate, isValidAttempt, canHint,
    submitAttempt, requestHint, reply, deliveryMode, addFeedback, needTeacherCase,
    detectCrisis, triggerCrisis, activeHold, finish, metacogAnswer, metacogSkip };
})(window.FLC);
