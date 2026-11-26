window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'admin/config.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const $ = id => document.getElementById(id);
    const escape = FLC.util.escapeHtml;
    const account = FLC.guard.currentAccount();
    const systemAdmin = account.roles.some(entry => entry.role === 'sys_admin');
    function items() {
      const edits = FLC.store.collection('config_edits').list();
      return FLC.adminConfig.visibleItems(account, FLC.data.auditConfig.items).map(item => {
        const latest = edits.filter(edit => edit.key === item.key).reduce((best, edit) =>
          !best || edit.seq > best.seq ? edit : best, null);
        return latest ? Object.assign({}, item, { value: latest.value, updated_by: latest.updated_by,
          updated_at: latest.updated_at }) : item;
      });
    }
    const valueLabel = item => String(item.value) + (item.unit ? ' ' + item.unit : '');
    const modified = item => item.updated_by ? item.updated_by + ' / ' + item.updated_at : '初始建议值 / 尚未修改';
    function list(visible) {
      $('config-groups').innerHTML = ['technical', 'business'].map(group => {
        const title = group === 'technical' ? '技术项' : '业务项';
        if (group === 'business' && systemAdmin) return '<section class="flc-card"><h3>业务项</h3>' +
          '<p>系统管理员无权查看业务敏感数据（设计 §1.3、§5.3.4）</p></section>';
        const rows = visible.filter(item => item.group === group).map(item => '<tr><th scope="row"><code>' +
          escape(item.key) + '</code></th><td>' + escape(valueLabel(item)) + (item.suggested ?
            '<small class="ac-tag">【建议值】</small>' : '') + '</td><td>' + escape(item.description) +
          '</td><td>' + escape(modified(item)) + '</td><td><a href="?id=' + escape(encodeURIComponent(item.key)) +
          '#op">' + (FLC.adminConfig.canEdit(account, item) ? '修改' : '查看（只读）') + '</a></td></tr>').join('');
        return '<section><h3>' + title + '</h3><div class="flc-table-wrap"><table><caption>' + title +
          '配置</caption><thead><tr><th scope="col">键</th><th scope="col">值</th><th scope="col">说明</th>' +
          '<th scope="col">最后修改人 / 时间</th><th scope="col">操作</th></tr></thead><tbody>' +
          (rows || '<tr><td colspan="5">暂无可见配置项。</td></tr>') + '</tbody></table></div></section>';
      }).join('');
    }
    function detail(item) {
      const editable = FLC.adminConfig.canEdit(account, item);
      $('op-content').innerHTML = '<dl class="ac-detail"><dt>键</dt><dd><code>' + escape(item.key) +
        '</code></dd><dt>当前值</dt><dd>' + escape(valueLabel(item)) + (item.suggested ? '【建议值】' : '') +
        '</dd><dt>说明</dt><dd>' + escape(item.description) + '</dd><dt>最后修改</dt><dd>' +
        escape(modified(item)) + '</dd></dl><p id="save-status" role="status"></p>' +
        (editable ? '<form id="config-edit" class="ac-edit" novalidate><label>新值' +
          '<input id="config-value" type="number" step="1" required aria-describedby="value-help value-error"></label>' +
          '<p id="value-help" class="ac-muted"></p><p id="value-error" class="ac-error" role="alert"></p>' +
          '<label>变更原因（必填）<textarea id="config-reason" required aria-describedby="reason-error"></textarea></label>' +
          '<p id="reason-error" class="ac-error" role="alert"></p><button type="submit">保存配置</button></form>' :
          '<p class="flc-alert">此项只读，当前账号不能修改。</p>');
      if (!editable) return;
      const input = $('config-value');
      input.value = item.value;
      const limits = item.constraints || {};
      if (limits.min != null) input.min = limits.min;
      if (limits.max != null) input.max = limits.max;
      $('value-help').textContent = '请输入整数' + (limits.min != null ? '，最小值 ' + limits.min : '') +
        (limits.max != null ? '，最大值 ' + limits.max : '') + (item.unit ? '，单位：' + item.unit : '') + '。';
      $('config-edit').addEventListener('submit', event => {
        event.preventDefault();
        const value = input.value.trim() === '' ? NaN : Number(input.value);
        const outcome = FLC.adminConfig.saveEdit(account, item, value, $('config-reason').value);
        $('value-error').textContent = outcome.code === 'VALIDATION_ERROR' ? '新值无效，请按类型与范围填写。' : '';
        $('reason-error').textContent = outcome.code === 'REASON_REQUIRED' ? '请填写变更原因，不能只填空白。' : '';
        input.setAttribute('aria-invalid', outcome.code === 'VALIDATION_ERROR' ? 'true' : 'false');
        $('config-reason').setAttribute('aria-invalid', outcome.code === 'REASON_REQUIRED' ? 'true' : 'false');
        if (outcome.ok) {
          detail(items().find(entry => entry.key === item.key));
          $('save-status').textContent = '配置已保存，并已写入审计记录。';
          $('config-value').focus();
        } else if (outcome.code === 'REASON_REQUIRED') $('config-reason').focus();
        else if (outcome.code === 'VALIDATION_ERROR') input.focus();
        else $('save-status').textContent = '当前账号无权修改此项。';
      });
    }
    function route() {
      const visible = items();
      const open = location.hash === '#op';
      $('config-list').hidden = open;
      $('op').hidden = !open;
      // Clear both views before resolving a deep link, including inaccessible keys.
      $('config-groups').replaceChildren();
      $('op-content').replaceChildren();
      if (!open) { list(visible); return; }
      const id = new URLSearchParams(location.search).get('id');
      const item = id === null ? visible[0] : visible.find(entry => entry.key === id);
      if (item) detail(item);
      else $('op-content').textContent = '记录不存在或无权查看。';
      $('op-title').focus();
    }
    window.addEventListener('hashchange', route);
    window.addEventListener('storage', event => { if (!event.key || event.key === 'flc.demo.config_edits') route(); });
    route();
  });
})(window.FLC);
