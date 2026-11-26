window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'teacher/cert-issue.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const account = FLC.guard.currentAccount();
    const store = FLC.store.collection('user_cert');
    const view = document.getElementById('misc-view');
    const feedback = document.getElementById('misc-feedback');
    const escape = FLC.util.escapeHtml;
    const nodes = account.roles.filter(role => role.role === 'equipment_tech' && role.scope_type === 'space_node');
    const students = FLC.ACCOUNTS.filter(item => item.roles.some(role => role.role === 'student'));
    const scoped = () => FLC.teacherMisc.certsInScope(account, store.list());
    const student = id => escape((students.find(item => item.id === id) || {}).name || id);
    const certName = code => FLC.ui.codeLabel(code === 'laser_basic' ? '激光设备基础培训' : code, code);
    const nodeName = id => escape((nodes.find(node => node.scope_id === id) || {}).scope_name || id);
    function message(text, error = false) {
      feedback.textContent = text;
      feedback.className = error ? 'misc-error' : '';
    }
    function status(cert) {
      if (cert.revoked_at) return '已撤销';
      return Date.parse(cert.expires_at) <= FLC.time.now() ? '已过期' : '有效';
    }
    function persist(cert, action, note) {
      store.upsert(cert);
      FLC.audit.log({ actor_id: account.id, action, target: cert.id, note });
    }
    function render() {
      const certs = scoped();
      const intro = '<p class="misc-notice">管理范围：' + nodes.map(node => FLC.ui.codeLabel(node.scope_name, node.scope_id)).join('、') +
        '。仅管理授权节点内的设备培训认证。</p>';
      if (window.location.hash !== '#op') {
        view.innerHTML = intro + '<p><a href="cert-issue.html#op">签发认证</a></p><div class="misc-table-wrap">' +
          '<table class="misc-table"><caption>本节点认证记录（保留历次签发）</caption><thead><tr>' +
          '<th scope="col">学生</th><th scope="col">认证 cert_code</th><th scope="col">节点</th><th scope="col">签发时间</th>' +
          '<th scope="col">有效期截止</th><th scope="col">状态</th><th scope="col">操作</th></tr></thead><tbody>' +
          certs.map(cert => '<tr><td>' + student(cert.user_id) + '</td><td>' + certName(cert.cert_code) + '</td><td>' +
            nodeName(cert.node_id) + '</td><td>' + escape(cert.issued_at) + '</td><td>' + escape(cert.expires_at) +
            '</td><td>' + status(cert) + '</td><td><a href="?id=' + escape(encodeURIComponent(cert.id)) +
            '#op">' + (cert.revoked_at ? '查看撤销结果' : '查看 / 撤销') + '</a></td></tr>').join('') +
          '</tbody></table></div>' + (certs.length ? '' : '<p>本节点暂无认证记录。</p>');
        return;
      }
      const id = FLC.util.param('id');
      if (id !== null) {
        const cert = certs.find(item => item.id === id);
        if (!cert) {
          view.innerHTML = intro + '<p>认证不存在或无权管理该节点。</p><a href="cert-issue.html">返回认证列表</a>';
          return;
        }
        view.innerHTML = intro + '<section id="op" class="misc-card"><a href="cert-issue.html">返回认证列表</a><h2>认证详情 / 撤销</h2><p>' +
          student(cert.user_id) + ' · ' + certName(cert.cert_code) + ' · ' + nodeName(cert.node_id) + '</p><p>状态：' + status(cert) +
          '</p><p>签发时间：' + escape(cert.issued_at) + '</p><p>有效期截止：' + escape(cert.expires_at) + '</p>' +
          (cert.revoked_at ? '<p>撤销时间：' + escape(cert.revoked_at) + '</p><p>撤销理由：' + escape(cert.revoke_reason) + '</p>' :
            '<form id="revoke-form" class="misc-form"><label for="revoke-reason">撤销理由（必填）' +
            '<textarea id="revoke-reason" aria-required="true" aria-describedby="misc-feedback"></textarea></label>' +
            '<button type="submit">撤销认证</button></form>') + '</section>';
        if (cert.revoked_at) return;
        const reason = document.getElementById('revoke-reason');
        document.getElementById('revoke-form').addEventListener('submit', function (event) {
          event.preventDefault();
          const current = scoped().find(item => item.id === cert.id);
          if (!current || JSON.stringify(current) !== JSON.stringify(cert)) {
            render(); message('认证状态已变化，请重新查看。', true); return;
          }
          const result = FLC.teacherMisc.revokeCert(current, reason.value, { now: FLC.time.now() });
          if (!result.ok) {
            message(result.reason, true);
            if (result.code === 'CERT_REASON_REQUIRED') { reason.setAttribute('aria-invalid', 'true'); reason.focus(); }
            return;
          }
          persist(result.cert, 'space.cert.revoked', result.cert.revoke_reason);
          render(); message('认证已撤销，理由已保存。');
        });
        reason.addEventListener('input', () => reason.removeAttribute('aria-invalid'));
        return;
      }
      const types = [...new Map(certs.map(cert => [JSON.stringify([cert.node_id, cert.cert_code]),
        { node_id: cert.node_id, cert_code: cert.cert_code }])).values()];
      view.innerHTML = intro + '<section id="op" class="misc-card"><a href="cert-issue.html">返回认证列表</a><h2>签发认证</h2>' +
        '<form id="issue-form" class="misc-form" novalidate><label for="cert-student">学生<select id="cert-student" required aria-describedby="misc-feedback">' +
        '<option value="">请选择学生</option>' + students.map(item => '<option value="' + escape(item.id) + '">' + escape(item.name) + '</option>').join('') +
        '</select></label><label for="cert-type">认证<select id="cert-type" required aria-describedby="misc-feedback"><option value="">请选择认证</option>' +
        types.map((type, index) => '<option value="' + index + '">' + escape(type.cert_code === 'laser_basic' ? '激光设备基础培训' : type.cert_code) +
          ' · ' + escape(type.cert_code) + ' · ' + nodeName(type.node_id) + '</option>').join('') +
        '</select></label><label for="cert-expiry">有效期截止（本地时间）<input type="datetime-local" id="cert-expiry" required aria-describedby="misc-feedback"></label>' +
        '<button type="submit"' + (types.length ? '' : ' disabled') + '>签发认证</button></form>' +
        (types.length ? '' : '<p>本节点没有可选认证类型。</p>') + '</section>';
      const selectedStudent = document.getElementById('cert-student');
      const selectedType = document.getElementById('cert-type');
      const expiry = document.getElementById('cert-expiry');
      const invalid = (field, text) => { message(text, true); field.setAttribute('aria-invalid', 'true'); field.focus(); };
      [selectedStudent, selectedType, expiry].forEach(field => field.addEventListener('input', () => field.removeAttribute('aria-invalid')));
      document.getElementById('issue-form').addEventListener('submit', function (event) {
        event.preventDefault();
        if (!students.some(item => item.id === selectedStudent.value)) { invalid(selectedStudent, '请选择学生。'); return; }
        const type = selectedType.value === '' ? null : types[Number(selectedType.value)];
        if (!type || !scoped().some(cert => cert.node_id === type.node_id && cert.cert_code === type.cert_code)) {
          invalid(selectedType, '请选择管理范围内的认证。'); return;
        }
        const expiresAt = new Date(expiry.value).getTime();
        if (!Number.isFinite(expiresAt)) { invalid(expiry, '请填写有效期截止时间。'); return; }
        const now = FLC.time.now();
        const result = FLC.teacherMisc.issueCert({ ...type, user_id: selectedStudent.value,
          expires_at: new Date(expiresAt).toISOString() }, { account, now });
        if (!result.ok) { invalid(expiry, result.reason); return; }
        if (store.list().some(cert => cert.id === result.cert.id || (cert.user_id === result.cert.user_id &&
            cert.cert_code === result.cert.cert_code && cert.issued_at === result.cert.issued_at))) {
          message('该时刻的签发记录已存在，请查看认证列表。', true); return;
        }
        persist(result.cert, 'space.cert.issued', '技术员签发节点培训认证：' + result.cert.cert_code);
        render(); message('认证已签发，可返回列表查看，刷新后保留。');
      });
    }
    window.addEventListener('hashchange', function () { message(''); render(); });
    render();
  });
})(window.FLC);
