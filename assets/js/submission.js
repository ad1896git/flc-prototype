window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const LABELS = {
    formats: { report: '报告', video: '视频', oral: '口述', poster: '海报', code: '代码', artifact: '实物',
      prototype: '原型', audio: '音频', other: '其他' },
    stages: { idea: '思路', research: '资料检索', draft: '起草', revision: '修订', verification: '验证' }
  };
  const text = value => typeof value === 'string' ? value.trim() : '';
  const fields = ['tool', 'version', 'purpose', 'stage', 'verification'];
  const names = { tool: '工具名称', version: '版本', purpose: '用途', stage: '使用阶段', verification: '验证方式' };
  const formats = task => Array.isArray(task.alt_submission_formats) && task.alt_submission_formats.length
    ? task.alt_submission_formats : ['report'];

  function prefill(conversations) {
    const problems = new Map();
    conversations.forEach(conversation => {
      const messages = (conversation.messages || []).filter(message =>
        message.sensitivity !== 'crisis' && message.kind !== 'crisis_response');
      const rounds = messages.filter(message => message.role === 'user').length;
      const hints = messages.filter(message => message.role === 'assistant' && message.kind === 'hint');
      if (!rounds && !hints.length) return;
      const problem = problems.get(conversation.problem_id) || {
        problem_id: conversation.problem_id, rounds: 0, hints_used: 0, max_hint_level: 0
      };
      problem.rounds += rounds;
      problem.hints_used += hints.length;
      problem.max_hint_level = Math.max(problem.max_hint_level,
        ...hints.map(message => Math.max(0, Math.min(3, Number(message.hint_level) || 0))));
      problems.set(conversation.problem_id, problem);
    });
    const list = Array.from(problems.values());
    return { tool: 'FLC 学伴', version: '演示 v1.0', problems: list,
      total_rounds: list.reduce((sum, problem) => sum + problem.rounds, 0),
      max_hint_level: Math.max(0, ...list.map(problem => problem.max_hint_level)) };
  }

  function validate(task, form) {
    const errors = [];
    let code;
    function add(category, field, message) {
      if (!code) code = category;
      errors.push({ field, message });
    }
    if (!formats(task).includes(form.format)) {
      add('EVIDENCE_FORMAT_NOT_ALLOWED', 'format', '请选择任务允许的提交形式。');
    }
    const declaration = (field, message) => add('EVIDENCE_DECLARATION_REQUIRED', field, message);
    const level = task.ai_boundary;
    if (level === 'forbidden') {
      if (form.pledge !== true) declaration('pledge', '请勾选未使用 AI 的承诺。');
    } else {
      if (typeof form.used_ai !== 'boolean') declaration('used_ai', '请选择是否使用 AI。');
      const full = level === 'restricted' || level === 'encouraged';
      if (full && form.used_ai === false && form.prefill_snapshot && form.prefill_snapshot.total_rounds > 0) {
        declaration('used_ai', '平台学伴已有使用记录，请选择使用并完成声明。');
      }
      if (form.used_ai === true) {
        if (!Array.isArray(form.items) || !form.items.length) declaration('items', '请至少填写一项工具。');
        else form.items.forEach((item, index) => {
          (full ? fields : ['tool']).forEach(field => {
            if (!text(item && item[field])) declaration('items.' + index + '.' + field, '请填写' + names[field] + '。');
          });
        });
      }
    }
    if (!text(form.content_demo) && !(Array.isArray(form.attachment_keys) && form.attachment_keys.some(text))) {
      add('EVIDENCE_CONTENT_REQUIRED', 'content_demo', '请填写正文或至少一个附件名。');
      add('EVIDENCE_CONTENT_REQUIRED', 'attachment_keys', '正文或附件名至少填写一项。');
    }
    return errors.length ? { ok: false, code, errors } : { ok: true };
  }

  function latest(list, userId, taskId) {
    return list.filter(record => record.user_id === userId && record.task_id === taskId)
      .reduce((last, record) => !last || record.version > last.version ? record : last, null);
  }
  function nextVersion(list, userId, taskId) {
    const last = latest(list, userId, taskId);
    return last ? Number(last.version) + 1 : 1;
  }
  function build(task, account, form, snapshot, list, now) {
    const result = validate(task, Object.assign({}, form, { prefill_snapshot: snapshot }));
    if (!result.ok) return result;
    const version = nextVersion(list, account.id, task.id);
    const forbidden = task.ai_boundary === 'forbidden';
    const used = !forbidden && form.used_ai === true;
    const submittedAt = new Date(now).toISOString();
    return {
      id: 'sub-' + task.id + '-' + account.id + '-v' + version,
      offering_id: task.offering_id, task_id: task.id, user_id: account.id, submitted_by: account.id,
      version, format: form.format, content_demo: text(form.content_demo),
      attachment_keys: (form.attachment_keys || []).map(text).filter(Boolean), submitted_at: submittedAt,
      declaration: {
        boundary: task.ai_boundary, used_ai: used,
        items: used ? form.items.map(item => Object.fromEntries(
          (task.ai_boundary === 'open' ? ['tool'] : fields).map(field => [field, text(item[field])]))) : [],
        prefill_snapshot: forbidden ? null : JSON.parse(JSON.stringify(snapshot)),
        pledge: forbidden ? form.pledge === true : true, declarant_id: account.id, created_at: submittedAt
      }
    };
  }
  FLC.store.registerSeed('submissions', () => []);
  FLC.submission = { LABELS, prefill, validate, nextVersion, latest, build };
})(window.FLC);
