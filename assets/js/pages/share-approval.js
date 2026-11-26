window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'admin/share-approval.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const data = FLC.data.dataGov;
    const requests = FLC.store.collection('data_share_requests');
    const list = document.getElementById('gov-list');
    const op = document.getElementById('op');
    const status = document.getElementById('gov-status');
    const esc = FLC.util.escapeHtml;
    const label = (group, code) => FLC.ui.codeLabel(data.labels[group][code] || code, code);
    function person(id) {
      const account = FLC.ACCOUNTS.find(item => item.id === id);
      return account ? FLC.ui.codeLabel(account.name, id) : esc(id || '—');
    }
    function items(ids) {
      return ids.map(id => {
        const item = data.catalog.find(row => row.id === id);
        return item ? FLC.ui.codeLabel(item.item_name, id) : esc(id);
      }).join('<br>');
    }
    function date(value) {
      if (!value) return '—';
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? esc(value) : esc(parsed.toLocaleString('zh-CN', { hour12: false }));
    }
    const detail = (title, html) => '<div><dt>' + esc(title) + '</dt><dd>' + html + '</dd></div>';

    function render() {
      const id = FLC.util.param('id');
      const showOp = location.hash === '#op' && !!id;
      list.hidden = showOp;
      op.hidden = !showOp;
      status.textContent = '';
      if (!showOp) {
        list.innerHTML = '<div class="data-gov-table-wrap"><table class="data-gov-table"><caption>数据共享申请</caption>' +
          '<thead><tr><th scope="col">申请人</th><th scope="col">用途</th><th scope="col">数据项</th>' +
          '<th scope="col">接收方</th><th scope="col">状态</th><th scope="col">操作</th></tr></thead><tbody>' +
          requests.list().map(row => '<tr><th scope="row">' + person(row.requester_id) + '</th><td>' + label('purposes', row.purpose) +
            '</td><td>' + items(row.item_ids) + '</td><td>' + esc(row.recipient) + '</td><td>' + label('status', row.status) +
            '</td><td><a href="?id=' + esc(encodeURIComponent(row.id)) + '#op" aria-label="查看共享申请 ' + esc(row.id) +
            '">查看 / 审批<small><code>' + esc(row.id) + '</code></small></a></td></tr>').join('') +
          '</tbody></table></div>';
        if (!requests.list().length) list.innerHTML += '<p>暂无数据共享申请。</p>';
        return;
      }
      const row = requests.get(id);
      op.innerHTML = '<a href="share-approval.html">返回共享申请列表</a>';
      if (!row) { op.innerHTML += '<p>未找到该共享申请。</p>'; return; }
      op.innerHTML += '<h2>申请详情 <small><code>' + esc(row.id) + '</code></small></h2>' +
        '<dl class="data-gov-details">' +
        detail('申请人', person(row.requester_id)) + detail('状态', label('status', row.status)) +
        detail('用途', label('purposes', row.purpose)) + detail('数据项', items(row.item_ids)) +
        detail('接收方', esc(row.recipient)) + detail('接收方核验', esc(row.recipient_verification || '尚未核验')) +
        detail('去标识化方法', esc(row.deidentify_method)) +
        detail('共享期限', date(row.period.from) + ' 至 ' + date(row.period.to)) +
        detail('审批人', person(row.approver_id)) + detail('审批时间', date(row.decided_at)) +
        detail('审批意见 / 附加条件', esc(row.conditions || '尚未审批')) +
        detail('交付回执', esc(row.delivery_receipt || '暂无回执')) + '</dl>' +
        '<h3>共享数据样例（虚构）</h3><div class="data-gov-table-wrap"><table class="data-gov-table">' +
        '<caption>按本申请用途生成的假名样例</caption><thead><tr><th scope="col">学生假名</th>' +
        '<th scope="col">学习事件数</th><th scope="col">完成率</th></tr></thead><tbody>' +
        FLC.dataGov.sampleRows(row).map(sample => '<tr><th scope="row"><code>' + esc(sample.student) +
          '</code></th><td>' + esc(sample.learning_events) + '</td><td>' + esc(Math.round(sample.completion_rate * 100)) +
          '%</td></tr>').join('') + '</tbody></table></div>' +
        '<p class="data-gov-help">' + esc(FLC.ui.pseudoNote('export:' + row.id)) + '</p>';
      if (row.status !== 'submitted') {
        op.innerHTML += '<p>此申请已处理，仅供查看。</p>';
        return;
      }
      op.innerHTML += '<form id="share-form" class="data-gov-form" novalidate><h3>审批操作</h3>' +
        '<label for="share-comment">审批意见（通过、驳回均必填） <small><code>conditions</code></small></label>' +
        '<textarea id="share-comment" required aria-describedby="share-comment-help share-error"></textarea>' +
        '<p id="share-comment-help" class="data-gov-help">通过时说明使用条件，驳回时说明原因。</p>' +
        '<p id="share-error" class="data-gov-error" role="alert"></p><div class="data-gov-actions">' +
        '<button type="submit" value="approved" aria-describedby="share-error">通过</button>' +
        '<button type="submit" value="rejected" aria-describedby="share-error">驳回</button></div></form>';
      document.getElementById('share-form').addEventListener('submit', function (event) {
        event.preventDefault();
        const account = FLC.guard.currentAccount();
        const error = document.getElementById('share-error');
        const comment = document.getElementById('share-comment');
        if (FLC.guard.decide(path, account).action !== 'allow') {
          error.textContent = '当前账号无权审批，请切换账号。';
          return;
        }
        const decision = event.submitter && event.submitter.value;
        const result = FLC.dataGov.reviewShare(requests.get(id), decision, comment.value, account, FLC.time.now());
        comment.setAttribute('aria-invalid', String(result.code === 'SHARE_COMMENT_REQUIRED'));
        if (!result.ok) {
          error.textContent = (data.labels.errors[result.code] || '审批失败，请刷新后重试') + '（' + result.code + '）';
          if (result.code === 'SHARE_COMMENT_REQUIRED') comment.focus();
          return;
        }
        requests.upsert(result.record);
        FLC.audit.log({ actor_id: account.id, action: 'data.share.' + decision, target: id, note: result.record.conditions });
        render();
        status.textContent = '审批已保存：' + data.labels.status[decision] + '（' + decision + '），已记录审计。';
      });
    }
    window.addEventListener('hashchange', render);
    render();
  });
})(window.FLC);
