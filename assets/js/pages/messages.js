window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'student/messages.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const escape = FLC.util.escapeHtml;
    const time = value => new Date(value).toLocaleString('zh-CN', { hour12: false });
    function render() {
      const account = FLC.guard.currentAccount();
      if (FLC.guard.decide(path, account).action !== 'allow') return;
      const misc = FLC.data.studentMisc;
      const notices = misc.notifications.filter(item => item.user_id === account.id)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
      const detail = window.location.hash === '#op';
      document.getElementById('message-list-view').hidden = detail;
      document.getElementById('message-detail-view').hidden = !detail;
      document.getElementById('message-list').innerHTML = notices.map(item => '<li class="misc-card"><p class="misc-meta">' +
        escape(misc.notificationTypes[item.type] || item.type) + ' · ' + escape(FLC.ui.shortTime(item.created_at)) +
        '</p><h2><a href="?id=' + escape(encodeURIComponent(item.id)) + '#op">' + escape(item.title) + '</a></h2></li>').join('') || '<li>暂无通知。</li>';
      const id = new URLSearchParams(window.location.search).get('id');
      const notice = notices.find(item => item.id === id);
      document.getElementById('message-detail').innerHTML = notice ?
        '<h2>' + escape(notice.title) + '</h2><p>' + FLC.ui.codeLabel(misc.notificationTypes[notice.type] || notice.type, notice.type) +
        '</p><p class="misc-meta">' + escape(time(notice.created_at)) + '</p><p>' + escape(notice.body) + '</p>' :
        '<h2>未找到通知</h2><p>请选择一条本账号的站内信查看详情。</p>';
    }
    render();
    window.addEventListener('hashchange', render);
    window.addEventListener('pageshow', render);
  });
})(window.FLC);
