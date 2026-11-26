window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const day = 24 * 60 * 60 * 1000;
  const date = ms => new Date(ms).toISOString().slice(0, 10);
  const config = { minN: 10 }; // 建议值：小样本披露阈值。
  const fairnessRows = [
    { dimension: 'college', label: '示例学院甲', cells: {
      usage_rate: { n: 120, value: 0.72 }, fpr: { n: 60, value: 0.08 }, fnr: { n: 32, value: 0.12 } } },
    { dimension: 'college', label: '示例学院乙', cells: {
      usage_rate: { n: 90, value: 0.65 }, fpr: { n: 54, value: 0.1 }, fnr: { n: 31, value: 0.15 } } },
    { dimension: 'college', label: '示例学院丙', cells: {
      usage_rate: { n: 8, value: 0.5 }, fpr: { n: 6, value: 0.17 }, fnr: { n: 2, value: 0.5 } } }
  ];
  const auditSamples = ['stu-01', 'stu-02', 'stu-03'].map(id => ({
    analytics_pseudo: FLC.pseudo(id, 'analytics'), note: '虚构演示样本，不用于计算分群指标'
  }));

  function fairness_reports() {
    return [{ id: 'fairness-demo', created_at: new Date(FLC.time.now() - day).toISOString(),
      status: 'completed', note: '演示报告；未执行统计检验' }];
  }

  function experiments() {
    const now = FLC.time.now();
    const approval = protocol_id => ({ id: 'ethics-' + protocol_id, approval_no: 'DEMO-ETHICS-' + protocol_id,
      protocol_id, valid_from: date(now - 30 * day), valid_to: date(now + 90 * day) });
    const assignedIds = ['stu-01', 'stu-02', 'stu-03'].sort((a, b) => {
      const left = FLC.pseudo('assigned-demo-v1|' + a, 'analytics');
      const right = FLC.pseudo('assigned-demo-v1|' + b, 'analytics');
      return left < right ? -1 : left > right ? 1 : a < b ? -1 : a > b ? 1 : 0;
    });
    return [
      { id: 'exp-no-ethics', title: '待伦理审批的学习支持实验', protocol_id: 'protocol-pending-v1',
        design: 'parallel_rct', unit: 'student', strata: [], seed: 'pending-demo-v1',
        status: 'planned', ethics_approval: null, randomized: false, assignments: [] },
      { id: 'exp-ready', title: '学习支持实验（可分配）', protocol_id: 'protocol-ready-v1',
        design: 'parallel_rct', unit: 'student', strata: [], seed: 'ready-demo-v1',
        status: 'planned', ethics_approval: approval('protocol-ready-v1'), randomized: false, assignments: [] },
      { id: 'exp-assigned', title: '学习支持实验（已分配）', protocol_id: 'protocol-assigned-v1',
        design: 'parallel_rct', unit: 'student', strata: [], seed: 'assigned-demo-v1',
        status: 'running', ethics_approval: approval('protocol-assigned-v1'), randomized: true,
        assignments: assignedIds.map((id, i) => ({
          analytics_pseudo: FLC.pseudo(id, 'analytics'), arm: i % 2 ? 'B' : 'A'
        })) }
    ];
  }

  // Codes and names are verbatim from design §6.18.1; only aggregates enter cockpitValues.
  const catalog = [
    { code: 'space.cross_college_user_rate', name: '跨学院使用者覆盖率', unit: '%',
      definition: '当期在“非本院节点”有签到记录的学生数 ÷ 当期活跃学生数',
      def_version: 1, dimensions: ['campus'], quality: 'A' },
    { code: 'learn.active_task_coverage', name: '主动学习任务覆盖率', unit: '%',
      definition: '有任务设计卡、ICAP ≥ active 的已发布任务 ÷ 试点课程已发布任务',
      def_version: 1, dimensions: ['college'], quality: 'A' },
    { code: 'ai.declaration_rate', name: 'AI 使用声明提交率', unit: '%',
      definition: '有声明的提交 ÷ 要求声明的提交', def_version: 1, dimensions: ['college'], quality: 'A' }
  ];
  const period = date(FLC.time.now()).slice(0, 7);
  const previous = new Date(FLC.time.now());
  previous.setUTCDate(1);
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  const previousPeriod = date(previous.getTime()).slice(0, 7);
  const cockpitValues = [
    ['space.cross_college_user_rate', period, { campus: '犀浦校区' }, 120, 0.62],
    ['space.cross_college_user_rate', period, { campus: '九里校区' }, 80, 0.58],
    ['space.cross_college_user_rate', period, { campus: '峨眉校区' }, 8, 0.5],
    ['learn.active_task_coverage', period, { college: '示例学院甲' }, 120, 0.75],
    ['learn.active_task_coverage', period, { college: '示例学院乙' }, 90, 0.68],
    ['learn.active_task_coverage', period, { college: '示例学院丙' }, 7, 0.57],
    ['ai.declaration_rate', previousPeriod, { college: '示例学院甲' }, 120, 0.83],
    ['ai.declaration_rate', previousPeriod, { college: '示例学院乙' }, 90, 0.8],
    ['ai.declaration_rate', period, { college: '示例学院甲' }, 125, 0.9],
    ['ai.declaration_rate', period, { college: '示例学院乙' }, 95, 0.86]
  ].map(([metric_code, period, dims, n, value]) => ({ metric_code, def_version: 1, period, dims, n, value, quality: 'A' }));
  const questions = [
    { id: 'q-cross-campus', text: '各校区跨学院使用者覆盖率是多少？', metric_code: 'space.cross_college_user_rate' },
    { id: 'q-active-college', text: '各学院主动学习任务覆盖率是多少？', metric_code: 'learn.active_task_coverage' },
    { id: 'q-declaration-trend', text: '各学院 AI 使用声明提交率趋势如何？', metric_code: 'ai.declaration_rate' },
    { id: 'q-outside', text: '列出某学院成绩最差的 10 名学生', metric_code: null }
  ];

  FLC.data = FLC.data || {};
  FLC.data.analytics = { config, fairnessRows, auditSamples, fairness_reports, experiments,
    catalog, cockpitValues, questions };
  FLC.store.registerSeed('fairness_reports', fairness_reports);
  FLC.store.registerSeed('experiments', experiments);
})(window.FLC);
