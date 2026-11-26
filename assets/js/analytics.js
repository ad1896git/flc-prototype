window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const MIN_N = 10;
  const fail = code => ({ ok: false, code });
  const copy = value => JSON.parse(JSON.stringify(value));
  const text = value => typeof value === 'string' ? value.trim() : '';
  const threshold = minN => Number.isFinite(minN) && minN >= 0 ? minN : MIN_N;

  function suppress(cell, minN = MIN_N) {
    if (!cell || cell.suppressed || !Number.isFinite(cell.n) || cell.n < threshold(minN)) {
      return { suppressed: true };
    }
    return copy(cell);
  }

  // Call with one mutually exclusive row/column, excluding totals.
  function suppressCells(cells, minN = MIN_N) {
    const result = cells.map(cell => suppress(cell, minN));
    if (result.filter(cell => cell.suppressed).length === 1) {
      let next = -1;
      result.forEach((cell, index) => {
        if (!cell.suppressed && (next < 0 || cell.n < result[next].n)) next = index;
      });
      if (next >= 0) result[next] = { suppressed: true };
    }
    return result;
  }

  function canRunAudit(account) {
    return !!account && Array.isArray(account.roles) &&
      account.roles.some(entry => entry && entry.role === 'data_steward');
  }

  function runAudit(account) {
    if (!canRunAudit(account)) return fail('FORBIDDEN');
    const now = FLC.time.now();
    const data = FLC.data.analytics;
    const rows = data.fairnessRows.map(row => ({ dimension: row.dimension, label: row.label, cells: {} }));
    ['usage_rate', 'fpr', 'fnr'].forEach(key => {
      suppressCells(data.fairnessRows.map(row => row.cells[key]), data.config.minN)
        .forEach((cell, index) => { rows[index].cells[key] = cell; });
    });
    return { ok: true, record: { id: 'fairness-' + now, created_at: new Date(now).toISOString(),
      status: 'completed', note: '固定演示分群快照，未执行统计检验',
      rows } };
  }

  function validDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  }

  function canRandomize(exp) {
    if (exp && (exp.randomized || (Array.isArray(exp.assignments) && exp.assignments.length))) {
      return fail('EXPERIMENT_ALREADY_RANDOMIZED');
    }
    const approval = exp && exp.ethics_approval;
    const today = new Date(FLC.time.now()).toISOString().slice(0, 10);
    if (!approval || !text(approval.approval_no) || !text(approval.id) ||
        !text(exp.protocol_id) || approval.protocol_id !== exp.protocol_id ||
        !validDate(approval.valid_from) || !validDate(approval.valid_to) ||
        !(approval.valid_from < approval.valid_to && approval.valid_from <= today && today <= approval.valid_to)) {
      return fail('EXPERIMENT_ETHICS_REQUIRED');
    }
    return { ok: true };
  }

  function randomize(exp, studentIds) {
    const allowed = canRandomize(exp);
    if (!allowed.ok) return allowed;
    if (!text(exp.seed) || !Array.isArray(studentIds) || !studentIds.length ||
        studentIds.some(id => !text(id))) return fail('VALIDATION_ERROR');
    const ranked = Array.from(new Set(studentIds)).map(id => ({ id,
      rank: FLC.pseudo(exp.seed + '|' + id, 'analytics') }));
    const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
    ranked.sort((a, b) => compare(a.rank, b.rank) || compare(a.id, b.id));
    const record = copy(exp);
    record.assignments = ranked.map((entry, index) => ({
      analytics_pseudo: FLC.pseudo(entry.id, 'analytics'), arm: index % 2 ? 'B' : 'A'
    }));
    record.randomized = true;
    return { ok: true, record };
  }

  function answerQuery(questionId, catalog) {
    const data = FLC.data.analytics;
    const question = data.questions.find(entry => entry.id === questionId);
    const metric = question && question.metric_code && Array.isArray(catalog) &&
      catalog.find(entry => entry.code === question.metric_code);
    if (!metric) return { ok: false, message: '仅支持指标目录内的查询' };
    const rows = data.cockpitValues.filter(row => row.metric_code === metric.code);
    const periods = Array.from(new Set(rows.map(row => row.period)));
    const safe = [];
    periods.forEach(period => {
      const group = rows.filter(row => row.period === period);
      const cells = suppressCells(group, data.config.minN);
      group.forEach((row, i) => {
        const dims = {};
        ['campus', 'college'].forEach(key => {
          if (typeof row.dims[key] === 'string') dims[key] = row.dims[key];
        });
        const result = { metric_code: row.metric_code, period, dims, def_version: row.def_version,
          quality: row.quality, suppressed: !!cells[i].suppressed };
        if (!result.suppressed) { result.n = row.n; result.value = row.value; }
        safe.push(result);
      });
    });
    return { ok: true, metric: { code: metric.code, name: metric.name, definition: metric.definition }, rows: safe };
  }

  function chart(items, line) {
    const escape = FLC.util.escapeHtml;
    const cells = suppressCells(items, FLC.data && FLC.data.analytics && FLC.data.analytics.config.minN);
    const values = cells.filter(cell => !cell.suppressed && Number.isFinite(cell.value)).map(cell => Math.abs(cell.value));
    const scale = Math.max(1, ...values);
    const width = Math.max(360, items.length * 100 + 40);
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 ' + width + ' 260">' +
      '<title>' + escape(line ? '指标趋势图' : '分群指标图') + '</title>';
    let previous = null;
    cells.forEach((cell, index) => {
      const x = 50 + index * 100;
      svg += '<text x="' + x + '" y="240" text-anchor="middle">' + escape(items[index].label) + '</text>';
      if (cell.suppressed || !Number.isFinite(cell.value)) {
        svg += '<text x="' + x + '" y="220" text-anchor="middle">' + escape('样本过少，已抑制') + '</text>';
        previous = null;
        return;
      }
      const y = 110 - cell.value / scale * 80;
      if (line) {
        if (previous) svg += '<path d="M' + previous.x + ' ' + previous.y + ' L' + x + ' ' + y + '" stroke="currentColor" fill="none"/>';
        svg += '<circle cx="' + x + '" cy="' + y + '" r="4" fill="currentColor"/>';
        previous = { x, y };
      } else {
        svg += '<rect x="' + (x - 18) + '" y="' + Math.min(y, 110) + '" width="36" height="' + Math.abs(110 - y) + '" fill="currentColor"/>';
      }
      svg += '<text x="' + x + '" y="' + (y - 10) + '" text-anchor="middle">' + escape(cell.value) + '</text>';
    });
    return svg + '</svg>';
  }

  FLC.analytics = { MIN_N, suppress, suppressCells, canRunAudit, runAudit, canRandomize, randomize,
    answerQuery, barSvg: rows => chart(rows, false), lineSvg: points => chart(points, true) };
})(window.FLC);
