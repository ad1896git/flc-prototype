window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'teacher/briefing.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const account = FLC.guard.currentAccount();
    const escape = FLC.util.escapeHtml;
    const view = document.getElementById('misc-view');
    const data = FLC.data.teacherMisc;
    const offerings = account.roles.filter(role => role.role === 'teacher' && role.scope_type === 'course_offering').map(role => role.scope_id);
    const briefings = data.briefingRaw.filter(item => item.teacher_id === account.id && offerings.includes(item.offering_id));
    function metrics(rows) {
      const summary = FLC.teacherMisc.briefingSummary(rows, data.config.minN);
      const hidden = '小样本抑制（人数少于 ' + escape(data.config.minN) + '）';
      return '<div class="misc-metrics"><div class="misc-card"><h3>提交率</h3><p>' +
        (summary.suppressed ? hidden : escape((summary.submission_rate * 100).toFixed(1)) + '%') +
        '</p></div><div class="misc-card"><h3>平均提示层级</h3><p>' +
        (summary.suppressed ? hidden : summary.average_hint === null ? '暂无提示数据' : escape(summary.average_hint.toFixed(1))) +
        '</p></div><div class="misc-card"><h3>“我不同意”最多的回答 Top 3</h3>' +
        (summary.suppressed ? '<p>' + hidden + '</p>' : summary.top3.length ? '<ol>' +
          summary.top3.map(item => '<li>' + escape(item.content) + '（' + escape(item.count) + ' 次）</li>').join('') + '</ol>' : '<p>暂无异议记录</p>') + '</div></div>';
    }
    function students(rows) {
      return '<h3>学生学习摘要（假名）</h3><div class="misc-table-wrap"><table class="misc-table"><thead><tr><th scope="col">学生假名</th>' +
        '<th scope="col">提交情况</th><th scope="col">学习提示摘要</th></tr></thead><tbody>' +
        rows.map(row => '<tr><th scope="row"><code>' + escape(row.student) + '</code></th><td>' + (row.submitted ? '已提交' : '尚未提交') + '</td><td>' +
          (row.messages.length ? row.messages.map(message => '<p>' + escape(message.content) + '</p>').join('') : '暂无可展示的学习消息') + '</td></tr>').join('') +
        '</tbody></table></div>';
    }
    function render() {
      const op = window.location.hash === '#op';
      const id = FLC.util.param('id');
      const selected = id ? briefings.find(item => item.id === id) : briefings[0];
      const note = '<p class="misc-notice">' + escape(FLC.ui.pseudoNote('analytics')) + '</p>';
      if (op && !selected) {
        view.innerHTML = '<p>简报不存在或不在本人教学班作用域内。</p><a href="briefing.html">返回简报列表</a>'; return;
      }
      view.innerHTML = '<p class="misc-intro">示例课程 · 仅教师本人可见。静态演示数据，不用于评分或预警决定。危机消息不进入简报和指标。</p>' + note +
        (op ? '<a href="briefing.html">返回简报列表</a>' : '') +
        (op ? [selected] : briefings).map(item => {
          const rows = FLC.teacherMisc.briefingRows(item.students);
          return '<section class="misc-card"' + (op ? ' id="op"' : '') + '><h2>' + escape(item.title) + '</h2>' +
            metrics(rows) + (op ? '<h3>简报详情</h3><p>本周建议：通过课堂讨论了解共性难点，结合提交内容提供个别反馈。少于 10 人的班级不生成聚合结论。</p>' : '') +
            students(rows) + (op ? '' : '<p><a href="?id=' + escape(encodeURIComponent(item.id)) + '#op">查看简报详情</a></p>') + '</section>';
        }).join('') + (!briefings.length ? '<p>当前教学班暂无简报。</p>' : '');
    }
    window.addEventListener('hashchange', render);
    render();
  });
})(window.FLC);
