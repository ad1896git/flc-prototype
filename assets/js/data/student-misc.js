window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const DAY = 86400000;
  const users = ['stu-01', 'stu-02', 'stu-03'];
  const iso = value => new Date(value).toISOString();
  const now = FLC.time.now();
  const notificationTypes = {
    booking_reminder: '预约提醒', task_published: '任务发布',
    case_progress: '工单进展', consent_version_updated: '同意版本更新'
  };
  const samples = [
    ['booking_reminder', '请留意预约签到窗口', '请在“我的预约”查看本人预约及签到窗口；到场后按页面提示签到。此通知为虚构演示。'],
    ['task_published', '示例课程已发布学习任务', '请前往“我的任务”查看任务要求、截止时间与 AI 边界等级。此通知为虚构演示。'],
    ['case_progress', '学习求助工单进展提醒', '提交求助后可查看处理进展。此处只演示通知内容，不代表有新的真实处理结果。'],
    ['consent_version_updated', '请关注同意范围版本更新', '同意范围更新后，请在“我的数据”查看当前版本说明，自主决定是否同意。此通知为虚构演示。']
  ];
  FLC.data = FLC.data || {};
  FLC.data.studentMisc = {
    notificationTypes,
    evidenceTypes: { kwl: 'KWL', progress: '进度', reflection: '反思', product: '作品' },
    progressLabels: { red: '红', yellow: '黄', green: '绿' },
    credentialStatuses: { valid: '有效', revoked: '已撤销' },
    notifications: users.flatMap(user => samples.map((sample, index) => ({
      id: 'notice-' + user + '-' + index, user_id: user, type: sample[0],
      title: sample[1], body: sample[2], created_at: iso(now - (index + 1) * 3600000)
    }))),
    credentials: users.flatMap(user => [
      { id: 'credential-' + user + '-valid', user_id: user, achievement_name: '学习空间协作实践',
        issuer: '未来学习中心（演示）', issued_at: iso(now - 7 * DAY), status: 'valid',
        description: '完成示例协作实践。仅作证书展示，不代表真实签发或设备使用资格。' },
      { id: 'credential-' + user + '-revoked', user_id: user, achievement_name: '学习规划体验',
        issuer: '未来学习中心（演示）', issued_at: iso(now - 30 * DAY), status: 'revoked',
        description: '已撤销的虚构样例，用于展示证书状态。' }
    ])
  };
  FLC.store.registerSeed('evidence_entries', function () {
    const now = FLC.time.now();
    return users.flatMap(user => {
      const common = { user_id: user, task_id: 'task-encouraged', created_at: iso(now - DAY) };
      return [
        { ...common, id: 'ev-' + user + '-kwl', type: 'kwl',
          k: '空间需要兼顾自习与讨论。', w: '如何减少两类活动的噪声干扰？', l: '可用分区和动线设计验证方案。' },
        ...['red', 'yellow', 'green'].map((color, index) => ({
          ...common, id: 'ev-' + user + '-' + color, type: 'progress', color,
          created_at: iso(now - (3 - index) * DAY),
          note: ['红：遇到困难，需要澄清约束。', '黄：正在完善布局方案。', '绿：已完成方案并核验。'][index]
        })),
        { ...common, id: 'ev-' + user + '-reflection', type: 'reflection',
          content: '下次先访谈不同使用者，再比较分区方案。' },
        { ...common, id: 'ev-' + user + '-product', type: 'product', title: '学习空间布局草案',
          description: '虚构作品摘要：分区平面图与无障碍动线说明，无附件。' }
      ];
    });
  });
})(window.FLC);
