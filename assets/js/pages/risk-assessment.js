window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'admin/risk-assessment.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const uses = FLC.store.collection('ai_use_registry');
    const assessments = FLC.store.collection('ai_risk_assessment');
    const list = document.getElementById('governance-list');
    const op = document.getElementById('op');
    const status = document.getElementById('governance-status');
    const esc = FLC.util.escapeHtml;
    const labels = { prohibited: '禁止', high: '高风险', medium: '中风险', low: '低风险', draft: '草稿',
      submitted: '已提交', approved: '已批准', rejected: '已驳回', revoked: '已撤销', expired: '已过期' };
    const label = code => FLC.ui.codeLabel(labels[code] || code, code);
    const href = id => '?id=' + encodeURIComponent(id) + '#op';
    const period = record => (record.valid_from || '—') + ' → ' + (record.valid_to || '—');
    const field = (title, name, value) => '<label for="risk-' + name + '">' + esc(title) + '</label><input id="risk-' + name +
      '" readonly value="' + esc(value == null ? '—' : value) + '">';
    function render(selectedId) {
      const id = FLC.util.param('id');
      const showOp = location.hash === '#op' && !!id;
      list.hidden = showOp;
      op.hidden = !showOp;
      if (!showOp) {
        list.innerHTML = '<div class="flc-table-wrap"><table class="governance-table"><caption>AI 用途登记与评估</caption>' +
          '<thead><tr><th>用途编码 use_code</th><th>名称</th><th>风险等级 risk_level</th><th>评估状态 / 有效期</th></tr></thead><tbody>' +
          uses.list().map(use => {
            const related = assessments.list().filter(record => record.use_code === use.use_code);
            return '<tr data-id="' + esc(use.id) + '"><td><a href="' + esc(href(use.id)) + '">' + esc(use.use_code) +
              '</a></td><td>' + esc(use.description) + '</td><td>' + label(use.risk_level) + '</td><td>' +
              (related.map(record => '<p>' + label(record.status) + '<small>' + esc(record.id) + '<br>' + esc(period(record)) + '</small></p>').join('') || '暂无评估') + '</td></tr>';
          }).join('') + '</tbody></table></div>';
        return;
      }
      const use = uses.get(id);
      op.innerHTML = '<a href="risk-assessment.html">返回列表</a>';
      if (!use) { op.innerHTML += '<p class="flc-alert">未找到该 AI 用途。</p>'; return; }
      const related = assessments.list().filter(record => record.use_code === use.use_code);
      const assessment = related.find(record => record.id === selectedId) || related.find(record => record.status === 'submitted') || related[related.length - 1];
      const actions = FLC.governance.riskActions(FLC.guard.currentAccount(), assessment);
      op.innerHTML += '<h2>' + esc(use.description) + '</h2><p><code>' + esc(use.use_code) + '</code> · ' + label(use.risk_level) + '</p>' +
        '<div class="flc-card"><h3>启用检查</h3><p>用途级检查演示；高风险用途须有已批准且在有效期内的评估。</p>' +
        '<button id="enable-use" type="button" aria-describedby="enable-result">启用</button><p id="enable-result" role="status" aria-live="polite"></p></div>';
      if (!assessment) { op.innerHTML += '<p class="flc-alert">此用途暂无风险评估。</p>'; return; }
      op.innerHTML += '<form id="risk-review-form" class="flc-card governance-form" novalidate><h3>风险评估表（材料只读）</h3>' +
        '<label for="assessment-select">选择评估</label><select id="assessment-select">' + related.map(record => '<option value="' + esc(record.id) + '"' +
          (record.id === assessment.id ? ' selected' : '') + '>' + esc(record.id + ' · ' + labels[record.status] + ' (' + record.status + ')') + '</option>').join('') + '</select>' +
        '<p>评估状态：' + label(assessment.status) + '</p><div class="governance-details"><div>' +
        field('主体类型 subject_type', 'subject-type', assessment.subject_type) + field('主体引用 subject_ref', 'subject-ref', assessment.subject_ref) +
        field('主体哈希 subject_hash', 'subject-hash', assessment.subject_hash) + field('模板版本 prompt_template_version', 'template', assessment.prompt_template_version) +
        field('材料 assessment_doc_key', 'doc', assessment.assessment_doc_key) + '</div><div>' +
        field('有效期起 valid_from', 'from', assessment.valid_from) + field('有效期止 valid_to', 'to', assessment.valid_to) +
        '<label for="risk-scope">范围 scope</label><textarea id="risk-scope" readonly>' + esc(JSON.stringify(assessment.scope, null, 2)) + '</textarea>' +
        field('批准时间 approved_at', 'approved-at', assessment.approved_at) + field('审批人数 approver_count', 'count', assessment.approver_count) + '</div></div>' +
        '<p>既有审批意见：' + esc(assessment.ethics_opinion || '—') + '</p>' +
        (actions.length ? '<label for="risk-comment">审批意见（必填）</label><textarea id="risk-comment" required aria-describedby="risk-error"></textarea>' +
          '<p id="risk-error" class="governance-error" role="alert"></p><div class="flc-actions">' + actions.map(action =>
            '<button type="submit" name="action" value="' + esc(action) + '">' + (action === 'approve' ? '批准' : '驳回') + '</button>').join('') + '</div>' :
          '<p class="flc-alert">当前账号在此状态没有可执行的审批操作。</p>') + '</form>';
      document.getElementById('assessment-select').addEventListener('change', event => render(event.target.value));
      document.getElementById('risk-review-form').addEventListener('submit', function (event) {
        event.preventDefault();
        const account = FLC.guard.currentAccount();
        const current = assessments.get(assessment.id);
        const action = event.submitter && event.submitter.value;
        const comment = document.getElementById('risk-comment');
        const error = document.getElementById('risk-error');
        let result;
        if (FLC.guard.decide(path, account).action !== 'allow' || !FLC.governance.riskActions(account, current).includes(action)) {
          result = { ok: false, code: 'FORBIDDEN' };
        } else if (!comment || !comment.value.trim()) result = { ok: false, code: 'COMMENT_REQUIRED' };
        else result = FLC.governance.reviewRisk(account, current, action, comment.value);
        if (!result.ok) {
          const message = ({ FORBIDDEN: '权限或评估状态已变化，请返回列表。', COMMENT_REQUIRED: '请填写审批意见。',
            VALIDATION_ERROR: '材料、主体哈希或有效期无效，无法批准。' }[result.code] || '提交失败。') + ' ' + result.code;
          if (error) error.textContent = message;
          else status.textContent = message;
          if (comment) { comment.setAttribute('aria-invalid', String(result.code === 'COMMENT_REQUIRED')); comment.focus(); }
          return;
        }
        assessments.upsert(result.record);
        FLC.audit.log({ actor_id: account.id, action: 'risk.' + action, target: current.id, note: comment.value.trim() });
        status.textContent = '已保存评估审批结果：' + labels[result.record.status] + '。';
        render(current.id);
      });
    }
    op.addEventListener('click', function (event) {
        if (!event.target.closest('#enable-use')) return;
        const id = FLC.util.param('id');
        const account = FLC.guard.currentAccount();
        const result = FLC.guard.decide(path, account).action === 'allow' ?
          FLC.governance.canEnable(uses.get(id), assessments.list()) : { ok: false, code: 'FORBIDDEN' };
        document.getElementById('enable-result').textContent = result.ok ? '检查通过：当前用途满足启用条件（演示）。' :
          ({ FEATURE_APPROVAL_REQUIRED: '不能启用：缺少已批准且未过期的评估。', FEATURE_PROHIBITED: '不能启用：禁止用途永远不可启用。',
            FORBIDDEN: '当前账号无权操作。' }[result.code] || '不能启用：数据无效。') + ' ' + result.code;
      });
    list.addEventListener('click', event => {
      const row = event.target.closest('tr[data-id]');
      if (row && !event.target.closest('a')) location.href = href(row.dataset.id);
    });
    window.addEventListener('hashchange', () => render());
    render();
  });
})(window.FLC);
