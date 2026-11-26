window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'student/credentials.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const escape = FLC.util.escapeHtml;
    const misc = FLC.data.studentMisc;
    const time = value => new Date(value).toLocaleString('zh-CN', { hour12: false });

    function summary(item) {
      const status = ['valid', 'revoked'].includes(item.status) ? item.status : null;
      return '<dl><dt>成就名</dt><dd>' + escape(item.achievement_name) + '</dd>' +
        '<dt>签发单位</dt><dd>' + escape(item.issuer) + '</dd>' +
        '<dt>签发时间</dt><dd>' + escape(time(item.issued_at)) + '</dd>' +
        '<dt>状态</dt><dd><span class="credential-status' + (status ? ' credential-' + status : '') + '">' +
        (status ? FLC.ui.codeLabel(misc.credentialStatuses[status], status) : '状态未知') + '</span></dd></dl>';
    }

    function render() {
      const account = FLC.guard.currentAccount();
      if (FLC.guard.decide(path, account).action !== 'allow') return;
      const credentials = misc.credentials.filter(item => item.user_id === account.id)
        .sort((a, b) => Date.parse(b.issued_at) - Date.parse(a.issued_at));
      const op = window.location.hash === '#op';
      document.getElementById('credential-list-view').hidden = op;
      document.getElementById('credential-op-view').hidden = !op;
      document.getElementById('credential-list').innerHTML = credentials.map(item =>
        '<article class="credential-card"><h2><a href="?id=' + escape(encodeURIComponent(item.id)) + '#op">' +
        escape(item.achievement_name) + '</a></h2>' + summary(item) + '</article>').join('') || '<p>暂无证书。</p>';
      const item = credentials.find(credential => credential.id === FLC.util.param('id'));
      document.getElementById('credential-detail').innerHTML = item ?
        '<h2>证书详情 · ' + escape(item.achievement_name) + '</h2>' + summary(item) +
        '<p>' + escape(item.description) + '</p>' :
        '<h2>未找到证书</h2><p>请返回列表选择本账号的证书。</p>';
      document.getElementById('credential-verification').hidden = !item;
      document.getElementById('verification-summary').innerHTML = item ? summary(item) : '';
    }

    document.getElementById('export-clr').addEventListener('click', function () {
      if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
      document.getElementById('clr-status').textContent = '后期提供';
    });
    render();
    window.addEventListener('hashchange', render);
    window.addEventListener('pageshow', render);
  });
})(window.FLC);
