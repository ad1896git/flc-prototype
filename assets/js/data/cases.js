window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const DAY = 86400000;
  const config = { academicSlaDays: 2, sensitiveDecisionSlaDays: 3 }; // 【建议值】自然时间。
  const typeLabels = { crisis: '危机转介', distress: '个人求助', academic_help: '学业求助',
    low_confidence: '低置信度复核', sensitive_decision: '敏感决定复核',
    calibration_anomaly: '校准异常', ew_case: '预警案件', appeal: '申诉', data_right: '数据权利' };
  const statusLabels = { new: '待接手', assigned: '已接手', in_progress: '处理中',
    waiting_student: '等待学生', resolved: '已处置', closed: '已关闭', escalated: '已升级' };
  const resolutionLabels = { referred: '已转介', supported: '已提供支持', no_action: '无需进一步处理',
    corrected: '已更正', upheld: '维持原决定', overturned: '撤销原决定', fulfilled: '已履行', rejected: '已驳回' };
  const groupMembers = { 'group-demo': ['stu-01', 'stu-02', 'stu-03'] };

  function ensureDemoCases(collection, now) {
    const stamp = new Date(now).toISOString();
    const common = { subtype: null, subject_user_id: 'stu-01', source_ref: null,
      visibility: 'standard', status: 'new', created_at: stamp, claimed_at: null,
      assignee_id: null, resolution_code: null, resolution: null };
    const additions = [
      { ...common, id: 'case-academic-other', type: 'academic_help', priority: 'P2',
        offering_id: 'off-demo-2', assignee_role: 'teacher',
        summary: '演示：其他教学班的学业求助',
        payload_demo: '【虚构演示正文】另一教学班的学生申请学业支持。',
        sla_due_at: new Date(new Date(now).getTime() + config.academicSlaDays * DAY).toISOString() },
      { ...common, id: 'case-sd-other-group', type: 'sensitive_decision', priority: 'P1',
        group_id: 'group-other', assignee_role: 'counselor',
        summary: '演示：其他学生组的敏感决定复核',
        payload_demo: '【虚构演示正文】需由另一学生组的责任人复核后作出决定。',
        sla_due_at: new Date(new Date(now).getTime() + config.sensitiveDecisionSlaDays * DAY).toISOString() }
    ];
    const inserted = [];
    additions.forEach(ticket => {
      const existing = collection.list();
      if (existing.some(item => item.id === ticket.id)) return;
      const max = existing.reduce((value, item) => {
        const match = String(item.ticket_no || '').match(/^TK-\d{8}-(\d+)$/);
        return match ? Math.max(value, Number(match[1])) : value;
      }, 0);
      ticket.ticket_no = 'TK-' + stamp.slice(0, 10).replace(/-/g, '') + '-' +
        String(max + 1).padStart(6, '0');
      collection.upsert(ticket);
      inserted.push(ticket);
    });
    return inserted;
  }

  FLC.data = FLC.data || {};
  FLC.data.cases = { config, typeLabels, statusLabels, resolutionLabels, groupMembers, ensureDemoCases };
  FLC.store.registerSeed('case_activity', () => []);
})(window.FLC);
