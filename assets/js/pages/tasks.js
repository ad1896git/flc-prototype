window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    if (FLC.guard.decide('student/tasks.html', FLC.guard.currentAccount()).action !== 'allow') return;
    const root = document.getElementById('tasks-list');
    const esc = FLC.util.escapeHtml;
    const kinds = { practice: '实践', homework: '作业', quiz: '小测', exam: '考试', no_tool_assessment: '无工具测验',
      project: '项目', reflection: '反思', thesis: '论文', thesis_raw_data: '论文原始数据', lab_report: '实验报告' };
    function render() {
      const account = FLC.guard.currentAccount();
      if (FLC.guard.decide('student/tasks.html', account).action !== 'allow') return;
      const offerings = new Set(FLC.SEED.enrollments.filter(enrollment => enrollment.user_id === account.id &&
        enrollment.role === 'learner' && enrollment.status === 'active').map(enrollment => enrollment.offering_id));
      const tasks = FLC.store.collection('tasks').list().filter(task =>
        task.status === 'published' && offerings.has(task.offering_id));
      const submissions = FLC.store.collection('submissions').list();
      root.innerHTML = tasks.map(task => {
        const latest = FLC.submission.latest(submissions, account.id, task.id);
        return '<article class="flc-card task-card"><h2><a href="task.html?id=' + esc(encodeURIComponent(task.id)) + '">' +
          esc(task.title) + '</a></h2><p class="task-meta">任务类型：' + esc(kinds[task.task_kind] || task.task_kind) +
          ' <small class="flc-code">' + esc(task.task_kind) + '</small></p><p class="task-meta">截止时间：' +
          (task.due_at ? '<time datetime="' + esc(task.due_at) + '">' +
            esc(FLC.ui.shortTime(task.due_at)) + '</time>' : '未设置截止时间') +
          '</p><div class="task-card-foot">' + FLC.boundary.badgeHtml(task.ai_boundary, { taskId: task.id }) +
          '<span class="flc-chip' + (latest ? ' task-chip-done' : '') + '">' + (latest ? '已提交 第 ' + esc(latest.version) + ' 版' : '未提交') + '</span></div></article>';
      }).join('') || '<p role="status">暂无已发布任务。</p>';
    }
    FLC.boundary.bind(root);
    render();
    window.addEventListener('pageshow', render);
  });
})(window.FLC);
