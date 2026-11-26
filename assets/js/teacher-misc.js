window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const fail = (code, reason) => ({ ok: false, code, reason });
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const stamp = now => new Date(now === undefined ? 0 : now).toISOString();

  function publishDraft(draft, { confirmed = false, now, actor_id } = {}) {
    if (!draft || !['generated', 'edited'].includes(draft.status)) {
      return fail('DRAFT_STATE_INVALID', '只有已生成或已编辑的草稿可以发布。');
    }
    if (confirmed !== true && draft.status !== 'edited') {
      return fail('DRAFT_CONFIRM_REQUIRED', '请先逐份审阅并确认草稿。');
    }
    if (!text(draft.draft_enc)) return fail('DRAFT_CONTENT_REQUIRED', '草稿正文不能为空。');
    if (actor_id && actor_id !== draft.teacher_id) return fail('DRAFT_FORBIDDEN', '只能发布本人的草稿。');
    if (draft.kind === 'digest') return fail('DRAFT_TEACHER_ONLY', '学情摘要仅教师本人可见，不向学生发布。');
    return { ok: true, draft: { ...clone(draft), status: 'published', reviewed_confirmed: true,
      published_content_enc: draft.draft_enc, published_by: actor_id || draft.teacher_id,
      published_at: stamp(now) } };
  }

  function briefingRows(raw) {
    return raw.map(row => ({
      student: FLC.pseudo(row.user_id, 'analytics'), submitted: row.submitted === true,
      messages: (row.messages || []).filter(message => message.sensitivity !== 'crisis').map(message => ({
        content: String(message.content || ''),
        hint_level: Number.isFinite(message.hint_level) ? message.hint_level : null,
        disagree_count: Number.isFinite(message.disagree_count) ? Math.max(0, message.disagree_count) : 0
      }))
    }));
  }

  function briefingSummary(rows, minN = 10) {
    if (rows.length < minN) return { suppressed: true, n: rows.length };
    const messages = rows.flatMap(row => row.messages);
    const hints = messages.filter(message => message.hint_level !== null);
    const answers = new Map();
    messages.forEach(message => {
      if (message.disagree_count) answers.set(message.content,
        (answers.get(message.content) || 0) + message.disagree_count);
    });
    return { suppressed: false, n: rows.length,
      submission_rate: rows.filter(row => row.submitted).length / rows.length,
      average_hint: hints.length ? hints.reduce((sum, m) => sum + m.hint_level, 0) / hints.length : null,
      top3: [...answers].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3)
        .map(([content, count]) => ({ content, count })) };
  }

  function reviewAlert(alert, action, reason, options = {}) {
    if (!alert || alert.state !== 'pending_review') return fail('ALERT_STATE_INVALID', '只能复核待复核预警。');
    if (!['confirm', 'dismiss', 'escalate'].includes(action)) return fail('ALERT_ACTION_INVALID', '请选择有效的复核操作。');
    if (action === 'dismiss' && !text(reason)) return fail('ALERT_REASON_REQUIRED', '驳回预警必须填写理由。');
    const now = options.now === undefined ? 0 : options.now;
    const updated = { ...clone(alert), state: { confirm: 'confirmed', dismiss: 'dismissed', escalate: 'escalated' }[action],
      reviewer_id: options.actor_id || 'csl-01', reviewed_at: stamp(now),
      review_reason: text(reason) ? reason.trim() : (action === 'confirm' ? '辅导员确认' : '转为敏感决定工单，由人工作出决定') };
    if (action !== 'escalate') return { ok: true, alert: updated };
    const max = Math.max(0, ...(options.cases || []).map(ticket => {
      const match = /^TK-\d{8}-(\d+)$/.exec(ticket.ticket_no || '');
      return match ? Number(match[1]) : 0;
    }));
    const id = 'case-sensitive_decision-' + now.toString(36);
    const ticket = { id, ticket_no: 'TK-' + stamp(now).slice(0, 10).replace(/-/g, '') + '-' + String(max + 1).padStart(6, '0'),
      type: 'sensitive_decision', priority: 'P1', subject_user_id: alert.student_id,
      source_module: 'ew', source_ref: { alert_id: alert.id }, summary: '学业预警转人工敏感决定复核',
      data_level: 3, visibility: 'standard', status: 'new', assignee_id: null, assignee_role: 'counselor',
      escalation_level: 0, created_at: stamp(now),
      sla_due_at: options.sla_due_at || stamp(now + FLC.data.teacherMisc.config.sensitiveDecisionSlaDays * 86400000),
      writeback_status: 'none', notify_status: 'none' };
    return { ok: true, alert: { ...updated, case_ticket_id: id }, ticket };
  }

  function certsInScope(account, certs) {
    const nodes = (account && account.roles || []).filter(role => role.role === 'equipment_tech' &&
      role.scope_type === 'space_node').map(role => role.scope_id);
    return certs.filter(cert => nodes.includes(cert.node_id)).map(clone);
  }

  function issueCert(cert, { account, now } = {}) {
    if (!cert || !certsInScope(account, [cert]).length) return fail('CERT_SCOPE_DENIED', '无权管理该节点。');
    if (!text(cert.user_id) || !text(cert.cert_code)) return fail('CERT_FIELDS_REQUIRED', '请选择学生和认证。');
    if (cert.issued_by && cert.issued_by !== account.id) return fail('CERT_ISSUER_INVALID', '签发人必须为当前技术员。');
    const issuedAt = cert.issued_at || stamp(now);
    if (!Number.isFinite(Date.parse(issuedAt)) || !Number.isFinite(Date.parse(cert.expires_at)) ||
        Date.parse(cert.expires_at) <= Date.parse(issuedAt)) return fail('CERT_EXPIRY_INVALID', '有效期必须晚于签发时间。');
    return { ok: true, cert: { ...clone(cert), id: cert.id || 'cert-' + cert.user_id + '-' + cert.cert_code + '-' + Date.parse(issuedAt).toString(36),
      issued_by: account.id, issued_at: issuedAt, revoked_at: null, revoke_reason: null } };
  }

  function revokeCert(cert, reason, { now } = {}) {
    if (!text(reason)) return fail('CERT_REASON_REQUIRED', '撤销认证必须填写理由。');
    if (!cert || cert.revoked_at) return fail('CERT_STATE_INVALID', '认证不存在或已撤销。');
    return { ok: true, cert: { ...clone(cert), revoked_at: stamp(now), revoke_reason: reason.trim() } };
  }

  FLC.teacherMisc = { publishDraft, briefingRows, briefingSummary, reviewAlert, certsInScope, issueCert, revokeCert };
})(window.FLC);
