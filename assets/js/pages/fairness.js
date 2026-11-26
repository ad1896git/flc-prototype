window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'admin/fairness.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const esc = FLC.util.escapeHtml;
    const data = FLC.data.analytics;
    const reports = FLC.store.collection('fairness_reports');
    const list = document.getElementById('list-view');
    const op = document.getElementById('op');
    const status = document.getElementById('analytics-status');
    const metrics = [['usage_rate', '使用率'], ['fpr', '误报率'], ['fnr', '漏报率']];
    const href = id => '?id=' + encodeURIComponent(id) + '#op';
    const value = cell => cell.suppressed ? '样本过少，已抑制' :
      (cell.value * 100).toFixed(1) + '%（n=' + cell.n + '）';

    function snapshot(rows) {
      const safe = rows.map(row => ({ dimension: row.dimension, label: row.label, cells: {} }));
      metrics.forEach(([key]) => FLC.analytics.suppressCells(rows.map(row => row.cells[key]), data.config.minN)
        .forEach((cell, i) => { safe[i].cells[key] = cell; }));
      return safe;
    }
    function figures(rows) {
      return '<p>披露阈值 n ≥ ' + esc(data.config.minN) + '【建议值】；互补抑制同时隐藏另一格。统计检验门槛另见设计 §6.19.1。</p>' +
        '<div class="flc-table-wrap"><table><caption>分群指标（完整数据表）</caption><thead><tr><th>分群维度</th>' +
        metrics.map(([, name]) => '<th>' + esc(name) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(row =>
          '<tr><th scope="row">学院 <code>' + esc(row.dimension) + '</code> / ' + esc(row.label) + '</th>' +
          metrics.map(([key]) => '<td>' + esc(value(row.cells[key])) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
        metrics.map(([key, name]) => {
          const items = rows.map(row => Object.assign({ label: row.label }, row.cells[key],
            row.cells[key].suppressed ? {} : { value: Number((row.cells[key].value * 100).toFixed(1)) }));
          return '<section class="analytics-chart flc-card"><h3>' + esc(name) + '（%）</h3>' +
            '<div class="flc-actions"><button type="button" data-mode="plot" aria-pressed="true">图表</button>' +
            '<button type="button" data-mode="table" aria-pressed="false">数据表</button></div>' +
            '<div class="analytics-plot" data-panel="plot">' + FLC.analytics.barSvg(items) + '</div>' +
            '<div class="flc-table-wrap" data-panel="table" hidden><table><caption>' + esc(name) + '</caption>' +
            '<thead><tr><th>学院</th><th>比率与分母</th></tr></thead><tbody>' + rows.map(row =>
              '<tr><th scope="row">' + esc(row.label) + '</th><td>' + esc(value(row.cells[key])) + '</td></tr>').join('') +
            '</tbody></table></div></section>';
        }).join('');
    }
    function render() {
      const records = reports.list().slice().reverse();
      const isOp = location.hash === '#op';
      list.hidden = isOp;
      op.hidden = !isOp;
      const selected = FLC.util.param('id');
      const report = selected ? reports.get(selected) : records[0];
      list.innerHTML = '<div class="flc-actions"><a class="flc-button" href="#op">运行审计 / 查看明细</a></div>' +
        '<h2>最新分群快照</h2>' + figures(snapshot((records[0] && records[0].rows) || data.fairnessRows)) +
        '<h2>报告记录</h2><div class="flc-table-wrap"><table><thead><tr><th>报告</th><th>生成时间</th><th>状态</th><th>说明</th></tr></thead><tbody>' +
        records.map(row => '<tr><td><a href="' + esc(href(row.id)) + '">' + esc(row.id) + '</a></td><td>' +
          esc(row.created_at) + '</td><td>已完成 <code>' + esc(row.status) + '</code></td><td>' + esc(row.note) + '</td></tr>').join('') + '</tbody></table></div>';
      if (!isOp) return;
      const allowed = FLC.analytics.canRunAudit(FLC.guard.currentAccount());
      op.innerHTML = '<div class="flc-actions"><a href="fairness.html">返回列表</a></div><h2>运行审计</h2>' +
        '<p id="audit-permission">' + (allowed ? '数据管理员可生成一条演示审计报告。' : '当前账号只读，仅数据管理员 data_steward 可运行审计。') + '</p>' +
        '<button id="run-audit" type="button" aria-describedby="audit-permission"' + (allowed ? '' : ' disabled') + '>运行审计</button>' +
        (report ? '<h2>报告 ' + esc(report.id) + '</h2><p>' + esc(report.note) + '</p>' + figures(snapshot(report.rows || data.fairnessRows)) : '<p>未找到指定报告。</p>') +
        '<h2>明细样本（虚构）</h2><p>' + esc(FLC.ui.pseudoNote('analytics')) + '</p>' +
        '<table><thead><tr><th>analytics 假名</th><th>说明</th></tr></thead><tbody>' + data.auditSamples.map(row =>
          '<tr><td><code>' + esc(row.analytics_pseudo) + '</code></td><td>' + esc(row.note) + '</td></tr>').join('') + '</tbody></table>';
      document.getElementById('run-audit').addEventListener('click', function () {
        const account = FLC.guard.currentAccount();
        if (FLC.guard.decide(path, account).action !== 'allow' || !FLC.analytics.canRunAudit(account)) {
          status.textContent = '当前账号只读，不能运行审计。FORBIDDEN';
          return;
        }
        const result = FLC.analytics.runAudit(account);
        if (!result.ok) { status.textContent = result.code; return; }
        // Preserve every run even when the demo clock is fixed.
        const record = result.record;
        const base = record.id;
        let sequence = 1;
        while (reports.get(record.id)) record.id = base + '-' + sequence++;
        reports.upsert(record);
        FLC.audit.log({ actor_id: account.id, action: 'fair.audit.run', target: record.id, note: record.note });
        status.textContent = '审计完成，已新增报告记录。';
        location.href = href(record.id);
        render();
      });
    }
    document.querySelector('main').addEventListener('click', function (event) {
      const button = event.target.closest('button[data-mode]');
      if (!button) return;
      const chart = button.closest('.analytics-chart');
      chart.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== button.dataset.mode; });
      chart.querySelectorAll('[data-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    });
    window.addEventListener('hashchange', render);
    render();
  });
})(window.FLC);
