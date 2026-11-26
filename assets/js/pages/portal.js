window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'student/portal.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const escape = FLC.util.escapeHtml;
    const time = value => FLC.ui.shortTime(value);
    function render() {
      const account = FLC.guard.currentAccount();
      if (FLC.guard.decide(path, account).action !== 'allow') return;
      const now = FLC.time.now();
      document.getElementById('portal-name').textContent = account.name + '，欢迎回来';
      document.getElementById('peer-mentor').hidden = !account.roles.some(item => item.role === 'peer_mentor');
      document.getElementById('portal-entries').innerHTML = FLC.portal.entries(account).map(page =>
        '<a class="portal-tile" href="../' + escape(page.path) + '">' + FLC.ui.tileIcon(page.path) +
        '<span class="portal-tile-label">' + escape(page.title.replace(/（.*）$/, '')) + '</span>' +
        (FLC.guard.isLater(page) ? '<span class="flc-later">后期</span>' : '') + '</a>').join('');
      document.getElementById('external-tools').hidden = !FLC.guard.canAccess(
        FLC.guard.findPage('external/lti-launch.html'), account);
      const tasks = FLC.portal.todoTasks(FLC.store.collection('tasks').list(),
        FLC.store.collection('submissions').list(), account.id, now);
      document.getElementById('portal-tasks').innerHTML = tasks.map(task => '<li><a href="task.html?id=' +
        escape(encodeURIComponent(task.id)) + '">' + escape(task.title) + '</a><p class="misc-meta">截止：' +
        escape(time(task.due_at)) + ' · 已发布</p></li>').join('') || '<li class="portal-empty">暂无未提交且未截止的已发布任务。</li>';
      const bookings = FLC.portal.upcomingBookings(FLC.store.collection('bookings').list(), account.id, now);
      const resources = [...FLC.data.spaces.spaces, ...FLC.data.spaces.devices];
      document.getElementById('portal-bookings').innerHTML = bookings.map(booking => {
        const resource = resources.find(item => item.id === booking.resource_id);
        return '<li><a href="booking-detail.html?id=' + escape(encodeURIComponent(booking.id)) + '">' +
          escape(resource ? resource.name : booking.resource_id) + '</a><p class="misc-meta">开始：' +
          escape(time(booking.from)) + ' · 已确认 · ' +
          (booking.booker_id === account.id ? '预约人' : '参与者') + '</p></li>';
      }).join('') || '<li class="portal-empty">暂无即将开始的已确认预约。</li>';
      const misc = FLC.data.studentMisc;
      const notices = misc.notifications.filter(item => item.user_id === account.id)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 3);
      document.getElementById('portal-notices').innerHTML = notices.map(item => '<li><a href="messages.html?id=' +
        escape(encodeURIComponent(item.id)) + '#op">' + escape(item.title) + '</a><p class="misc-meta">' +
        escape(misc.notificationTypes[item.type]) + ' · ' + escape(time(item.created_at)) + '</p></li>').join('') || '<li class="portal-empty">暂无通知。</li>';
    }
    render();
    window.addEventListener('pageshow', render);
  });
})(window.FLC);
