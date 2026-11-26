window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const escape = FLC.util.escapeHtml;
    const from = FLC.util.param('from') || '';
    const page = FLC.guard.findPage(from);
    const account = FLC.guard.currentAccount();
    const labels = roles => roles.map(role => FLC.ui.codeLabel(FLC.ROLE_NAMES[role], role)).join('、');
    document.getElementById('forbidden-details').innerHTML = page ?
      '<h2>' + escape(page.title) + '</h2><dl><dt>目标页面</dt><dd>' + escape(page.path) +
      '</dd><dt>需求编号</dt><dd>' + escape(page.fr.join(' / ')) +
      '</dd><dt>需要的角色（任一）</dt><dd>' + labels(page.roles) + '</dd></dl>' :
      '<h2>页面不在清单中</h2><p>目标路径：<code>' + escape(from || '未提供') + '</code></p>';
    document.getElementById('current-roles').innerHTML = account ?
      '<p>当前账号：' + escape(account.name) + '</p><p>当前账号角色：' +
      labels(account.roles.map(item => item.role)) + '</p>' : '<p>当前账号角色：未选择演示账号</p>';
    document.getElementById('my-home').setAttribute('href', account ? account.landing : 'index.html');
  });
})(window.FLC);
