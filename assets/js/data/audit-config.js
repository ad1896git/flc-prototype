window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  FLC.data = FLC.data || {};
  const now = FLC.time.now();
  function integer(key, value, group, description, min, unit) {
    return { key, value, group, description, value_type: 'integer', constraints: { min },
      unit, suggested: true, updated_by: null, updated_at: null };
  }
  FLC.data.auditConfig = {
    items: [
      integer('space.checkin.window_before_min', 15, 'business', '预约开始前签到窗口', 0, '分钟'),
      integer('space.checkin.window_after_min', 15, 'business', '预约开始后签到窗口（右端不含）', 0, '分钟'),
      integer('case.sla.crisis', 15, 'business', '危机工单接单时限，全天自然时间', 1, '分钟'),
      { key: 'crisis.companion_after_trigger', value: 'help_only', group: 'business',
        description: '由心理中心签发【待确认-X14】', readonly: true, value_type: 'string',
        constraints: { enum: ['help_only', 'continue_with_banner'] },
        suggested: true, updated_by: null, updated_at: null },
      integer('auth.login_fail_lock', 5, 'technical', '访客短信登录连续失败锁定次数', 1, '次'),
      integer('auth.lock_minutes', 15, 'technical', '访客短信登录失败锁定时长', 1, '分钟'),
      integer('auth.idle_timeout_minutes', 30, 'technical', '会话空闲超时', 1, '分钟')
    ],
    auditSeed: [
      { id: 'audit-seed-config', occurred_at: new Date(now - 60 * 60000).toISOString(),
        actor_id: 'ctr-01', actor_role: 'center_admin', action: 'config.update',
        target: 'space.checkin.window_before_min', note: '演示：确认签到窗口建议值', result: 'success' },
      { id: 'audit-seed-view', occurred_at: new Date(now - 40 * 60000).toISOString(),
        actor_id: 'tch-01', actor_role: 'teacher', action: 'companion.view_student_conv',
        target: 'conv-frozen-demo', note: '演示：接管工单后查看会话', result: 'success' },
      { id: 'audit-seed-case', occurred_at: new Date(now - 20 * 60000).toISOString(),
        actor_id: 'psy-01', actor_role: 'psych_staff', action: 'case.claim',
        target: 'case-crisis-demo', note: '演示：心理中心接收危机转介', result: 'success' },
      { id: 'audit-seed-denied', occurred_at: new Date(now - 10 * 60000).toISOString(),
        actor_id: 'eth-01', actor_role: 'ethics_member', action: 'idmap.lookup',
        target: 'lookup-demo', note: '演示：未提供身份查询审批单', result: 'denied' }
    ]
  };
})(window.FLC);
