window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const offerings = [
    { id: 'off-demo', code: 'OFF-DEMO', course_id: 'course-demo', term_id: 'term-demo',
      campus_id: null, name: '示例课程', discipline: 'learning_design', college_id: 'college-demo',
      teacher_id: 'tch-01' },
    { id: 'off-demo-2', code: 'OFF-DEMO-2', course_id: 'course-demo-2', term_id: 'term-demo',
      campus_id: null, name: '工程研究方法（示例班）', discipline: 'engineering_research',
      college_id: 'college-demo-2', teacher_id: 'tch-01' }
  ];
  const floorRules = [
    { id: 'floor-thesis-raw-data', name: '论文原始数据禁止使用 AI（示例）',
      description: '论文原始数据类任务必须独立处理。', match: { task_kind: ['thesis_raw_data'] },
      max_level: 'forbidden', source_doc: '虚构演示清单，待学校确认', enabled: true, version: 1 },
    { id: 'floor-demo-discipline', name: '工程研究学科等级上限（示例）',
      description: '第二示例班的任务最高为限制级。', match: { discipline: ['engineering_research'] },
      max_level: 'restricted', source_doc: '虚构演示清单，待学校确认', enabled: true, version: 1 }
  ];
  const agents = [
    { id: 'agent-teacher-guide', name: '基础引导学伴', version: 1, published_version: 1,
      status: 'published', supported_boundaries: ['restricted'] },
    { id: 'agent-teacher-inquiry', name: '探究学习学伴', version: 2, published_version: 2,
      status: 'published', supported_boundaries: ['restricted', 'encouraged', 'open'] }
  ];
  const agentBindings = [
    { id: 'binding-demo-course', agent_id: 'agent-teacher-inquiry', version_pin: 2,
      offering_id: 'off-demo', task_id: null, enabled: true, bound_by: 'tch-01' },
    { id: 'binding-demo-2-course', agent_id: 'agent-teacher-guide', version_pin: 1,
      offering_id: 'off-demo-2', task_id: null, enabled: true, bound_by: 'tch-01' }
  ];
  const kbDocuments = [
    { id: 'kb-doc-demo-guide-v1', source_id: 'kb-source-demo-guide', kb_id: 'kb-demo',
      offering_id: 'off-demo', title: '示例课程学习指南', version: 1, source_type: 'upload',
      mime: 'application/pdf', license: 'own', rights_confirmed_by: 'tch-01',
      data_level: 1, status: 'ready' },
    { id: 'kb-doc-demo-2-method-v1', source_id: 'kb-source-demo-2-method', kb_id: 'kb-demo-2',
      offering_id: 'off-demo-2', title: '工程研究方法讲义（示例）', version: 1, source_type: 'upload',
      mime: 'application/pdf', license: 'school_licensed', rights_confirmed_by: 'tch-01',
      data_level: 1, status: 'ready' }
  ];
  const copy = value => JSON.parse(JSON.stringify(value));
  FLC.data = FLC.data || {};
  FLC.data.teacher = { offerings, floorRules, agents, agentBindings, kbDocuments };
  FLC.store.registerSeed('agent_binding', () => copy(agentBindings));
  FLC.store.registerSeed('kb_document', () => copy(kbDocuments));
})(window.FLC);
