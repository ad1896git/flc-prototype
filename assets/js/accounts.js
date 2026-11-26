window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  FLC.ROLE_NAMES = {
    student: '学生',
    peer_mentor: '朋辈导师',
    teacher: '教师',
    counselor: '辅导员',
    psych_staff: '心理中心人员',
    space_admin: '空间管理员',
    equipment_tech: '设备技术员',
    agent_reviewer: '智能体审核员',
    ethics_member: '伦理委员会成员',
    data_steward: '数据管理员',
    center_admin: '中心管理员',
    sys_admin: '系统管理员',
    auditor: '审计员',
    leader: '校院领导'
  };

  function role(code, scope_type = 'global', scope_id = null, scope_name = '全局') {
    return { role: code, scope_type, scope_id, scope_name };
  }

  FLC.ACCOUNTS = [
    {
      id: 'stu-01', name: '演示学生甲', title: '普通学生',
      roles: [role('student')], landing: 'student/portal.html'
    },
    {
      id: 'stu-02', name: '演示学生乙', title: '朋辈导师',
      roles: [role('student'), role('peer_mentor')], landing: 'student/portal.html'
    },
    {
      id: 'stu-03', name: '演示学生丙', title: '处于 no-show 禁用期的学生（演示预约拒绝）',
      roles: [role('student')], landing: 'student/space-search.html'
    },
    {
      id: 'tch-01', name: '演示教师甲', title: '教师',
      roles: [role('teacher', 'course_offering', 'off-demo', '示例课程')],
      landing: 'teacher/courses.html'
    },
    {
      id: 'csl-01', name: '演示辅导员甲', title: '辅导员',
      roles: [role('counselor', 'student_group', 'group-demo', '示例学生组')],
      landing: 'teacher/cases.html'
    },
    {
      id: 'psy-01', name: '演示心理人员甲', title: '心理中心人员',
      roles: [role('psych_staff')], landing: 'teacher/cases.html'
    },
    {
      id: 'spa-01', name: '演示空间管理员甲', title: '院级节点空间管理员',
      roles: [role('space_admin', 'space_node', 'node-college', '某学院节点')],
      landing: 'admin/spaces.html'
    },
    {
      id: 'eqt-01', name: '演示技术员甲', title: '设备技术员',
      roles: [role('equipment_tech', 'space_node', 'node-center', '中心节点')],
      landing: 'teacher/cert-issue.html'
    },
    {
      id: 'agr-01', name: '演示审核员甲', title: '智能体审核员',
      roles: [role('agent_reviewer')], landing: 'admin/agent-review.html'
    },
    {
      id: 'eth-01', name: '演示伦理委员甲', title: '伦理委员会成员',
      roles: [role('ethics_member')], landing: 'admin/agent-review.html'
    },
    {
      id: 'dst-01', name: '演示数据管理员甲', title: '数据管理员',
      roles: [role('data_steward')], landing: 'admin/data-catalog.html'
    },
    {
      id: 'ctr-01', name: '演示中心管理员甲', title: '中心管理员',
      roles: [role('center_admin')], landing: 'admin/spaces.html'
    },
    {
      id: 'sys-01', name: '演示系统管理员甲', title: '系统管理员',
      roles: [role('sys_admin')], landing: 'admin/config.html'
    },
    {
      id: 'aud-01', name: '演示审计员甲', title: '审计员',
      roles: [role('auditor')], landing: 'admin/audit.html'
    },
    {
      id: 'ldr-01', name: '演示领导甲', title: '校院领导',
      roles: [role('leader')], landing: 'admin/cockpit.html'
    }
  ];
})(window.FLC);
