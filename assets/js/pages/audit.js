window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'admin/audit.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const $ = id => document.getElementById(id);
    const escape = FLC.util.escapeHtml;
    const actionNames = { 'config.update': '配置修改', 'companion.view_student_conv': '查看学生会话',
      'case.claim': '工单接单', 'idmap.lookup': '身份映射查询' };
    const actionLabel = code => (actionNames[code] || '其他操作') + ' · ' + code;
    const roleLabel = code => (FLC.ROLE_NAMES[code] || '未知角色') + ' · ' + code;
    const roles = record => record.actor_role ? [record.actor_role] :
      ((FLC.ACCOUNTS.find(account => account.id === record.actor_id) || {}).roles || []).map(entry => entry.role);
    const resultLabel = value => value === 'success' ? '成功 · success' :
      value === 'denied' ? '拒绝 · denied' : value == null ? '未提供' : String(value);
    const dateLabel = value => {
      const date = new Date(value);
      return value == null || !Number.isFinite(date.getTime()) ? '未提供有效时间' : date.toLocaleString('zh-CN');
    };
    let records = [];
    let chain;
    function read() {
      records = FLC.auditQuery.merge(FLC.data.auditConfig.auditSeed, FLC.store.collection('audit').list());
      chain = FLC.auditQuery.chainCheck(records);
    }
    function options(id, codes, label) {
      const select = $(id);
      const current = select.value;
      select.innerHTML = '<option value="">全部' + (id === 'audit-role' ? '角色' : '操作') + '</option>' +
        codes.map(code => '<option value="' + escape(code) + '">' + escape(label(code)) + '</option>').join('');
      select.value = codes.includes(current) ? current : '';
    }
    function list() {
      read();
      options('audit-role', Array.from(new Set(records.flatMap(roles))).sort(), roleLabel);
      options('audit-action', Array.from(new Set(records.map(record => record.action))).sort(), actionLabel);
      const from = $('audit-from').value;
      const to = $('audit-to').value;
      const invalid = (from && !Number.isFinite(Date.parse(from))) || (to && !Number.isFinite(Date.parse(to))) ||
        (from && to && Date.parse(from) > Date.parse(to));
      $('filter-error').textContent = invalid ? '请输入有效时间，开始时间不能晚于结束时间。' : '';
      ['audit-from', 'audit-to'].forEach(id => $(id).setAttribute('aria-invalid', invalid ? 'true' : 'false'));
      const rows = invalid ? [] : FLC.auditQuery.filter(records, {
        from: from ? new Date(from).toISOString() : '', to: to ? new Date(to).toISOString() : '',
        role: $('audit-role').value, action: $('audit-action').value
      });
      $('audit-count').textContent = '共 ' + records.length + ' 条，当前显示 ' + rows.length + ' 条。';
      $('audit-rows').innerHTML = rows.map(record => '<tr><td>' + escape(dateLabel(record.occurred_at)) +
        '</td><td>' + escape(roles(record).map(roleLabel).join('、') || '未知角色') + '<small><code>' +
        escape(record.actor_id || '未提供') + '</code></small></td><td>' + escape(actionLabel(record.action)) +
        '</td><td><code>' + escape(record.target || record.target_id || '未提供') + '</code></td><td>' +
        escape(resultLabel(record.result)) + '</td><td>示意重算，未经锚定</td><td><a href="?id=' +
        escape(encodeURIComponent(record.id)) + '#op">查看详情</a></td></tr>').join('') ||
        '<tr><td colspan="7">没有符合条件的审计记录。</td></tr>';
    }
    function route() {
      const open = location.hash === '#op';
      $('audit-list').hidden = open;
      $('op').hidden = !open;
      if (!open) { list(); return; }
      read();
      const id = new URLSearchParams(location.search).get('id');
      const record = id === null ? records[0] : records.find(entry => entry.id === id);
      if (!record) $('op-content').textContent = '记录不存在或无权查看。';
      else {
        const digest = chain.records.find(entry => entry.id === record.id);
        $('op-content').innerHTML = '<dl class="ac-detail"><dt>记录 id</dt><dd><code>' + escape(record.id) +
          '</code></dd><dt>时间</dt><dd>' + escape(dateLabel(record.occurred_at)) + '</dd><dt>结果</dt><dd>' +
          escape(resultLabel(record.result)) + '</dd></dl><h3>哈希链校验（示意）</h3><p class="flc-alert">' +
          escape(chain.message) + '</p><dl class="ac-detail"><dt>记录数</dt><dd>' + escape(chain.count) +
          '</dd><dt>上一摘要</dt><dd><code>' + escape(digest.prev_hash) + '</code></dd><dt>本条摘要</dt><dd><code>' +
          escape(digest.hash) + '</code></dd><dt>链尾摘要</dt><dd><code>' + escape(chain.head) +
          '</code></dd></dl><h3>完整记录（只读）</h3><pre>' + escape(JSON.stringify(record, null, 2)) + '</pre>';
      }
      $('op-title').focus();
    }
    $('time-help').textContent = '时间按本机时区（' + Intl.DateTimeFormat().resolvedOptions().timeZone + '）填写，包含起止时刻。';
    $('audit-filter').addEventListener('submit', event => { event.preventDefault(); list(); });
    $('audit-filter').addEventListener('reset', () => { setTimeout(list, 0); });
    window.addEventListener('hashchange', route);
    window.addEventListener('storage', event => { if (!event.key || event.key === 'flc.demo.audit') route(); });
    route();
  });
})(window.FLC);
