window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    if (FLC.guard.decide('student/task.html', FLC.guard.currentAccount()).action !== 'allow') return;
    const account = FLC.guard.currentAccount();
    const root = document.getElementById('task-detail');
    const esc = FLC.util.escapeHtml;
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('id');
    const task = FLC.store.collection('tasks').get(taskId);
    const enrolled = task && FLC.SEED.enrollments.some(enrollment => enrollment.user_id === account.id &&
      enrollment.offering_id === task.offering_id && enrollment.role === 'learner' && enrollment.status === 'active');
    if (!task || task.status !== 'published' || !enrolled) {
      root.textContent = taskId ? '任务不存在、未发布或不在本人选课教学班中。' : '请从我的任务选择要查看的任务。';
      return;
    }
    const icap = { active: '主动', constructive: '建构', interactive: '互动' };
    const evidence = { start: '起点', process: '过程', product: '成果', reflection: '反思', ai_use: 'AI 使用声明' };
    const label = (labels, code) => esc(labels[code] || code) + ' <small class="flc-code">' + esc(code) + '</small>';
    const list = (values, labels) => values.length ? '<ul>' + values.map(value => '<li>' + label(labels, value) + '</li>').join('') + '</ul>' : '<p>未设置</p>';
    const forbidden = task.ai_boundary === 'forbidden';
    const problems = (task.problems || []).slice().sort((a, b) => a.seq - b.seq);
    let handle = null, selectedId = null;
    document.querySelector('main > h1').textContent = task.title;
    root.innerHTML = '<section class="flc-card task-description" aria-label="任务说明">' +
      FLC.boundary.badgeHtml(task.ai_boundary, { taskId: task.id }) +
      '<h2>任务说明</h2><p class="task-text">' + esc(task.description || '暂无说明') + '</p>' +
      '<h3>ICAP 层级</h3><p>' + label(icap, task.icap_target) + '</p>' +
      '<h3>可观察产出</h3><p class="task-text">' + esc(task.observable_output) + '</p>' +
      '<h3>证据要求</h3>' + list(task.evidence_required || [], evidence) +
      '<h3>允许的提交形式</h3>' + list(task.alt_submission_formats && task.alt_submission_formats.length ?
        task.alt_submission_formats : ['report'], FLC.submission.LABELS.formats) + '</section>' +
      '<section class="flc-card task-problems" aria-label="任务题目"><h2>题目</h2>' +
      (problems.length > 1 ? '<div class="task-problem-picker" role="group" aria-label="切换题目">' + problems.map(problem =>
        '<button type="button" class="flc-secondary" data-problem="' + esc(problem.id) + '" aria-pressed="false">第 ' +
        esc(problem.seq) + ' 题</button>').join('') + '</div>' : '') +
      '<div id="task-problem" aria-live="polite"></div></section>' +
      (forbidden ? '<section class="flc-card"><h2>本任务禁止使用 AI</h2><p>请独立完成全部题目。</p>' +
        '<a href="help.html">需要帮助？前往求助</a></section>' :
        (problems.length ? '<section aria-label="本题内嵌学伴"><h2>本题学伴</h2><div id="task-companion"></div></section>' : '')) +
      '<p class="task-submit-link"><a class="flc-button" href="submit.html?task=' + esc(encodeURIComponent(task.id)) + '">去提交</a></p>';
    FLC.boundary.bind(root);
    function selectProblem(id) {
      const problem = problems.find(item => item.id === id) || problems[0];
      if (!problem) {
        document.getElementById('task-problem').textContent = '暂无题目。';
        return;
      }
      if (selectedId === problem.id) return;
      if (handle) { handle.destroy(); handle = null; }
      selectedId = problem.id;
      document.getElementById('task-problem').innerHTML = '<h3>第 ' + esc(problem.seq) +
        ' 题</h3><p class="task-text">' + esc(problem.stem) + '</p>';
      root.querySelectorAll('[data-problem]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.problem === problem.id));
      });
      const url = new URL(window.location.href);
      url.searchParams.set('problem', problem.id);
      window.history.replaceState(null, '', url.href);
      if (!forbidden) handle = FLC.companionUI.mount(document.getElementById('task-companion'), {
        taskId: task.id, problemId: problem.id, embedded: true
      });
    }
    root.addEventListener('click', function (event) {
      const button = event.target.closest('button[data-problem]');
      if (button && root.contains(button)) selectProblem(button.dataset.problem);
    });
    selectProblem(params.get('problem'));
    window.addEventListener('pagehide', function () {
      if (handle) { handle.destroy(); handle = null; }
    });
    window.addEventListener('pageshow', function (event) {
      if (event.persisted) window.location.reload();
    });
  });
})(window.FLC);
