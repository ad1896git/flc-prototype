window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'admin/spaces.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const $ = id => document.getElementById(id);
    const escape = FLC.util.escapeHtml;
    const api = FLC.adminSpace;
    const data = FLC.data.spaces;
    const a11yLabels = { wheelchair: '轮椅通行', adjustable_desk: '可调节桌', hearing_loop: '助听环路' };
    const codeLabel = (labels, value) => value ? FLC.ui.codeLabel(labels[value] || '未登记', value) : '未登记';
    const text = value => escape(value || '未登记');
    const current = () => FLC.guard.currentAccount();
    const collection = () => FLC.store.collection('space_edits');
    function spaces() {
      const edits = collection().list();
      return data.spaces.map(space => api.merged({ ...space,
        ...FLC.data.utilization.spaceDetails[space.id] }, edits));
    }
    function a11ySummary(value) {
      return Object.entries(a11yLabels).map(([key, label]) =>
        escape(label) + '：' + (value[key] === true ? '有' : value[key] === false ? '无' : '未登记')).join('；');
    }
    function list(nodes) {
      const all = spaces();
      $('space-nodes').innerHTML = nodes.map(node => {
        const resources = all.filter(space => space.node_id === node.id);
        const rows = resources.map(space => {
          const devices = data.devices.filter(device => device.space_id === space.id);
          return '<tr><th scope="row">' + escape(space.name) + '<small>' + escape(space.id) + '</small></th>' +
            '<td>' + text(node.campus) + '</td><td>' + text(space.building) +
            '<small>楼层：' + text(space.floor) + ' / 房间：' + text(space.room_no) + '</small></td>' +
            '<td>' + codeLabel(api.ZONE_LABELS, space.zone_type) + '</td><td>' +
            codeLabel(api.ACOUSTIC_LABELS, space.acoustic_level) + '</td><td>' + escape(space.capacity) +
            '</td><td>' + a11ySummary(space.a11y) + '</td><td>' + codeLabel(api.STATUS_LABELS, space.status) +
            '</td><td><a href="?id=' + escape(encodeURIComponent(space.id)) + '#op">编辑空间</a></td></tr>' +
            (devices.length ? '<tr class="as-device"><td colspan="9"><strong>所属设备</strong><ul>' +
              devices.map(device => '<li>' + escape(device.name) + ' <code>' + escape(device.id) +
                '</code> · ' + codeLabel(api.STATUS_LABELS, device.status) + ' · 培训要求：' +
                escape(device.required_cert || '无需认证') + '</li>').join('') + '</ul></td></tr>' :
              '<tr class="as-device"><td colspan="9">所属设备：暂无登记设备</td></tr>');
        }).join('');
        return '<section class="as-node flc-card"><h3>' + escape(node.name) + ' <small><code>' +
          escape(node.id) + '</code></small></h3><p>' + text(node.campus) + ' · ' + resources.length +
          ' 个空间</p><div class="flc-table-wrap" role="region" tabindex="0" aria-label="' +
          escape(node.name) + '资源表"><table><caption>' + escape(node.name) +
          '空间与设备</caption><thead><tr>' + ['空间', '校区', '楼宇', '分区', '声学等级', '容量',
            '无障碍属性', '状态', '操作'].map(label => '<th scope="col">' + label + '</th>').join('') +
          '</tr></thead><tbody>' + (rows || '<tr><td colspan="9">暂无空间。</td></tr>') +
          '</tbody></table></div></section>';
      }).join('') || '<p class="flc-alert">暂无可管理节点。</p>';
    }
    function field(key, label, control) {
      return '<div class="as-field"><label for="space-' + key + '">' + escape(label) + '</label>' +
        control + '<p id="error-' + key + '" class="as-error" role="alert"></p></div>';
    }
    function input(key, label, type = 'text') {
      return field(key, label, '<input id="space-' + key + '" name="' + key + '" type="' + type +
        '" aria-describedby="error-' + key + '"' + (key === 'capacity' ? ' min="1" step="1" required' :
          key === 'name' ? ' required' : '') + '>');
    }
    function select(key, label, labels) {
      return field(key, label, '<select id="space-' + key + '" name="' + key +
        '" aria-describedby="error-' + key + '">' + Object.entries(labels).map(([value, title]) =>
          '<option value="' + escape(value) + '">' + escape(title + ' (' + value + ')') + '</option>').join('') + '</select>');
    }
    function detail(space) {
      const node = data.nodes.find(item => item.id === space.node_id);
      $('op-content').innerHTML = '<p>' + escape(node.name) + ' · ' + text(node.campus) +
        ' · <code>' + escape(space.id) + '</code></p><p>节点与校区只读。修改状态不会取消或更改已有预约。</p>' +
        '<p id="save-status" role="status" aria-live="polite"></p>' +
        '<form id="space-edit" novalidate><div class="as-fields">' + input('name', '空间名称（必填）') +
        input('building', '楼宇') + input('floor', '楼层') + input('room_no', '房间号') +
        select('zone_type', '分区', api.ZONE_LABELS) + select('acoustic_level', '声学等级', api.ACOUSTIC_LABELS) +
        input('capacity', '容量（正整数）', 'number') + select('status', '状态', api.STATUS_LABELS) +
        '</div><fieldset><legend>无障碍属性</legend>' + Object.entries(a11yLabels).map(([key, label]) =>
          '<label class="as-check"><input type="checkbox" id="a11y-' + key + '"> ' +
          escape(label) + ' <code>' + escape(key) + '</code></label>').join('') +
        '</fieldset><div class="flc-actions"><button type="submit">保存空间</button>' +
        '<a class="flc-button flc-secondary" href="spaces.html">返回列表</a></div></form>';
      ['name', 'building', 'floor', 'room_no', 'zone_type', 'acoustic_level', 'capacity', 'status'].forEach(key => {
        $('space-' + key).value = space[key] == null ? '' : space[key];
      });
      Object.keys(a11yLabels).forEach(key => { $('a11y-' + key).checked = space.a11y[key] === true; });
      $('space-edit').addEventListener('submit', event => {
        event.preventDefault();
        // Resolve current account again at the write boundary, including after role switching in another tab.
        if (FLC.guard.decide(path, current()).action !== 'allow' || !api.canManage(current(), space.id)) {
          $('op-content').textContent = '无权管理该节点';
          return;
        }
        const patch = {};
        ['name', 'building', 'floor', 'room_no', 'zone_type', 'acoustic_level', 'status'].forEach(key => {
          patch[key] = $('space-' + key).value.trim();
        });
        patch.capacity = Number($('space-capacity').value);
        patch.a11y = { ...space.a11y };
        Object.keys(a11yLabels).forEach(key => { patch.a11y[key] = $('a11y-' + key).checked; });
        patch.bookable = patch.zone_type === 'collab_open' ? false : data.spaces.find(item => item.id === space.id).bookable;
        const errors = api.validate(space, patch);
        ['name', 'building', 'floor', 'room_no', 'zone_type', 'acoustic_level', 'capacity', 'status'].forEach(key => {
          $('error-' + key).textContent = errors[key] || '';
          $('space-' + key).setAttribute('aria-invalid', errors[key] ? 'true' : 'false');
        });
        if (Object.keys(errors).length) {
          $('save-status').textContent = '保存失败，请检查标出的字段。';
          $('space-' + Object.keys(errors)[0]).focus();
          return;
        }
        try {
          collection().upsert({ ...patch, id: 'edit-' + space.id, space_id: space.id,
            updated_by: current().id, updated_at: new Date(FLC.time.now()).toISOString() });
          $('save-status').textContent = '空间已保存。预约数据未更改。';
        } catch (error) {
          $('save-status').textContent = '保存失败，浏览器存储不可用，请重试。';
        }
      });
    }
    function route() {
      const account = current();
      const nodes = api.visibleNodes(account, data.nodes);
      const global = account && account.roles.some(role => role.role === 'center_admin' && role.scope_type === 'global');
      $('management-scope').textContent = global ? '你的管理范围：全部节点（global 作用域）' :
        '你的管理范围：' + (nodes.map(node => node.name).join('、') || '无') + '（space_node 作用域）';
      const open = location.hash === '#op';
      $('space-list').hidden = open;
      $('op').hidden = !open;
      $('space-nodes').replaceChildren();
      $('op-content').replaceChildren();
      if (!open) { list(nodes); return; }
      const id = new URLSearchParams(location.search).get('id');
      if (!id) $('op-content').textContent = '请从空间列表选择要编辑的空间。';
      else if (!api.canManage(account, id)) $('op-content').textContent = '无权管理该节点';
      else detail(spaces().find(space => space.id === id));
      $('op-title').focus();
    }
    window.addEventListener('hashchange', route);
    window.addEventListener('storage', event => {
      if (!event.key || ['flc.account', 'flc.demo.space_edits'].includes(event.key)) route();
    });
    route();
  });
})(window.FLC);
