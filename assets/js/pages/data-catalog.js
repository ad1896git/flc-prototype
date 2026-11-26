window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'admin/data-catalog.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const data = FLC.data.dataGov;
    const edits = FLC.store.collection('catalog_edits');
    const list = document.getElementById('gov-list');
    const op = document.getElementById('op');
    const status = document.getElementById('gov-status');
    const esc = FLC.util.escapeHtml;
    const label = (group, code) => FLC.ui.codeLabel(data.labels[group][code] || code, code);
    const retention = rule => typeof rule === 'string' ? rule : rule.description;
    const rows = () => FLC.dataGov.mergedCatalog(data.catalog, edits.list());
    const fields = { std_category: '标准分类', std_level: '标准级别', internal_level: '内部级别',
      purposes: '允许用途（每行一个代码）', retention_rule: '保留期说明' };
    function control(name, value) {
      const id = 'catalog-' + name;
      const attrs = ' id="' + id + '" required aria-describedby="' + id + '-error"';
      let input;
      if (name === 'internal_level') {
        input = '<select' + attrs + '>' + [1, 2, 3, 4].map(level => '<option value="' + level + '"' +
          (level === value ? ' selected' : '') + '>L' + level + '</option>').join('') + '</select>';
      } else if (name === 'purposes' || name === 'retention_rule') {
        input = '<textarea' + attrs + '>' + esc(value) + '</textarea>';
      } else input = '<input' + attrs + ' value="' + esc(value) + '">';
      return '<label for="' + id + '">' + esc(fields[name]) + ' <small><code>' + name + '</code></small></label>' +
        input + '<p id="' + id + '-error" class="data-gov-error" role="alert"></p>';
    }
    function render() {
      const id = FLC.util.param('id');
      const showOp = location.hash === '#op' && !!id;
      list.hidden = showOp;
      op.hidden = !showOp;
      if (!showOp) {
        list.innerHTML = '<div class="data-gov-table-wrap"><table class="data-gov-table"><caption>字段级数据目录</caption>' +
          '<thead><tr><th scope="col">数据项 / 所属表与字段</th><th scope="col">分类分级</th><th scope="col">允许用途</th>' +
          '<th scope="col">保留期</th><th scope="col">责任人</th><th scope="col">销毁方式</th><th scope="col">操作</th></tr></thead><tbody>' +
          rows().map(row => '<tr><th scope="row">' + esc(row.item_name) + '<small><code>' + esc(row.table_name + '.' +
            row.column_names.join(', ')) + '</code></small></th><td>' + esc(row.std_category) + '<br>' + esc(row.std_level) +
            '<small>内部级别 L' + esc(row.internal_level) + '</small></td><td>' + row.purposes.map(code => label('purposes', code)).join('<br>') +
            '</td><td>' + esc(retention(row.retention_rule)) + '</td><td>' + esc((FLC.ACCOUNTS.find(account => account.id === row.steward_id) ||
              {}).name || row.steward_id) + '<small><code>' + esc(row.steward_id) + '</code></small></td><td>' + label('destroy_method', row.destroy_method) +
            '</td><td><a href="?id=' + esc(encodeURIComponent(row.id)) + '#op" aria-label="编辑' + esc(row.item_name) + '">编辑</a></td></tr>').join('') +
          '</tbody></table></div>';
        return;
      }
      const row = rows().find(item => item.id === id);
      op.innerHTML = '<a href="data-catalog.html">返回目录列表</a>';
      if (!row) { op.innerHTML += '<p>未找到该数据项。</p>'; return; }
      op.innerHTML += '<h2>编辑：' + esc(row.item_name) + '</h2><p><code>' + esc(row.table_name + '.' + row.column_names.join(', ')) +
        '</code></p><form id="catalog-form" class="data-gov-form" novalidate>' +
        Object.keys(fields).map(name => control(name, name === 'purposes' ? row.purposes.join('\n') :
          name === 'retention_rule' ? retention(row.retention_rule) : row[name])).join('') +
        '<div class="data-gov-actions"><button type="submit">保存目录编辑</button></div></form>';
      document.getElementById('catalog-form').addEventListener('submit', function (event) {
        event.preventDefault();
        const account = FLC.guard.currentAccount();
        if (FLC.guard.decide(path, account).action !== 'allow') {
          status.textContent = '当前账号无权保存，请切换账号。';
          return;
        }
        const value = name => document.getElementById('catalog-' + name).value.trim();
        const edit = { id: 'edit-' + row.id, item_id: row.id,
          std_category: value('std_category'), std_level: value('std_level'), internal_level: Number(value('internal_level')),
          purposes: value('purposes').split('\n').map(code => code.trim()).filter(Boolean), retention_rule: value('retention_rule') };
        const result = FLC.dataGov.validateCatalogEdit(edit);
        Object.keys(fields).forEach(name => {
          const invalid = !result.ok && result.fields.includes(name);
          document.getElementById('catalog-' + name).setAttribute('aria-invalid', String(invalid));
          document.getElementById('catalog-' + name + '-error').textContent = invalid ? '请填写' + fields[name] +
            (name === 'internal_level' ? '，限 L1–L4。' : '。') : '';
        });
        if (!result.ok) {
          document.getElementById('catalog-' + result.fields[0]).focus();
          return;
        }
        edits.upsert(edit);
        FLC.audit.log({ actor_id: account.id, action: 'catalog.edit', target: row.id, note: '更新分级、用途与保留期' });
        status.textContent = '目录编辑已保存，刷新页面后仍可查看。';
      });
    }
    window.addEventListener('hashchange', render);
    render();
  });
})(window.FLC);
