window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  FLC.SEED = FLC.SEED || {};
  FLC.SEED.offerings = [{
    id: 'off-demo', code: 'OFF-DEMO', course_id: 'course-demo',
    term_id: 'term-demo', campus_id: null, name: '示例课程'
  }];
  FLC.SEED.enrollments = [
    { offering_id: 'off-demo', user_id: 'tch-01', role: 'instructor', status: 'active' },
    { offering_id: 'off-demo', user_id: 'stu-01', role: 'learner', status: 'active' },
    { offering_id: 'off-demo', user_id: 'stu-02', role: 'learner', status: 'active' },
    { offering_id: 'off-demo', user_id: 'stu-03', role: 'learner', status: 'active' }
  ];

  const MINUTE = 60 * 1000;
  const DAY = 24 * 60 * MINUTE;
  const iso = ms => new Date(ms).toISOString();
  // 演示 SLA 建议值，非工作日日历；详见 decisions/03.md。
  const slaRemaining = { crisis: 10 * MINUTE, distress: DAY, academic_help: 2 * DAY, data_right: 15 * DAY };

  FLC.store.registerSeed('tasks', function () {
    const now = FLC.time.now();
    const common = {
      offering_id: 'off-demo', open_at: iso(now - 7 * DAY), due_at: iso(now + 7 * DAY),
      status: 'published', policy_version: 1
    };
    return [
      {
        ...common, id: 'task-forbidden', title: '独立完成：无工具测验',
        description: '独立完成基础计算，不使用 AI 或其他工具，提交时承诺未使用 AI。',
        task_kind: 'no_tool_assessment', scene: 'self_study', icap_target: 'active',
        observable_output: '独立计算结果及推导过程', ai_boundary: 'forbidden', companion_mode: 'off',
        attempt_first: true, evidence_required: ['product'], alt_submission_formats: ['report'],
        problems: [{ id: 'task-forbidden-p1', seq: 1, problem_type: 'numeric', stem: '列车以每小时 60 千米的速度匀速行驶 1.5 小时，行驶距离为多少千米？写出计算过程。' }]
      },
      {
        ...common, id: 'task-restricted', title: '引导练习：校园通行方案',
        description: '先提出自己的设计，再使用学伴获取思路提示；不得索取完整成品，提交完整 AI 使用声明。',
        task_kind: 'homework', scene: 'guidance', icap_target: 'constructive',
        observable_output: '通行方案草图、方案依据及修订记录', ai_boundary: 'restricted', companion_mode: 'guide',
        attempt_first: true, evidence_required: ['start', 'process', 'product', 'ai_use'],
        alt_submission_formats: ['report', 'poster'],
        problems: [{ id: 'task-restricted-p1', seq: 1, problem_type: 'design', stem: '为校园道路交叉口设计一套行人与自行车通行方案。先写出使用者需求、约束和初步构想，再说明如何验证安全性。' }]
      },
      {
        ...common, id: 'task-encouraged', title: '合作探究：学习空间改进',
        description: '先记录个人构想，再与学伴通过追问检验方案；两道题分别开展对话，并提交完整 AI 使用声明。',
        task_kind: 'project', scene: 'collab', icap_target: 'interactive',
        observable_output: '空间改进方案及论证反思', ai_boundary: 'encouraged', companion_mode: 'socratic',
        attempt_first: true, evidence_required: ['start', 'process', 'product', 'reflection', 'ai_use'],
        alt_submission_formats: ['report', 'video', 'poster'],
        problems: [
          { id: 'task-encouraged-p1', seq: 1, problem_type: 'design', stem: '为同时支持个人自习和小组讨论的学习空间提出布局方案，说明噪声、动线及无障碍需求如何得到满足。' },
          { id: 'task-encouraged-p2', seq: 2, problem_type: 'essay', stem: '论证你提出的空间方案如何兼顾不同学习者，并说明一种可能的反对意见、你的回应及后续验证计划。' }
        ]
      },
      {
        ...common, id: 'task-open', title: '开放探索：学习工具创意',
        description: '可使用通用学伴探索创意，核验工具给出的信息，提交时填写 AI 使用简表。',
        task_kind: 'practice', scene: 'practice', icap_target: 'constructive',
        observable_output: '工具创意及可验证的使用示例', ai_boundary: 'open', companion_mode: 'general',
        attempt_first: false, evidence_required: ['product', 'ai_use'],
        alt_submission_formats: ['report', 'code', 'artifact', 'oral'],
        problems: [{ id: 'task-open-p1', seq: 1, problem_type: 'open_ended', stem: '构想一种帮助同学规划学习的工具，描述目标用户、核心功能及一个检验其效果的具体方法。' }]
      }
    ];
  });

  FLC.store.registerSeed('cases', function () {
    const now = FLC.time.now();
    const common = {
      subtype: null, status: 'new', claimed_at: null,
      resolution_code: null, resolution: null, created_at: iso(now - 5 * MINUTE)
    };
    const ticketDate = iso(now).slice(0, 10).replace(/-/g, '');
    return [
      {
        ...common, id: 'case-crisis-demo', ticket_no: 'TK-' + ticketDate + '-000001',
        type: 'crisis', priority: 'P0', subject_user_id: 'stu-03', source_ref: 'crisis-demo',
        summary: '演示：需要专业人员及时接洽的求助', visibility: 'restricted_psych',
        assignee_role: 'psych_staff', sla_due_at: iso(now + slaRemaining.crisis),
        payload_demo: '【虚构演示正文】学生希望尽快与专业值班人员联系，请按演示流程接洽。'
      },
      {
        ...common, id: 'case-distress-demo', ticket_no: 'TK-' + ticketDate + '-000002',
        type: 'distress', priority: 'P1', subject_user_id: 'stu-03', source_ref: 'distress-demo',
        summary: '演示：学生主动申请个人支持', visibility: 'restricted_psych',
        assignee_role: 'counselor', sla_due_at: iso(now + slaRemaining.distress),
        payload_demo: '【虚构演示正文】学生申请与辅导员预约交流近期学习与生活安排。'
      },
      {
        ...common, id: 'case-academic-demo', ticket_no: 'TK-' + ticketDate + '-000003',
        type: 'academic_help', priority: 'P2', subject_user_id: 'stu-01', source_ref: 'conv-frozen-demo',
        summary: '演示：教师已接手任务方案复核', visibility: 'standard', status: 'in_progress',
        assignee_role: 'teacher', assignee_id: 'tch-01', claimed_at: iso(now - MINUTE),
        sla_due_at: iso(now + slaRemaining.academic_help),
        payload_demo: '【虚构演示正文】学生请求教师复核校园通行方案的约束条件；关联会话自动回复已冻结。'
      },
      {
        ...common, id: 'case-academic-new', ticket_no: 'TK-' + ticketDate + '-000004',
        type: 'academic_help', priority: 'P2', subject_user_id: 'stu-02', source_ref: 'task-encouraged-p1',
        summary: '演示：待接单的学习空间方案求助', visibility: 'standard',
        assignee_role: 'teacher', created_at: iso(now - DAY), sla_due_at: iso(now + DAY),
        payload_demo: '【虚构演示正文】学生希望教师协助梳理空间布局方案的评价指标。'
      },
      {
        ...common, id: 'case-dataright-demo', ticket_no: 'TK-' + ticketDate + '-000005',
        type: 'data_right', priority: 'P2', subject_user_id: 'stu-01', source_ref: 'data-right-demo',
        summary: '演示：学生申请更正学习记录', visibility: 'standard',
        assignee_role: 'data_steward', sla_due_at: iso(now + slaRemaining.data_right),
        payload_demo: '【虚构演示正文】学生申请更正一条示例学习记录，请数据管理员核验后处理。'
      }
    ];
  });
})(window.FLC);
