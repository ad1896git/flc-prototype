window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'student/booking-detail.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const records = FLC.store.collection('bookings');
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const content = document.getElementById('booking-detail');
    const output = document.getElementById('checkin-result');
    const escape = FLC.util.escapeHtml;
    const resources = [...FLC.data.spaces.spaces, ...FLC.data.spaces.devices];
    const account = () => FLC.guard.currentAccount();
    const visible = () => {
      const booking = records.get(id);
      return FLC.booking.visibleTo(booking, account()) ? booking : null;
    };
    const time = value => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '未签到';
    const name = userId => {
      const user = FLC.ACCOUNTS.find(item => item.id === userId);
      return user ? user.name + '（' + user.id + '）' : userId;
    };
    const status = booking => FLC.ui.codeLabel(FLC.booking.STATUS_LABELS[booking.status] || booking.status, booking.status);
    const resourceName = booking => {
      const resource = resources.find(item => item.id === booking.resource_id);
      return resource ? resource.name + ' · ' + resource.campus : booking.resource_id;
    };
    function message(text, success) {
      output.hidden = false;
      output.classList.toggle('is-success', Boolean(success));
      output.textContent = text;
    }
    function render() {
      const booking = visible();
      if (!booking) {
        content.innerHTML = '<p class="booking-notice">预约不存在</p>';
        return;
      }
      content.innerHTML = '<section class="booking-card" aria-labelledby="detail-title"><h2 id="detail-title">' +
        escape(resourceName(booking)) + '</h2><p class="booking-status">' + status(booking) + '</p><dl>' +
        '<dt>预约编号</dt><dd>' + escape(booking.id) + '</dd><dt>预约人</dt><dd>' + escape(name(booking.booker_id)) +
        '</dd><dt>预约时段</dt><dd>' + escape(time(booking.from)) + ' 至 ' + escape(time(booking.to)) +
        '</dd><dt>签到窗口（含开始，不含截止）</dt><dd>' + escape(time(booking.checkin_from)) + ' 至 ' +
        escape(time(booking.checkin_until)) + '</dd><dt>未到场判定时刻</dt><dd>' + escape(time(booking.no_show_at)) +
        '</dd><dt>预约人签到时间</dt><dd>' + escape(time(booking.checked_in_at)) + '</dd></dl>' +
        '<h3>参与者</h3><p class="booking-meta">仅预约人和参与者可查看此列表。</p><ul class="booking-list">' +
        ((booking.participants || []).map(item => '<li>' + escape(name(item.user_id)) + ' · ' +
          escape(time(item.checked_in_at)) + '</li>').join('') || '<li>暂无参与者</li>') + '</ul>' +
        '<div class="booking-actions"><button type="button" id="checkin">签到</button>' +
        (booking.booker_id === account().id && booking.status === 'confirmed' && FLC.time.now() < Date.parse(booking.from) ?
          '<button type="button" id="cancel" class="flc-secondary">取消预约</button>' : '') + '</div></section>';
      document.getElementById('checkin').addEventListener('click', checkin);
      const cancel = document.getElementById('cancel');
      if (cancel) cancel.addEventListener('click', function () {
        const current = visible();
        if (!current) { render(); message('预约不存在'); return; }
        if (current.booker_id !== account().id || current.status !== 'confirmed' || FLC.time.now() >= Date.parse(current.from)) {
          render(); message('无法取消：仅预约人可在开始前取消已确认的预约。开始时刻：' + time(current.from)); return;
        }
        records.upsert({ ...current, status: 'cancelled' });
        render();
        message('预约已取消（cancelled）。', true);
      });
    }
    function checkin() {
      const current = visible();
      if (!current) { render(); message('预约不存在'); return; }
      const now = FLC.time.now();
      const result = FLC.booking.checkin(current, account(), now);
      if (result.ok) {
        records.upsert(result.booking);
        render();
        message('签到成功 · ' + time(now) + (result.role === 'participant' ? '。已记录你的到场时间。' : '。预约状态：已签到（checked_in）。'), true);
      } else {
        render();
        message(result.message + '（' + result.code + '）。' + (result.at ? '判定时刻：' + time(result.at) + '。' : '') +
          '当前时间：' + time(now) + '。');
      }
    }
    if (!id) {
      const bookings = records.list().filter(booking => FLC.booking.visibleTo(booking, account()));
      content.innerHTML = '<section class="booking-card"><h2>选择预约查看详情</h2><ul class="booking-list">' +
        (bookings.map(booking => '<li><a href="booking-detail.html?id=' + escape(encodeURIComponent(booking.id)) + '">' +
          escape(resourceName(booking)) + ' · ' + escape(time(booking.from)) + '</a> · ' + status(booking) + '</li>').join('') ||
          '<li>暂无可查看的预约，请先找空间。</li>') + '</ul></section>';
    } else {
      render();
      if (params.get('scan') === '1') checkin();
    }
  });
})(window.FLC);
