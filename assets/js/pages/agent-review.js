window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'admin/agent-review.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const records = FLC.store.collection('agent_version');
    const list = document.getElementById('governance-list');
    const op = document.getElementById('op');
    const status = document.getElementById('governance-status');
    const esc = FLC.util.escapeHtml;
    const labels = { draft: '草稿', published: '已发布', suspended: '已暂停', retired: '已退役',
      submitted: '已提交', tech_review: '技术审核', ethics_review: '伦理审议', approved: '已通过',
      rejected: '已驳回', changes_requested: '待修改', prohibited: '禁止', high: '高风险', medium: '中风险', low: '低风险',
      restricted: '限制', encouraged: '鼓励', open: '开放', forbidden: '禁止' };
    const label = code => FLC.ui.codeLabel(labels[code] || code, code);
    const detail = (title, value) => '<div><dt>' + esc(title) + '</dt><dd>' + esc(value || '—') + '</dd></div>';
    const href = id => '?id=' + encodeURIComponent(id) + '#op';
    function actionLabel(record, action) {
      if (action === 'publish') return '上架';
      if (action === 'request_changes') return '技术审核退回';
      if (action === 'reject') return '伦理审议驳回';
      return record.review_state === 'tech_review' ? '技术审核通过' : '伦理审议通过';
    }
    function render() {
      const id = FLC.util.param('id');
      const showOp = location.hash === '#op' && !!id;
      list.hidden = showOp;
      op.hidden = !showOp;
      if (!showOp) {
        list.innerHTML = '<div class="flc-table-wrap"><table class="governance-table"><caption>智能体版本（含已结束审核）</caption>' +
          '<thead><tr><th>名称 / 版本</th><th>提交人</th><th>支持边界 supported_boundaries</th><th>风险等级</th><th>状态</th><th>审核阶段</th></tr></thead><tbody>' +
          records.list().map(record => '<tr data-id="' + esc(record.id) + '"><td><a href="' + esc(href(record.id)) + '">' +
            esc(record.card.name) + ' · v' + esc(record.version) + '</a></td><td>' + esc(record.card.owner.user_id) + '</td><td>' +
            record.card.supported_boundaries.map(label).join(' / ') + '</td><td>' + label(record.risk_level) + '</td><td>' +
            label(record.status) + '</td><td>' + label(record.review_state) + '</td></tr>').join('') + '</tbody></table></div>';
        return;
      }
      const record = records.get(id);
      op.innerHTML = '<a href="agent-review.html">返回列表</a>';
      if (!record) { op.innerHTML += '<p class="flc-alert">未找到该智能体版本。</p>'; return; }
      const card = record.card;
      const actions = FLC.governance.agentActions(FLC.guard.currentAccount(), record);
      op.innerHTML += '<h2>' + esc(card.name) + ' · v' + esc(record.version) + '</h2><p>' + label(record.status) +
        ' / ' + label(record.review_state) + ' / ' + label(record.risk_level) + '</p><div class="flc-card"><h3>智能体卡片</h3>' +
        '<dl class="governance-details">' + detail('用途 purpose', card.purpose) + detail('用途编码 use_code', record.use_code) +
        detail('提交人 owner.user_id', card.owner.user_id) + detail('类型 agent_kind', card.agent_kind) +
        detail('模型 model_alias', card.model_alias) + detail('提交时间 submitted_at', record.submitted_at) +
        detail('支持边界 supported_boundaries', card.supported_boundaries.map(code => (labels[code] || code) + ' (' + code + ')').join(' / ')) +
        detail('风险评估 risk_assessment_id', record.risk_assessment_id) +
        detail('面向校外 public_facing', card.public_facing ? '是' : '否') + detail('无障碍检查 a11y_checked', card.a11y_checked ? '已检查' : '未检查') + '</dl></div>' +
        (actions.length ? '<form id="agent-review-form" class="flc-card governance-form" novalidate><label for="review-comment">审核意见（必填）</label>' +
          '<textarea id="review-comment" required aria-describedby="review-error"></textarea><p id="review-error" class="governance-error" role="alert"></p>' +
          '<div class="flc-actions">' + actions.map(action => '<button type="submit" name="action" value="' + esc(action) + '">' +
            esc(actionLabel(record, action)) + '</button>').join('') + '</div></form>' : '<p class="flc-alert">当前账号在此阶段没有可执行的审核操作。</p>') +
        '<div class="governance-history"><h3>审核记录</h3>' + ((record.reviews || []).map(review => '<p>' +
          esc(review.stage + ' / ' + review.decision + ' · ' + review.reviewer_id + ' · ' + review.decided_at) + '<br>' + esc(review.comment) + '</p>').join('') || '<p>暂无人工审核记录。</p>') + '</div>';
      const form = document.getElementById('agent-review-form');
      if (form) form.addEventListener('submit', function (event) {
        event.preventDefault();
        const account = FLC.guard.currentAccount();
        const current = records.get(id);
        const action = event.submitter && event.submitter.value;
        const comment = document.getElementById('review-comment');
        const error = document.getElementById('review-error');
        let result;
        if (FLC.guard.decide(path, account).action !== 'allow' || !FLC.governance.agentActions(account, current).includes(action)) {
          result = { ok: false, code: 'FORBIDDEN' };
        } else if (!comment.value.trim()) result = { ok: false, code: 'COMMENT_REQUIRED' };
        else result = FLC.governance.review(account, current, action, comment.value);
        comment.setAttribute('aria-invalid', String(result.code === 'COMMENT_REQUIRED'));
        if (!result.ok) {
          error.textContent = ({ FORBIDDEN: '权限或审核阶段已变化，请返回列表。', COMMENT_REQUIRED: '请填写审核意见。',
            FEATURE_APPROVAL_REQUIRED: '高风险版本须先关联风险评估。' }[result.code] || '提交失败。') + ' ' + result.code;
          comment.focus();
          return;
        }
        records.upsert(result.record);
        FLC.audit.log({ actor_id: account.id, action: 'agent.' + action, target: id, note: comment.value.trim() });
        status.textContent = '已完成：' + actionLabel(current, action) + '。';
        render();
      });
    }
    list.addEventListener('click', event => {
      const row = event.target.closest('tr[data-id]');
      if (row && !event.target.closest('a')) location.href = href(row.dataset.id);
    });
    window.addEventListener('hashchange', render);
    render();
  });
})(window.FLC);
