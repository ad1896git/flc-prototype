window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'admin/consent-scopes.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const data = FLC.data.dataGov;
    const versions = FLC.store.collection('consent_scope_versions');
    const list = document.getElementById('gov-list');
    const op = document.getElementById('op');
    const status = document.getElementById('gov-status');
    const esc = FLC.util.escapeHtml;
    const rows = () => FLC.dataGov.scopeRows(FLC.data.consentScopes, versions.list(), data.scopeExtras);
    const example = row => row.example ? '<p class="data-gov-help">示例场景，待数据管理部门确认</p>' : '';
    function render() {
      const id = FLC.util.param('id');
      const showOp = location.hash === '#op' && !!id;
      list.hidden = showOp;
      op.hidden = !showOp;
      if (!showOp) {
        list.innerHTML = '<div class="data-gov-table-wrap"><table class="data-gov-table"><caption>同意场景（与学生端共用定义）</caption>' +
          '<thead><tr><th scope="col">场景代码</th><th scope="col">标题</th><th scope="col">当前版本</th><th scope="col">可否撤回</th>' +
          '<th scope="col">未成年人策略</th><th scope="col">有效同意人数（演示）</th><th scope="col">操作</th></tr></thead><tbody>' +
          rows().map(row => '<tr><th scope="row"><code>' + esc(row.code) + '</code></th><td>' + esc(row.title) + example(row) +
            '</td><td>' + esc(row.current_version) + '</td><td>' + (row.withdrawable ? '可撤回' : '不可撤回') + '</td><td>' +
            FLC.ui.codeLabel(data.labels.minors_policy[row.minors_policy] || row.minors_policy, row.minors_policy) + '</td><td>' +
            esc(row.effective_count) + '</td><td><a href="?id=' + esc(encodeURIComponent(row.code)) + '#op" aria-label="为' + esc(row.title) +
            '发布新版本">发布新版本</a></td></tr>').join('') + '</tbody></table></div>';
        return;
      }
      const row = rows().find(scope => scope.code === id);
      op.innerHTML = '<a href="consent-scopes.html">返回同意范围列表</a>';
      if (!row) { op.innerHTML += '<p>未找到该同意场景。</p>'; return; }
      op.innerHTML += '<h2>发布新版本：' + esc(row.title) + '</h2><p><code>' + esc(row.code) + '</code></p>' + example(row) +
        '<p>当前版本：<strong>' + esc(row.current_version) + '</strong>；待发布版本：<strong>' + esc(row.current_version + 1) + '</strong></p>' +
        '<p class="data-gov-notice">发布后旧版本的同意不再有效，需要重新征询。</p>' +
        '<form id="scope-form" class="data-gov-form" novalidate>' +
        '<label for="scope-notice">1. 编辑告知全文 <small><code>notice_md</code></small></label>' +
        '<textarea id="scope-notice" rows="10" required aria-describedby="scope-help scope-error">' + esc(row.notice_md) + '</textarea>' +
        '<p id="scope-help" class="data-gov-help">告知文本必填。先预览，再发布；预览按纯文本显示。</p>' +
        '<p id="scope-error" class="data-gov-error" role="alert"></p>' +
        '<div class="data-gov-actions"><button type="button" id="scope-preview-button">2. 预览告知</button>' +
        '<button type="submit" id="scope-publish" disabled>3. 发布新版本</button></div>' +
        '<section id="scope-preview-section" aria-label="告知预览" hidden><h3>学生告知预览</h3>' +
        '<p id="scope-preview-version"></p><div id="scope-preview" class="data-gov-preview"></div></section></form>';
      const notice = document.getElementById('scope-notice');
      const error = document.getElementById('scope-error');
      const preview = document.getElementById('scope-preview-section');
      const publish = document.getElementById('scope-publish');
      let snapshot = null;
      function invalidate() {
        snapshot = null;
        preview.hidden = true;
        publish.disabled = true;
      }
      notice.addEventListener('input', function () {
        invalidate();
        error.textContent = '';
        notice.removeAttribute('aria-invalid');
      });
      function validateNotice() {
        const valid = !!notice.value.trim();
        notice.setAttribute('aria-invalid', String(!valid));
        error.textContent = valid ? '' : data.labels.errors.CONSENT_NOTICE_REQUIRED + '（CONSENT_NOTICE_REQUIRED）。';
        if (!valid) { invalidate(); notice.focus(); }
        return valid;
      }
      document.getElementById('scope-preview-button').addEventListener('click', function () {
        if (!validateNotice()) return;
        const current = rows().find(scope => scope.code === id);
        snapshot = { notice: notice.value.trim(), version: current.current_version };
        document.getElementById('scope-preview').textContent = snapshot.notice;
        document.getElementById('scope-preview-version').textContent = '待发布版本：' + (snapshot.version + 1);
        preview.hidden = false;
        publish.disabled = false;
      });
      document.getElementById('scope-form').addEventListener('submit', function (event) {
        event.preventDefault();
        const account = FLC.guard.currentAccount();
        if (FLC.guard.decide(path, account).action !== 'allow') {
          status.textContent = '当前账号无权发布，请切换账号。';
          return;
        }
        if (!validateNotice()) return;
        const current = rows().find(scope => scope.code === id);
        if (!snapshot || snapshot.notice !== notice.value.trim() || snapshot.version !== current.current_version) {
          invalidate();
          error.textContent = '告知内容或当前版本已变化，请重新预览后发布。';
          return;
        }
        const result = FLC.dataGov.publishVersion(current, versions.list(), notice.value, account, FLC.time.now());
        if (!result.ok) {
          error.textContent = data.labels.errors[result.code] || result.code;
          notice.setAttribute('aria-invalid', 'true');
          notice.focus();
          return;
        }
        versions.upsert(result.record);
        FLC.audit.log({ actor_id: account.id, action: 'consent.scope.publish', target: result.record.id,
          note: '发布 ' + current.code + ' v' + result.record.version + '，需要重新征询' });
        status.textContent = '已发布版本 ' + result.record.version + '。旧同意失效：' + result.message + '。';
        render();
      });
    }
    window.addEventListener('hashchange', render);
    render();
  });
})(window.FLC);
