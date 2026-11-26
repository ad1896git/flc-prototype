window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'admin/cockpit.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const esc = FLC.util.escapeHtml;
    const data = FLC.data.analytics;
    const list = document.getElementById('list-view');
    const op = document.getElementById('op');
    const account = FLC.guard.currentAccount();
    if (account.roles.some(entry => entry.role === 'leader')) {
      document.getElementById('page-note').textContent = '校院领导只看聚合指标，不能下钻到个人';
    }
    // Query the full partition before applying any display filter.
    const answers = data.questions.filter(q => q.metric_code).map(q => FLC.analytics.answerQuery(q.id, data.catalog));
    let campus = '';
    let college = '';
    let queryId = FLC.util.param('id') || data.questions[0].id;
    const displayValue = row => row.suppressed ? '样本过少，已抑制' : (row.value * 100).toFixed(1) + '%';
    const dimension = row => row.dims.campus || row.dims.college;
    const visible = row => (!campus || !row.dims.campus || row.dims.campus === campus) &&
      (!college || !row.dims.college || row.dims.college === college);
    function options(key, selected) {
      const values = Array.from(new Set(answers.flatMap(answer => answer.rows.map(row => row.dims[key])).filter(Boolean)));
      return '<option value="">全部</option>' + values.map(value => '<option value="' + esc(value) + '"' +
        (value === selected ? ' selected' : '') + '>' + esc(value) + '</option>').join('');
    }
    function figure(title, rows, line) {
      const items = rows.map(row => row.suppressed ? { label: line ? row.period : dimension(row), suppressed: true } :
        { label: line ? row.period : dimension(row), n: row.n, value: Number((row.value * 100).toFixed(1)) });
      return '<section class="analytics-chart flc-card"><h3>' + esc(title) + '（%）</h3>' +
        '<div class="flc-actions"><button type="button" data-mode="plot" aria-pressed="true">图表</button>' +
        '<button type="button" data-mode="table" aria-pressed="false">数据表</button></div>' +
        '<div class="analytics-plot" data-panel="plot">' + (line ? FLC.analytics.lineSvg(items) : FLC.analytics.barSvg(items)) + '</div>' +
        '<div class="flc-table-wrap" data-panel="table" hidden><table><caption>' + esc(title) + '</caption>' +
        '<thead><tr><th>期次</th><th>校区 / 学院</th><th>指标值</th><th>样本数</th><th>口径版本 / 质量</th></tr></thead><tbody>' +
        rows.map(row => '<tr><td>' + esc(row.period) + '</td><th scope="row">' + esc(dimension(row)) + '</th><td>' +
          esc(displayValue(row)) + '</td><td>' + esc(row.suppressed ? '已抑制' : row.n) + '</td><td>' +
          esc(row.def_version + ' / ' + row.quality) + '</td></tr>').join('') + '</tbody></table></div></section>';
    }
    function report(answer, cards, applyFilters = true) {
      const rows = answer.rows.filter(row => !applyFilters || visible(row));
      if (!rows.length) return '<p>当前筛选没有聚合数据。</p>';
      const latest = rows.map(row => row.period).sort().slice(-1)[0];
      const metric = answer.metric;
      const isTrend = metric.code === 'ai.declaration_rate';
      return '<h2>' + esc(metric.name) + '</h2><p><code>' + esc(metric.code) + '</code></p><p>口径：' + esc(metric.definition) + '</p>' +
        (cards ? '<div class="analytics-grid">' + rows.filter(row => row.period === latest).map(row =>
          '<article class="flc-card"><h3>' + esc(dimension(row)) + '</h3><p class="analytics-value' +
          (row.suppressed ? ' analytics-suppressed' : '') + '">' + esc(displayValue(row)) + '</p><p>' + esc(row.period) +
          ' · 口径 v' + esc(row.def_version) + ' · 质量 ' + esc(row.quality) + '</p></article>').join('') + '</div>' : '') +
        (isTrend ? Array.from(new Set(rows.map(dimension))).map(label =>
          figure(metric.name + ' · ' + label, rows.filter(row => dimension(row) === label).sort((a, b) => a.period.localeCompare(b.period)), true)).join('') :
          figure(metric.name, rows.filter(row => row.period === latest), false));
    }
    function render() {
      const isOp = location.hash === '#op';
      list.hidden = isOp;
      op.hidden = !isOp;
      list.innerHTML = '<div class="flc-actions"><a class="flc-button" href="#op">指标目录查询</a></div>' +
        '<div class="analytics-toolbar"><label>校区<select id="campus-filter">' + options('campus', campus) + '</select></label>' +
        '<label>学院<select id="college-filter">' + options('college', college) + '</select></label></div>' +
        '<p class="analytics-muted">筛选仅影响带该维度的指标。仅披露 n ≥ ' + esc(data.config.minN) +
        '【建议值】且通过互补抑制的结果；不展示总计。质量 A 表示系统自动采集（本页为虚构演示值）。</p>' +
        answers.map(answer => report(answer, true)).join('');
      ['campus', 'college'].forEach(key => document.getElementById(key + '-filter').addEventListener('change', function (event) {
        if (key === 'campus') campus = event.target.value;
        else college = event.target.value;
        render();
        document.getElementById(key + '-filter').focus();
      }));
      op.innerHTML = '<div class="flc-actions"><a href="cockpit.html">返回列表</a></div><h2>自然语言查询（预置示意）</h2>' +
        '<p>只能选择预置问题；目录外问题用于演示拒绝，不执行自由文本查询。结果采用完整聚合范围，列表筛选不影响此处。</p>' +
        '<form id="query-form"><label for="question">预置问题</label><div class="analytics-toolbar"><select id="question" aria-describedby="query-result">' +
        data.questions.map(q => '<option value="' + esc(q.id) + '"' + (q.id === queryId ? ' selected' : '') + '>' + esc(q.text) + '</option>').join('') +
        '</select><button type="submit">查询</button></div></form><p id="query-result" role="status" aria-live="polite"></p><div id="query-report"></div>';
      if (!data.questions.some(q => q.id === queryId)) {
        document.getElementById('question').selectedIndex = -1;
        document.getElementById('query-result').textContent = '未找到指定问题。仅支持指标目录内的查询';
      }
      document.getElementById('query-form').addEventListener('submit', function (event) {
        event.preventDefault();
        queryId = document.getElementById('question').value;
        const current = FLC.guard.currentAccount();
        const result = FLC.guard.decide(path, current).action === 'allow' ?
          FLC.analytics.answerQuery(queryId, data.catalog) : { ok: false, message: '当前账号无权查询。' };
        document.getElementById('query-result').textContent = result.ok ? '查询完成：仅返回指标目录内的聚合结果。' : result.message;
        document.getElementById('query-report').innerHTML = result.ok ? report(result, false, false) : '';
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
