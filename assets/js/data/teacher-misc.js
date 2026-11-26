window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const day = 86400000;
  const iso = offset => new Date(FLC.time.now() + offset * day).toISOString();
  const config = { minN: 10, sensitiveDecisionSlaDays: 3 }; // 【建议值】原型未实现工作日历。
  function drafts() {
    return [
      ['draft-feedback', 'feedback', 'generated', '你已清楚列出假设，建议补充推导中各变量的单位。'],
      ['draft-variant', 'variant', 'edited', '将原题中的初始速度改为 2 m/s，请解释模型假设并验证结果。'],
      ['draft-published', 'feedback', 'published', '推理步骤完整，请补充一个反例检查适用边界。'],
      ['draft-discarded', 'variant', 'discarded', '此变式与课程目标不一致，已丢弃。'],
      ['draft-digest', 'digest', 'generated', '本教学班人数不足 10 人，聚合统计已抑制。建议通过课堂讨论收集共性问题。']
    ].map(([id, kind, status, content]) => ({
      id, kind, teacher_id: 'tch-01', offering_id: 'off-demo',
      task_id: kind === 'digest' ? null : 'task-encouraged',
      submission_id: kind === 'feedback' ? (id === 'draft-published' ? 'submission-misc-published' : 'submission-misc-feedback') : null,
      draft_enc: content, model_alias: 'demo-ta', policy_snapshot: { ai_boundary: 'encouraged', score_enabled: false },
      status, published_content_enc: status === 'published' ? content : null,
      published_by: status === 'published' ? 'tch-01' : null, published_at: status === 'published' ? iso(-1) : null,
      reviewed_confirmed: status === 'published', edit_distance: status === 'edited' ? 0.2 : 0
    }));
  }
  const briefingRaw = [{ id: 'briefing-demo', offering_id: 'off-demo', teacher_id: 'tch-01',
    title: '示例课程 · 本周学情简报', students: [
      { user_id: 'stu-01', submitted: true, messages: [
        { content: '先说明假设，再列出变量之间的关系。', hint_level: 1, disagree_count: 3, sensitivity: 'normal' },
        { content: 'CRISIS_ONLY_DEMO：这条危机消息绝不能进入学情简报。', hint_level: 3, disagree_count: 999, sensitivity: 'crisis' }
      ] },
      { user_id: 'stu-02', submitted: true, messages: [
        { content: '检查边界条件是否满足，再比较两种解法。', hint_level: 2, disagree_count: 2, sensitivity: 'normal' }
      ] },
      { user_id: 'stu-03', submitted: false, messages: [
        { content: '使用单位分析检查表达式。', hint_level: 1, disagree_count: 1, sensitivity: 'normal' }
      ] }
    ] }];
  function alerts() {
    return [
      { id: 'alert-risk', student_id: 'stu-01', kind: 'risk', source: 'model', raised_by: null,
        model_version: 'demo-ew-v1', score: 0.72, cohort: 'off-demo', top_factors: ['近期任务提交减少'],
        note: '虚构学业关注示例，不是真实预测。', urgency: 'high', state: 'pending_review' },
      { id: 'alert-concern', student_id: 'stu-03', kind: 'concern', source: 'staff', raised_by: 'tch-01',
        model_version: null, score: null, cohort: 'off-demo', top_factors: ['任务尚未提交'],
        note: '建议了解学习支持需求。', urgency: 'low', state: 'pending_review' },
      { id: 'alert-kudos', student_id: 'stu-02', kind: 'kudos', source: 'staff', raised_by: 'tch-01',
        model_version: null, score: null, cohort: 'off-demo', top_factors: ['主动分享解题思路'],
        note: '正向认可示例。', urgency: 'low', state: 'confirmed' }
    ].map(alert => ({ ...alert, group_id: 'group-demo', reviewer_id: alert.state === 'confirmed' ? 'csl-01' : null,
      review_reason: alert.state === 'confirmed' ? '已核实课堂表现' : null,
      reviewed_at: alert.state === 'confirmed' ? iso(-1) : null, case_ticket_id: null }));
  }
  function certs() {
    return [
      { id: 'cert-center-active', user_id: 'stu-01', node_id: 'node-center', cert_code: 'laser_basic', issued_by: 'eqt-01', issued_at: iso(-30), expires_at: iso(335), revoked_at: null, revoke_reason: null },
      { id: 'cert-center-expired', user_id: 'stu-02', node_id: 'node-center', cert_code: 'laser_basic', issued_by: 'eqt-01', issued_at: iso(-400), expires_at: iso(-35), revoked_at: null, revoke_reason: null },
      { id: 'cert-center-revoked', user_id: 'stu-03', node_id: 'node-center', cert_code: 'laser_basic', issued_by: 'eqt-01', issued_at: iso(-30), expires_at: iso(335), revoked_at: iso(-1), revoke_reason: '演示：需重新培训' },
      { id: 'cert-college-active', user_id: 'stu-02', node_id: 'node-college', cert_code: 'laser_basic', issued_by: 'college-tech-demo', issued_at: iso(-20), expires_at: iso(345), revoked_at: null, revoke_reason: null }
    ];
  }
  FLC.data = FLC.data || {};
  FLC.data.teacherMisc = { config, drafts, briefingRaw, alerts, certs };
  FLC.store.registerSeed('ta_draft', drafts);
  FLC.store.registerSeed('ew_alert', alerts);
  FLC.store.registerSeed('user_cert', certs);
})(window.FLC);
