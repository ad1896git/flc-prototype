window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'student/space-search.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const data = FLC.data.spaces;
    const resources = [...data.spaces, ...data.devices];
    const bookings = FLC.store.collection('bookings');
    const escape = FLC.util.escapeHtml;
    const el = id => document.getElementById(id);
    const zones = { collab_room: '研讨室', maker: '创客制作区', collab_open: '开放小组区' };
    const access = { wheelchair: '轮椅通行', adjustable_desk: '可调节桌面', hearing_loop: '助听环路' };
    let selected = null;
    el('campus').innerHTML += [...new Set(resources.map(item => item.campus))]
      .map(campus => '<option value="' + escape(campus) + '">' + escape(campus) + '</option>').join('');
    el('zone').innerHTML += Object.entries(zones).map(([code, label]) =>
      '<option value="' + escape(code) + '">' + escape(label) + ' · ' + escape(code) + '</option>').join('');

    function select(resource) {
      selected = resource;
      el('selected-resource').textContent = '已选：' + resource.name + ' · ' + resource.campus;
      el('submit-booking').disabled = false;
      el('booking-result').hidden = true;
      render();
    }
    function render() {
      const filtered = resources.filter(item =>
        (!el('campus').value || item.campus === el('campus').value) &&
        (!el('zone').value || item.zone_type === el('zone').value) &&
        (!el('capacity').value || item.capacity >= Number(el('capacity').value)) &&
        (!el('a11y').value || item.a11y[el('a11y').value]));
      // A filtered-out choice must not remain an invisible submission target.
      if (selected && !filtered.includes(selected)) {
        selected = null;
        el('selected-resource').textContent = '请先选择资源。';
        el('submit-booking').disabled = true;
      }
      el('resource-count').textContent = '找到 ' + filtered.length + ' 项资源';
      el('resources').innerHTML = filtered.map(item => '<article class="booking-card' +
        (selected === item ? ' is-selected' : '') + '"><h3>' + escape(item.name) + '</h3><p>' +
        escape(item.campus) + ' · ' + FLC.ui.codeLabel(zones[item.zone_type] || item.zone_type, item.zone_type) +
        '</p><p>容量 ' + escape(item.capacity) + ' 人 · 实时占用 ' + escape(item.occupancy) +
        ' 人</p><p class="booking-meta">' + escape(Object.keys(access).filter(key => item.a11y[key])
          .map(key => access[key]).join('、') || '暂无无障碍属性记录') + '</p>' +
        (item.required_cert ? '<p>培训要求：' + escape(item.required_cert) + '</p>' : '') +
        (item.bookable ? '<button type="button" data-resource="' + escape(item.id) + '" aria-pressed="' +
          (selected === item) + '">' + (selected === item ? '已选择' : '选择此资源') + '</button>' :
          '<p>仅查看占用，不可预约</p>') + '</article>').join('') || '<p>没有匹配的资源，请调整筛选条件。</p>';
    }
    el('resources').addEventListener('click', event => {
      const button = event.target.closest('button[data-resource]');
      if (button) select(resources.find(item => item.id === button.dataset.resource));
    });
    el('filters').addEventListener('input', render);
    el('filters').addEventListener('submit', event => event.preventDefault());
    function fillSlot(slot) {
      const time = value => {
        const date = new Date(value);
        return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
      };
      el('date').value = FLC.booking.localDate(slot.from);
      el('from').value = time(slot.from);
      el('to').value = time(slot.to);
    }
    fillSlot(data.demoSlots(FLC.time.now()).request);
    document.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click', function () {
      el('filters').reset();
      const kind = button.dataset.demo;
      select(resources.find(item => item.id === (kind === 'cert' ? 'device-3d-printer' : 'space-center-room')));
      fillSlot(data.demoSlots(FLC.time.now()).request);
      el('demo-note').textContent = kind === 'penalty' ?
        '禁用期预设已填入明天 16:00–17:00，请切换到 stu-03 后使用此预设并提交预约。' :
        '已填入明天 16:00–17:00，请使用 stu-01 提交预约；已有演示数据不会重置。';
    }));
    el('reserve').addEventListener('submit', function (event) {
      event.preventDefault();
      if (!selected) return;
      const ctx = {
        user: FLC.guard.currentAccount(), resource: selected, now: FLC.time.now(), config: data.config,
        from: new Date(el('date').value + 'T' + el('from').value).getTime(),
        to: new Date(el('date').value + 'T' + el('to').value).getTime(),
        bookings: bookings.list(), certs: data.certs, penalties: data.penalties
      };
      const checked = FLC.booking.check(ctx);
      const result = checked.ok ? FLC.booking.create(ctx) : checked;
      if (result.ok) {
        bookings.upsert(result.booking);
        window.location.href = 'booking-detail.html?id=' + encodeURIComponent(result.booking.id);
        return;
      }
      const output = el('booking-result');
      output.hidden = false;
      output.innerHTML = '<strong>' + escape(result.rule) + ' · ' + escape(result.code) + '</strong><p>' +
        escape(result.message) + '</p><p>怎么办：' + escape(result.hint) + '</p>' +
        (result.code === 'SPACE_RULE_CERT' ? '<a href="credentials.html">查看培训与认证</a>' : '') +
        (result.code === 'SPACE_RULE_PENALIZED' ? '<a href="help.html?type=appeal">提交申诉</a>' : '');
    });
    render();
  });
})(window.FLC);
