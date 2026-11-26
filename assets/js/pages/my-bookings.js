window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'student/my-bookings.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const records = FLC.store.collection('bookings');
    const resources = [...FLC.data.spaces.spaces, ...FLC.data.spaces.devices];
    const escape = FLC.util.escapeHtml;
    const time = value => FLC.ui.shortTime(value);

    function render() {
      const account = FLC.guard.currentAccount();
      if (FLC.guard.decide(path, account).action !== 'allow') return;
      const bookings = records.list().filter(booking => FLC.booking.visibleTo(booking, account))
        .sort((a, b) => Date.parse(b.from) - Date.parse(a.from));
      document.getElementById('booking-count').textContent = '共 ' + bookings.length + ' 条预约';
      document.getElementById('my-bookings').innerHTML = bookings.map(booking => {
        const resource = resources.find(item => item.id === booking.resource_id && item.resource_type === booking.resource_type);
        const name = resource ? resource.name + ' · ' + resource.campus : booking.resource_id;
        const role = booking.booker_id === account.id ? '预约人' : '参与者';
        return '<article class="booking-card"><h2><a href="booking-detail.html?id=' +
          escape(encodeURIComponent(booking.id)) + '">' + escape(name) + '</a></h2>' +
          '<p class="booking-status">' + escape(FLC.booking.STATUS_LABELS[booking.status] || booking.status) +
          '</p><p>本人身份：' + escape(role) + '</p><dl><dt>预约编号</dt><dd>' + escape(booking.id) +
          '</dd><dt>预约时段</dt><dd>' + escape(time(booking.from)) + ' 至 ' + escape(time(booking.to)) +
          '</dd><dt>签到窗口（含开始，不含截止）</dt><dd>' + escape(time(booking.checkin_from)) + ' 至 ' +
          escape(time(booking.checkin_until)) + '</dd></dl></article>';
      }).join('') || '<p class="booking-notice">暂无预约。可通过“找空间”创建预约；被列为参与者的预约也会出现在这里。</p>';
    }
    render();
    window.addEventListener('pageshow', render);
  });
})(window.FLC);
