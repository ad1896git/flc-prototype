window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const iso = now => new Date(now).toISOString();
  const config = () => FLC.data.myData.config;
  const scopeFor = code => FLC.data.consentScopes.find(scope => scope.code === code);

  function decide(records, userId, scopeCode, decision, version, now = FLC.time.now()) {
    const scope = scopeFor(scopeCode);
    if (!userId || !scope || scope.active === false) throw new Error('用户或同意场景无效。');
    if (version !== scope.current_version) throw new Error('告知内容已更新，需要重新确认。');
    if (!['granted', 'declined', 'withdrawn'].includes(decision)) throw new Error('同意决策无效。');
    if (decision === 'withdrawn' && !scope.withdrawable) throw new Error('此场景不可撤回。');
    const seq = records.filter(record => record.user_id === userId && record.scope_code === scopeCode)
      .reduce((max, record) => Math.max(max, record.seq), 0) + 1;
    return records.concat({ id: 'consent-' + userId + '-' + scopeCode + '-' + seq,
      seq, user_id: userId, scope_code: scopeCode, scope_version: version,
      decision, decided_at: iso(now) });
  }

  function effective(records, scopes, userId, scopeCode) {
    const scope = scopes.find(item => item.code === scopeCode);
    if (!scope || scope.active === false) return false;
    const latest = records.filter(record => record.user_id === userId && record.scope_code === scopeCode)
      .reduce((last, record) => !last || record.seq > last.seq ? record : last, null);
    return !!latest && latest.decision === 'granted' && latest.scope_version === scope.current_version;
  }

  function withdrawImpact(scope) {
    return { affects: scope.affects.slice(), sinks: scope.sinks.slice(),
      basic_services: '不影响你正常使用学伴、预约等基本学习服务' };
  }

  function withdrawalTasks(withdrawnRecord, now) {
    const scope = scopeFor(withdrawnRecord.scope_code);
    if (!scope || withdrawnRecord.decision !== 'withdrawn' || !withdrawnRecord.user_id ||
        !Number.isInteger(withdrawnRecord.seq) || withdrawnRecord.seq < 1) {
      throw new Error('需要本次撤回的同意记录。');
    }
    return scope.sinks.map(sink => {
      const policy = FLC.data.myData.sinkPolicies[sink];
      const delay = sink === 'backup' ? config().backup_retention_ms : config().withdrawal_delay_ms;
      return { id: 'cwt-' + withdrawnRecord.user_id + '-' + scope.code + '-' + withdrawnRecord.seq + '-' + sink,
        consent_seq: withdrawnRecord.seq, user_id: withdrawnRecord.user_id, scope_code: scope.code,
        sink, status: 'pending', detail: { title: policy.title, message: policy.detail },
        created_at: iso(now), complete_at: iso(now + delay), result_status: policy.result_status, done_at: null };
    });
  }

  function taskStatus(task, now) {
    if (task.status !== 'pending') return task.status;
    return now >= Date.parse(task.complete_at) ? task.result_status : 'pending';
  }

  function exportStatus(record, now) {
    const elapsed = now - Date.parse(record.created_at);
    if (elapsed < config().export_generating_ms) return 'queued';
    if (elapsed < config().export_ready_ms) return 'generating';
    if (elapsed < config().export_ready_ms + config().export_valid_ms) return 'ready';
    return 'expired';
  }

  function requestCase(kind, user, content, cases, now) {
    if (!['correction', 'deletion'].includes(kind)) throw new Error('仅支持更正或删除申请。');
    if (!user || !user.id || typeof content !== 'string' || !content.trim()) throw new Error('请填写申请内容。');
    const created_at = iso(now);
    const max = cases.reduce((seq, item) => {
      const match = /^TK-\d{8}-(\d+)$/.exec(item.ticket_no);
      return match ? Math.max(seq, Number(match[1])) : seq;
    }, 0);
    let idTime = now;
    while (cases.some(item => item.id === 'case-data_right-' + idTime.toString(36))) idTime += 1;
    const id = 'case-data_right-' + idTime.toString(36);
    const record = { id: 'dr-' + id, user_id: user.id, kind, status: 'new', created_at, ticket_id: id };
    const ticket = { id,
      ticket_no: 'TK-' + created_at.slice(0, 10).replace(/-/g, '') + '-' + String(max + 1).padStart(6, '0'),
      type: 'data_right', subtype: kind, priority: 'P2', subject_user_id: user.id,
      source_ref: record.id, summary: kind === 'correction' ? '学生申请更正个人数据' : '学生申请删除个人数据',
      payload_demo: content.trim(), visibility: 'standard', status: 'new', assignee_role: 'data_steward',
      created_at, sla_due_at: iso(now + config().request_sla_ms), sla_note: config().sla_note,
      claimed_at: null, resolution_code: null, resolution: null };
    return { ticket, record };
  }

  function accessLog(audit, userId) {
    return audit.filter(record => record.action === 'companion.view_student_conv' && record.subject_user_id === userId)
      .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
  }

  FLC.consent = { decide, effective, withdrawImpact, withdrawalTasks, taskStatus };
  FLC.dataRights = { exportStatus, requestCase, accessLog };
})(window.FLC);
