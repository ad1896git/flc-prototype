window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    if (FLC.guard.decide('student/companion.html', FLC.guard.currentAccount()).action !== 'allow') return;
    const escape = FLC.util.escapeHtml;
    const account = FLC.guard.currentAccount();
    const params = new URLSearchParams(window.location.search);
    const tasks = FLC.store.collection('tasks');
    const root = document.getElementById('companion-root');
    const picker = document.getElementById('companion-picker');
    let mounted = null;
    const requested = params.get('conv');
    const conversation = requested && FLC.store.collection('conversations').get(requested);
    function error(text) {
      root.textContent = text;
    }
    if (requested && (!conversation || conversation.user_id !== account.id)) {
      error('会话不存在或无权访问。请返回演示任务列表。');
      return;
    }
    const taskId = conversation ? conversation.task_id : params.get('task');
    if (!taskId) {
      picker.innerHTML = '<h2>选择一个演示任务</h2><div class="companion-task-grid">' +
        ['task-forbidden', 'task-restricted', 'task-encouraged', 'task-open'].map(id => {
          const task = tasks.get(id);
          if (!task) return '';
          return '<article class="flc-card"><h3><a href="?task=' + escape(encodeURIComponent(task.id)) + '">' +
            escape(task.title) + '</a></h3>' + FLC.boundary.badgeHtml(task.ai_boundary, { taskId: task.id }) +
            '<p>' + escape(task.description) + '</p></article>';
        }).join('') + '</div><p>限制级：演示学生甲的会话已由老师接手；可用演示学生乙体验正常引导。</p>';
      FLC.boundary.bind(picker);
      return;
    }
    const task = tasks.get(taskId);
    if (!task || !task.problems.length) { error('任务不存在或暂无题目。'); return; }
    const problemId = conversation ? conversation.problem_id : params.get('problem') || task.problems[0].id;
    if (!task.problems.some(problem => problem.id === problemId)) { error('题目不存在，请返回任务列表。'); return; }
    function openProblem(id, convId) {
      if (mounted) mounted.destroy();
      if (task.problems.length > 1) {
        picker.innerHTML = '<nav class="companion-actions" aria-label="切换题目">' + task.problems.map(problem =>
          '<button type="button" class="flc-secondary" data-problem="' + escape(problem.id) + '" aria-pressed="' +
          String(problem.id === id) + '">第 ' + escape(problem.seq) + ' 题</button>').join('') + '</nav>';
      }
      mounted = FLC.companionUI.mount(root, { taskId: task.id, problemId: id, embedded: false, convId });
    }
    picker.addEventListener('click', event => {
      const button = event.target.closest('[data-problem]');
      if (!button) return;
      const id = button.dataset.problem;
      window.history.replaceState(null, '', '?task=' + encodeURIComponent(task.id) + '&problem=' + encodeURIComponent(id));
      openProblem(id);
      const selected = Array.from(picker.querySelectorAll('[data-problem]')).find(item => item.dataset.problem === id);
      if (selected) selected.focus();
    });
    openProblem(problemId, requested || undefined);
    window.addEventListener('pagehide', function () { if (mounted) mounted.destroy(); });
  });
})(window.FLC);
