window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const data = FLC.data.utilization;
  const percent = value => value == null ? '不适用' : (value * 100).toFixed(1) + '%';
  const utilization = result => result['space.utilization'] == null ? result.quality : percent(result['space.utilization']);
  const ratio = (row, source) => row.available_minutes > 0 ? row.source_minutes[source] / row.available_minutes : null;
  const zone = row => FLC.adminSpace.ZONE_LABELS[row.zone_type] || row.zone_type;
  const nodeName = (nodes, id) => (nodes.find(node => node.id === id) || {}).name || id;
  function date(value) {
    const d = new Date(value);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function select(account, nodes, rows, nodeId, from, to) {
    const ids = FLC.adminSpace.visibleNodes(account, nodes).map(node => node.id);
    return rows.filter(row => ids.includes(row.node_id) && (!nodeId || row.node_id === nodeId) &&
      (!from || Date.parse(row.from) >= from) && (!to || Date.parse(row.to) <= to));
  }
  function deadText(row, history) {
    return history.filter(item => item.node_id === row.node_id && item.zone_type === row.zone_type).map(item =>
      '星期' + item.weekday + ' ' + item.hour + ':00 ' + percent(item.utilization) +
      '（连续' + item.consecutive_months + '个月，独立历史演示快照）').join('；') || '无历史数据';
  }
  function csv(rows, nodes, history) {
    const header = ['节点（node_id）', '空间类型（zone_type）', '快照开始（from）', '快照结束，不含（to）',
      '使用频率（f）', '占用率（o）', '利用率（space.utilization）',
      '预约填充率（space.booking_fill_rate）', '爽约率（space.no_show_rate）',
      '可开放分钟（A）', '使用分钟（U）', '可开放时段定义（open_hours_definition）',
      '传感器占比（sensor）', '签到占比（checkin）', '缺测比例（missing）',
      '数据质量（quality）', '口径版本（metric_version）', '死时间（dead_time，独立历史快照）', '演示数据（demo）'];
    const lines = rows.map(row => {
      const r = data.calculate(row);
      return [nodeName(nodes, row.node_id) + ' (' + row.node_id + ')', zone(row) + ' (' + row.zone_type + ')',
        row.from, row.to, r.quality === '不开放' ? '不开放' : percent(r.frequency),
        r.quality === '不开放' ? '不开放' : percent(r.occupancy), utilization(r),
        percent(r['space.booking_fill_rate']), percent(r['space.no_show_rate']), row.available_minutes,
        row.used_minutes, row.open_hours_definition, percent(ratio(row, 'sensor')), percent(ratio(row, 'checkin')),
        percent(r.missing_rate), r.quality, row.metric_version, deadText(row, history || []), '是'];
    });
    function cell(value) {
      let text = String(value == null ? '' : value);
      if (/^\s*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return '\uFEFF' + [header, ...lines].map(line => line.map(cell).join(',')).join('\r\n') + '\r\n';
  }
  FLC.data.utilReport = { csv, select };

  document.addEventListener('DOMContentLoaded', function () {
    const path = 'admin/utilization.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const $ = id => document.getElementById(id);
    const esc = FLC.util.escapeHtml;
    const current = () => FLC.guard.currentAccount();
    const nodes = () => FLC.adminSpace.visibleNodes(current(), FLC.data.spaces.nodes);
    const visibleRows = () => select(current(), FLC.data.spaces.nodes, data.rows);
    const label = row => nodeName(nodes(), row.node_id) + ' / ' + zone(row);
    const th = value => '<th scope="col">' + esc(value) + '</th>';
    const td = value => '<td>' + esc(value) + '</td>';
    function wrapTable(title, head, body) {
      return '<div class="flc-table-wrap" role="region" tabindex="0" aria-label="' + esc(title) +
        '"><table><caption>' + esc(title) + '</caption><thead><tr>' + head +
        '</tr></thead><tbody>' + body + '</tbody></table></div>';
    }
    function table(rows) {
      const headings = ['节点 / 空间类型', '使用频率 f', '占用率 o', ...data.metrics.map(m => m.name + ' (' + m.code + ')'),
        '来源构成 / 缺测比例', '开放定义 / 版本 / 质量'];
      const body = rows.map(row => {
        const r = data.calculate(row);
        return '<tr><th scope="row">' + esc(label(row)) + '<small><code>' + esc(row.zone_type) + '</code></small></th>' +
          td(r.quality === '不开放' ? '不开放' : percent(r.frequency)) +
          td(r.quality === '不开放' ? '不开放' : percent(r.occupancy)) + td(utilization(r)) +
          td(percent(r['space.booking_fill_rate'])) + td(percent(r['space.no_show_rate'])) +
          td('传感器 ' + percent(ratio(row, 'sensor')) + ' / 签到 ' + percent(ratio(row, 'checkin')) +
            ' / 缺测 ' + percent(r.missing_rate)) +
          td(row.open_hours_definition + '；' + row.metric_version + '；' + r.quality) + '</tr>';
      }).join('');
      $('report-table').innerHTML = wrapTable('按节点 / 空间类型的利用率表（演示周快照）',
        headings.map(th).join(''), body || '<tr><td colspan="8">暂无可见报表数据。</td></tr>');
    }
    function chart(rows) {
      if (!rows.length) { $('report-chart').textContent = '暂无可见报表数据。'; return; }
      const height = rows.length * 64 + 75;
      const bars = rows.map((row, i) => {
        const r = data.calculate(row), value = r['space.utilization'];
        const y = 42 + i * 64;
        return '<text x="12" y="' + (y + 20) + '" font-size="13">' + esc(label(row)) + '</text>' +
          (value == null ? '' : '<rect x="270" y="' + y + '" width="' + (value * 320) +
            '" height="30" fill="#155c86"/>') +
          '<text x="' + (value == null ? 275 : 278 + value * 320) + '" y="' + (y + 20) +
          '" font-size="13">' + esc(utilization(r)) + '</text>';
      }).join('');
      $('report-chart').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="util-chart-title" ' +
        'viewBox="0 0 720 ' + height + '"><title id="util-chart-title">各节点与空间类型利用率（演示），数值另见数据表</title>' +
        '<g fill="#172b40"><text x="270" y="22">0%</text><text x="420" y="22">50%</text>' +
        '<text x="575" y="22">100%</text>' + bars + '</g></svg>';
    }
    function deadTime(rows) {
      const threshold = data.dead_time_threshold;
      $('dead-threshold').textContent = '标记阈值：连续 ' + threshold.months + ' 个月利用率低于 ' +
        percent(threshold.utilization) + '【建议值】；每个格子同时显示数值与文字标记。';
      $('dead-time').innerHTML = rows.map(row => {
        const history = data.deadTime.filter(item => item.node_id === row.node_id && item.zone_type === row.zone_type);
        const hours = [...new Set(history.map(item => item.hour))].sort((a, b) => a - b);
        if (!hours.length) return '<p>' + esc(label(row)) + '：无历史数据。</p>';
        const body = hours.map(hour => '<tr><th scope="row">' + hour + ':00</th>' +
          [1, 2, 3, 4, 5, 6, 7].map(day => {
            const item = history.find(h => h.weekday === day && h.hour === hour);
            if (!item) return td('—');
            const low = item.consecutive_months >= threshold.months && item.utilization < threshold.utilization;
            return '<td' + (low ? ' class="ur-low"' : '') + '>' + esc(percent(item.utilization)) +
              '<small>' + esc('连续' + item.consecutive_months + '个月' + (low ? ' · 死时间' : '')) + '</small></td>';
          }).join('') + '</tr>').join('');
        return '<div class="ur-heat">' + wrapTable(label(row) + '（历史演示）', th('小时 / 星期') +
          ['一', '二', '三', '四', '五', '六', '日'].map(th).join(''), body) + '</div>';
      }).join('') || '<p>暂无可见历史数据。</p>';
    }
    function render() {
      const allowed = nodes(), rows = visibleRows();
      $('report-scope').textContent = '你的管理范围：' + (allowed.map(n => n.name).join('、') || '无可见节点') +
        (current().roles.some(r => r.role === 'center_admin' && r.scope_type === 'global') ? '（global 作用域）' : '（space_node 作用域）');
      $('report-window').textContent = rows.length ? '演示周快照：' + date(rows[0].from) + ' 至 ' +
        date(new Date(Date.parse(rows[0].to) - 1)) + '（含两日）。' : '暂无完整周快照。';
      table(rows); chart(rows); deadTime(rows);
      $('export-node').innerHTML = '<option value="">全部有权节点</option>' + allowed.map(n =>
        '<option value="' + esc(n.id) + '">' + esc(n.name) + '</option>').join('');
      if (rows.length) {
        $('export-from').value = date(Math.min(...rows.map(r => Date.parse(r.from))));
        $('export-to').value = date(Math.max(...rows.map(r => Date.parse(r.to))) - 1);
      }
    }
    $('report-formulas').innerHTML = '<ul>' + [...Object.values(data.formulas),
      ...data.metrics.map(m => m.name + ' (' + m.code + ')：' + m.formula)].map(text => '<li>' + esc(text) + '</li>').join('') + '</ul>';
    function switchView(showTable) {
      $('report-table').hidden = !showTable;
      $('report-chart').hidden = showTable;
      $('show-chart').setAttribute('aria-pressed', String(!showTable));
      $('show-table').setAttribute('aria-pressed', String(showTable));
    }
    $('show-chart').addEventListener('click', () => switchView(false));
    $('show-table').addEventListener('click', () => switchView(true));
    function route() {
      if (FLC.guard.decide(path, current()).action !== 'allow') {
        $('report-list').hidden = true; $('op').hidden = true;
        $('report-scope').textContent = '当前账号无权查看利用率报表，请切换角色。';
        return;
      }
      render();
      const op = window.location.hash === '#op';
      const id = new URLSearchParams(window.location.search).get('id');
      const denied = Boolean(id && !nodes().some(n => n.id === id));
      $('report-list').hidden = op; $('op').hidden = !op;
      $('export-denied').hidden = !denied;
      $('export-form').hidden = denied || nodes().length === 0;
      $('export-status').textContent = '';
      if (id && !denied) $('export-node').value = id;
      if (op) $('op-title').focus();
    }
    $('export-form').addEventListener('submit', event => {
      event.preventDefault();
      const account = current(), nodeId = $('export-node').value;
      const allowed = FLC.adminSpace.visibleNodes(account, FLC.data.spaces.nodes);
      if (FLC.guard.decide(path, account).action !== 'allow' || !allowed.length ||
          (nodeId && !allowed.some(n => n.id === nodeId))) {
        route(); $('export-status').textContent = '无权管理该节点'; return;
      }
      const start = $('export-from').value, end = $('export-to').value;
      const from = new Date(start + 'T00:00:00'), to = new Date(end + 'T00:00:00');
      to.setDate(to.getDate() + 1);
      const invalid = !Number.isFinite(+from) || !Number.isFinite(+to) || +from >= +to;
      ['export-from', 'export-to'].forEach(id => $(id).setAttribute('aria-invalid', String(invalid)));
      if (invalid) { $('export-status').textContent = '请选择有效日期，结束日期不得早于开始日期。'; return; }
      const rows = select(account, FLC.data.spaces.nodes, data.rows, nodeId, +from, +to);
      if (!rows.length) { $('export-status').textContent = '所选范围内没有完整周快照，请调整时间范围。'; return; }
      const blob = new Blob([csv(rows, allowed, data.deadTime)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'flc-utilization-' + start + '-' + end + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      $('export-status').textContent = '已生成 CSV，共 ' + rows.length + ' 行演示周快照。';
    });
    window.addEventListener('hashchange', route);
    window.addEventListener('storage', event => { if (event.key === 'flc.account' || event.key === null) route(); });
    route();
  });
})(window.FLC);
