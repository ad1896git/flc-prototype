window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'admin/experiments.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const esc = FLC.util.escapeHtml;
    const experiments = FLC.store.collection('experiments');
    const list = document.getElementById('list-view');
    const op = document.getElementById('op');
    const status = document.getElementById('analytics-status');
    const labels = { planned: '计划中', running: '运行中', paused: '已暂停', ended: '已结束', aborted: '已中止' };
    const errors = { EXPERIMENT_ETHICS_REQUIRED: '缺少绑定当前协议且在有效期内的伦理审批号，不能分配。',
      EXPERIMENT_ALREADY_RANDOMIZED: '该实验已分配，结果不可修改，不能重复分配。', FORBIDDEN: '当前账号无权执行分配。' };
    const href = id => '?id=' + encodeURIComponent(id) + '#op';
    function render() {
      const records = experiments.list();
      const isOp = location.hash === '#op';
      list.hidden = isOp;
      op.hidden = !isOp;
      list.innerHTML = '<h2>实验列表</h2><div class="flc-table-wrap"><table><thead><tr><th>名称</th><th>状态</th><th>伦理审批号</th><th>分组</th></tr></thead><tbody>' +
        records.map(row => '<tr><td><a href="' + esc(href(row.id)) + '">' + esc(row.title) + '</a></td><td>' +
          esc(labels[row.status] || row.status) + ' <code>' + esc(row.status) + '</code></td><td>' +
          esc(row.ethics_approval ? row.ethics_approval.approval_no : '未审批') + '</td><td>' +
          esc(row.randomized ? '已分配：A 实验组 / B 对照组' : '尚未分配') + '</td></tr>').join('') + '</tbody></table></div>';
      if (!isOp) return;
      const selected = FLC.util.param('id');
      const exp = selected ? experiments.get(selected) : records[0];
      op.innerHTML = '<div class="flc-actions"><a href="experiments.html">返回列表</a></div><h2>执行随机分配</h2>';
      if (!exp) { op.innerHTML += '<p>未找到指定实验。</p>'; return; }
      const approval = exp.ethics_approval;
      op.innerHTML += '<h3>' + esc(exp.title) + '</h3><dl><dt>协议版本</dt><dd><code>' + esc(exp.protocol_id) + '</code></dd>' +
        '<dt>伦理审批号</dt><dd>' + esc(approval ? approval.approval_no : '未审批') + '</dd><dt>审批有效期</dt><dd>' +
        esc(approval ? approval.valid_from + ' 至 ' + approval.valid_to : '—') + '</dd><dt>随机种子 / 设计 / 单位</dt><dd><code>' +
        esc(exp.seed + ' / ' + exp.design + ' / ' + exp.unit) + '</code></dd></dl>' +
        '<p>固定演示前提：3 位虚构参与者均已同意研究；不执行真实同意核验。A 为实验组，B 为对照组；分配不自动启动实验。</p>' +
        '<button id="randomize" type="button" aria-describedby="assignment-result">执行随机分配</button>' +
        '<p id="assignment-result" role="status" aria-live="polite"></p><h3>分配结果</h3><p>' + esc(FLC.ui.pseudoNote('analytics')) + '</p>' +
        (exp.assignments.length ? '<table><thead><tr><th>analytics 假名</th><th>分组</th></tr></thead><tbody>' + exp.assignments.map(row =>
          '<tr><td><code>' + esc(row.analytics_pseudo) + '</code></td><td>' + esc(row.arm === 'A' ? '实验组 A' : '对照组 B') + '</td></tr>').join('') +
          '</tbody></table>' : '<p>尚无分配结果。</p>');
      document.getElementById('randomize').addEventListener('click', function () {
        const account = FLC.guard.currentAccount();
        const current = experiments.get(exp.id);
        const result = FLC.guard.decide(path, account).action === 'allow' && current ?
          FLC.analytics.randomize(current, ['stu-01', 'stu-02', 'stu-03']) : { ok: false, code: 'FORBIDDEN' };
        if (!result.ok) {
          document.getElementById('assignment-result').textContent = (errors[result.code] || '分配失败。') + ' ' + result.code;
          return;
        }
        experiments.upsert(result.record);
        FLC.audit.log({ actor_id: account.id, action: 'experiment.randomize', target: current.id, note: '固定演示研究参与者分配' });
        status.textContent = '分配成功，结果已保存，刷新后仍可查看。';
        render();
      });
    }
    window.addEventListener('hashchange', render);
    render();
  });
})(window.FLC);
