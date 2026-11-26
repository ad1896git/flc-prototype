window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    if (FLC.guard.decide('teacher/courses.html', FLC.guard.currentAccount()).action !== 'allow') return;
    const escape = FLC.util.escapeHtml;
    const account = FLC.guard.currentAccount();
    const offerings = FLC.data.teacher.offerings.filter(item => item.teacher_id === account.id);
    const tasks = FLC.store.collection('tasks');
    const kinds = { practice: '实践', homework: '作业', quiz: '小测', exam: '考试',
      no_tool_assessment: '无工具测验', project: '项目', reflection: '反思', thesis: '论文',
      thesis_raw_data: '论文原始数据', lab_report: '实验报告' };
    const statuses = { draft: '草稿', published: '已发布', closed: '已关闭' };
    const label = (text, code) => escape(text || code) + ' <small class="flc-code">' + escape(code) + '</small>';
    const date = value => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '未设置';
    function render() {
      document.getElementById('course-list').innerHTML = offerings.map(offering => {
        const rows = tasks.list().filter(task => task.offering_id === offering.id);
        const query = encodeURIComponent(offering.id);
        return '<section class="teacher-list-item"><h2>' + escape(offering.name) + '</h2><p class="teacher-meta">' +
          escape(offering.code) + ' · ' + rows.length + ' 项任务</p><div class="teacher-actions">' +
          '<a class="flc-button" href="task-editor.html?offering=' + query + '">新建任务设计卡</a>' +
          '<a href="evidence-timeline.html?offering=' + query + '">证据时间线</a>' +
          '<a href="companion-kb.html?id=' + query + '">学伴绑定与知识库</a></div>' +
          (rows.length ? '<ul class="teacher-task-list">' + rows.map(task =>
            '<li class="teacher-task-card"><h3>' + escape(task.title) + '</h3>' +
            FLC.boundary.badgeHtml(task.ai_boundary, { taskId: task.id }) +
            '<div class="kb-task-meta"><span>类型：' + label(kinds[task.task_kind], task.task_kind) +
            '</span><span class="teacher-status">' + label(statuses[task.status], task.status) +
            '</span><span>截止时间 <small class="flc-code">due_at</small>：' + escape(date(task.due_at)) +
            '</span></div><a href="task-editor.html?id=' + escape(encodeURIComponent(task.id)) +
            '">编辑<span class="kb-sr-only">：' + escape(task.title) + '</span></a></li>').join('') + '</ul>' :
            '<p>暂无任务，点击“新建任务设计卡”开始设计。</p>') + '</section>';
      }).join('') || '<p>暂无任课教学班。</p>';
    }
    FLC.boundary.bind(document.getElementById('course-list'));
    render();
    window.addEventListener('pageshow', render);
    window.addEventListener('storage', render);
  });
})(window.FLC);
