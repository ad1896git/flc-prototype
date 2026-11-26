window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const DAY = 86400000;
  const resolutionCodes = ['referred', 'supported', 'no_action', 'corrected',
    'upheld', 'overturned', 'fulfilled', 'rejected'];
  const transitions = {
    new: { claim: 'assigned' },
    escalated: { assign: 'assigned' },
    assigned: { start: 'in_progress' },
    in_progress: { wait: 'waiting_student', resolve: 'resolved' },
    waiting_student: { resume: 'in_progress' },
    resolved: { close: 'closed' }, closed: {}
  };
  const time = value => value == null ? NaN : new Date(value).getTime();
  const rolesOf = account => account && Array.isArray(account.roles) ? account.roles : [];
  const unresolved = t => !['resolved', 'closed'].includes(t.status);

  function offeringOf(t, ctx = {}) {
    if (t.offering_id) return t.offering_id;
    if (typeof t.source_ref !== 'string') return null;
    const tasks = ctx.tasks || [];
    const conversation = (ctx.conversations || []).find(c => c.id === t.source_ref);
    const task = conversation && tasks.find(item => item.id === conversation.task_id);
    if (task && task.offering_id) return task.offering_id;
    const direct = tasks.find(item => item.id === t.source_ref);
    const problem = t.source_ref.match(/^(.*)-p\d+$/);
    const source = direct || (problem && tasks.find(item => item.id === problem[1]));
    return source && source.offering_id || null;
  }

  function groupOf(t, ctx = {}) {
    if (t.group_id) return t.group_id;
    if (!t.subject_user_id) return null;
    return Object.keys(ctx.groupMembers || {}).find(id =>
      ctx.groupMembers[id].includes(t.subject_user_id)) || null;
  }

  function ccCounselor(t, cases, now) {
    if (t.type !== 'academic_help' || !t.subject_user_id || !unresolved(t)) return false;
    const end = time(now);
    const ids = new Set((cases || []).filter(item => item.type === 'academic_help' &&
      item.subject_user_id === t.subject_user_id && unresolved(item) &&
      time(item.created_at) >= end - 2 * DAY && time(item.created_at) <= end).map(item => item.id));
    return ids.size >= 2;
  }

  function visible(account, cases = [], ctx = {}, now) {
    return cases.filter(t => rolesOf(account).some(({ role, scope_type, scope_id }) => {
      if (role === 'teacher') return t.type === 'academic_help' &&
        t.visibility !== 'restricted_psych' && !!scope_id && scope_id === offeringOf(t, ctx);
      if (role === 'psych_staff') return ['crisis', 'distress'].includes(t.type);
      if (role === 'data_steward') return t.type === 'data_right';
      if (role !== 'counselor' || scope_type !== 'student_group' || !scope_id ||
          scope_id !== groupOf(t, ctx)) return false;
      return ['crisis', 'distress', 'ew_case', 'sensitive_decision'].includes(t.type) ||
        ccCounselor(t, cases, now);
    }));
  }

  // 作用域由 visible 判定；本函数不读取集合。
  function access(account, t) {
    const roles = rolesOf(account).map(item => item.role);
    const psych = roles.includes('psych_staff');
    const counselorOnly = roles.includes('counselor') && !psych;
    const assigned = !!account && !!account.id && t.assignee_id === account.id;
    const roleMatches = roles.includes(t.assignee_role);
    const readOnly = t.assignee_role === 'counselor' &&
      ['academic_help', 'crisis'].includes(t.type);
    return {
      canAct: roleMatches && !readOnly && (!t.assignee_id || assigned),
      canViewPayload: (psych || assigned) && !(counselorOnly && t.type === 'crisis'),
      showLearningLinks: !psych,
      realName: roles.some(role => ['teacher', 'counselor', 'psych_staff', 'data_steward'].includes(role))
    };
  }

  function effectiveStatus(t, now) {
    return ['new', 'assigned'].includes(t.status) && !t.claimed_at &&
      time(now) > time(t.sla_due_at) ? 'escalated' : t.status;
  }

  function slaState(t, now) {
    const remainingMs = time(t.sla_due_at) - time(now);
    if (!Number.isFinite(remainingMs)) {
      return { remainingMs: null, label: '未设置 SLA', warn: false, overdue: false };
    }
    const overdue = remainingMs < 0;
    const warn = remainingMs < (time(t.sla_due_at) - time(t.created_at)) * 0.2;
    let label = '已超时';
    if (!overdue && remainingMs >= DAY) label = '剩余 ' + Math.ceil(remainingMs / DAY) + ' 天';
    else if (!overdue) {
      const seconds = Math.floor(remainingMs / 1000);
      label = '剩余 ' + String(Math.floor(seconds / 60)).padStart(2, '0') + ':' +
        String(seconds % 60).padStart(2, '0');
    }
    return { remainingMs, label, warn, overdue };
  }

  function transition(t, action, payload = {}, now) {
    const status = effectiveStatus(t, now);
    const allowed = Object.keys(transitions[status] || {}).filter(name =>
      !(name === 'close' && t.type === 'crisis' && payload.actor_role !== 'psych_staff'));
    if (!allowed.includes(action)) {
      return { ok: false, code: 'CASE_INVALID_TRANSITION', details: { status, allowed } };
    }
    if (typeof payload.actor_id !== 'string' || !payload.actor_id.trim()) {
      return { ok: false, code: 'CASE_ACTOR_REQUIRED' };
    }
    if (action === 'resolve' && (typeof payload.resolution !== 'string' ||
        !payload.resolution.trim() || !resolutionCodes.includes(payload.resolution_code))) {
      return { ok: false, code: 'CASE_RESOLUTION_REQUIRED' };
    }
    const occurred_at = new Date(now).toISOString();
    const ticket = { ...t, status: transitions[status][action] };
    if (action === 'claim' || action === 'assign') {
      ticket.assignee_id = payload.actor_id;
      ticket.claimed_at = occurred_at;
    }
    if (action === 'start' && !ticket.first_response_at) ticket.first_response_at = occurred_at;
    if (action === 'resolve') {
      ticket.resolution = payload.resolution.trim();
      ticket.resolution_code = payload.resolution_code;
      ticket.resolved_at = occurred_at;
      if (payload.human_correction !== undefined) {
        ticket.human_correction = JSON.parse(JSON.stringify(payload.human_correction));
      }
    }
    if (action === 'close') ticket.closed_at = occurred_at;
    const activity = { ticket_id: t.id, actor_id: payload.actor_id, action,
      from_status: status, to_status: ticket.status, occurred_at };
    return { ok: true, ticket, activity };
  }

  function conversationPatch(t, action, ctx = {}, cases = []) {
    if (typeof t.source_ref !== 'string') return null;
    const conversation = (ctx.conversations || []).find(item => item.id === t.source_ref);
    if (!conversation) return null;
    if (action === 'claim' || action === 'assign') return { id: conversation.id, status: 'frozen' };
    if (action !== 'resolve' || conversation.status !== 'frozen') return null;
    const held = cases.some(item => item.id !== t.id && item.source_ref === conversation.id &&
      unresolved(item) && (!!item.claimed_at || ['assigned', 'in_progress', 'waiting_student'].includes(item.status)));
    return held ? null : { id: conversation.id, status: 'active' };
  }

  FLC.cases = { offeringOf, groupOf, ccCounselor, visible, access, effectiveStatus,
    slaState, transition, conversationPatch };
})(window.FLC);
