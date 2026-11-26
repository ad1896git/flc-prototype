window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'student/my-data.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const user = FLC.guard.currentAccount();
    const data = FLC.data.myData;
    const scopes = FLC.data.consentScopes;
    const esc = FLC.util.escapeHtml;
    const byId = id => document.getElementById(id);
    const collection = name => FLC.store.collection(name);
    const own = record => record.user_id === user.id;
    const labels = {
      granted: '已同意', declined: '不同意', withdrawn: '已撤回',
      pending: '待处理', done: '已完成', not_applicable: '不适用', failed: '处理失败',
      queued: '排队中', generating: '生成中', ready: '可下载', expired: '已过期',
      new: '新建', assigned: '已分派', in_progress: '处理中', resolved: '已解决',
      closed: '已关闭', escalated: '已升级', correction: '更正申请', deletion: '删除申请'
    };
    const label = code => FLC.ui.codeLabel(labels[code] || '未知状态', code);
    const time = value => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? '暂无时间' : date.toLocaleString('zh-CN', { hour12: false });
    };
    const stamp = value => '<time datetime="' + esc(value) + '">' + esc(time(value)) + '</time>';
    const list = values => '<ul>' + values.map(value => '<li>' + esc(value) + '</li>').join('') + '</ul>';
    const latest = (records, code) => records.filter(record => own(record) && record.scope_code === code)
      .reduce((last, record) => !last || record.seq > last.seq ? record : last, null);
    const say = message => { byId('page-status').textContent = message; };
    function paint(id, html) {
      const element = byId(id);
      if (element.innerHTML !== html) element.innerHTML = html;
    }

    function renderConsents() {
      const records = collection('consents').list();
      byId('consent-list').innerHTML = scopes.map(scope => {
        const record = latest(records, scope.code);
        const effective = FLC.consent.effective(records, scopes, user.id, scope.code);
        const stale = record && record.decision === 'granted' && record.scope_version !== scope.current_version;
        return '<article class="flc-card"><h3>' + esc(scope.title) + '</h3><p><code>' + esc(scope.code) +
          '</code> · 当前版本 v' + esc(scope.current_version) + '</p>' +
          (scope.example ? '<p class="mydata-note">示例场景，待数据管理部门确认</p>' : '') +
          '<details><summary>阅读告知全文</summary><p class="mydata-notice">' + esc(scope.notice_md) + '</p></details>' +
          '<p>当前决策：' + (record ? label(record.decision) + ' · v' + esc(record.scope_version) +
            ' · ' + stamp(record.decided_at) : '尚未选择') + '</p>' +
          '<p>当前版本有效同意：' + (effective ? '是' : '否') + '</p>' +
          (stale ? '<p class="flc-alert">告知内容已更新，需要重新确认</p>' : '') +
          (scope.active === false ? '<p class="mydata-note">场景已停用</p>' : '') +
          '<div class="flc-actions" role="group" aria-label="' + esc(scope.title) + '">' +
          '<button type="button" data-scope="' + esc(scope.code) + '" data-decision="granted"' +
            (scope.active === false ? ' disabled' : '') + '>同意</button>' +
          '<button type="button" class="flc-secondary" data-scope="' + esc(scope.code) + '" data-decision="declined"' +
            (scope.active === false ? ' disabled' : '') + '>不同意</button>' +
          '<button type="button" class="flc-secondary" data-scope="' + esc(scope.code) + '" data-decision="withdrawn"' +
            (!scope.withdrawable || scope.active === false || !record || record.decision === 'withdrawn' ? ' disabled' : '') +
            '>撤回</button></div></article>';
      }).join('');
    }

    function renderWithdrawals(now) {
      const tasks = collection('consent_withdrawal_tasks');
      const records = tasks.list().filter(own);
      records.forEach(task => {
        const status = FLC.consent.taskStatus(task, now);
        if (status !== task.status) {
          tasks.update(task.id, { status, done_at: task.complete_at });
          task.status = status;
          task.done_at = task.complete_at;
        }
      });
      const groups = new Map();
      records.forEach(task => {
        const key = task.scope_code + ':' + task.consent_seq;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(task);
      });
      paint('withdrawal-list', Array.from(groups.values()).reverse().map(batch => {
        const first = batch[0];
        const scope = scopes.find(item => item.code === first.scope_code);
        return '<article class="flc-card"><h3>' + esc(scope ? scope.title : first.scope_code) +
          ' · 撤回回执 #' + esc(first.consent_seq) + '</h3><p>撤回时间：' + stamp(first.created_at) +
          '</p><p>本次撤回已生效，相关新处理已停止。以下为各去向的演示处置状态。</p><ul class="mydata-receipts">' +
          batch.map(task => '<li><strong>' + esc(task.detail.title) + '</strong> <code>' + esc(task.sink) +
            '</code> · ' + label(task.status) + '<p>' + esc(task.detail.message) + '</p>' +
            '<p class="mydata-note">' + (task.status === 'pending' ? '预计处置时间：' + stamp(task.complete_at) :
              '处置时间：' + stamp(task.done_at)) + '</p></li>').join('') + '</ul></article>';
      }).join('') || '<p>暂无撤回回执。</p>');
    }

    function renderExports(now) {
      const rights = collection('data_rights');
      paint('export-list', rights.list().filter(record => own(record) && record.kind === 'export').reverse().map(record => {
        const status = FLC.dataRights.exportStatus(record, now);
        if (status !== record.status) rights.update(record.id, { status });
        const expires = new Date(Date.parse(record.created_at) + data.config.export_ready_ms + data.config.export_valid_ms).toISOString();
        return '<article class="flc-card"><h3>导出申请 · ' + label(status) + '</h3><p>申请时间：' +
          stamp(record.created_at) + '</p><p><code>' + esc(record.id) + '</code></p>' +
          (status === 'ready' ? '<p>24 小时有效，截止：' + stamp(expires) + '</p><button type="button" data-download="' +
            esc(record.id) + '">下载示例 JSON</button>' : '') +
          (status === 'expired' ? '<p>文件已过期，请重新验证并申请导出。</p>' : '') + '</article>';
      }).join('') || '<p>暂无导出申请。</p>');
    }

    function renderRequests() {
      const tickets = collection('cases').list().filter(ticket => ticket.type === 'data_right' && ticket.subject_user_id === user.id);
      paint('request-list', tickets.slice().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).map(ticket =>
        '<article class="flc-card"><h3>' + label(ticket.subtype) + '</h3><p>工单号：<code>' + esc(ticket.ticket_no) +
        '</code> · P2</p><p>提交时间：' + stamp(ticket.created_at) + '</p><p>当前状态：' + label(ticket.status) +
        '</p>' + (ticket.resolution ? '<p>处理结果：' + esc(ticket.resolution) + '</p>' : '') + '</article>'
      ).join('') || '<p>暂无更正或删除申请。</p>');
    }

    function renderAccess() {
      const entries = FLC.dataRights.accessLog(collection('audit').list(), user.id);
      paint('access-list', entries.map(entry => {
        const actor = FLC.ACCOUNTS.find(account => account.id === entry.actor_id);
        const roles = entry.actor_role ? [entry.actor_role] : actor ? actor.roles.map(item => item.role) : [];
        return '<article class="flc-card"><p>访问者：' + esc(actor ? actor.name : entry.actor_id || '未知访问者') +
          '</p><p>角色：' + (roles.length ? roles.map(role => FLC.ui.codeLabel(FLC.ROLE_NAMES[role] || '未知角色', role)).join('、') : '未知角色') +
          (!entry.actor_role && roles.length ? '（来自演示账号）' : '') + '</p><p>访问时间：' + stamp(entry.occurred_at) +
          '</p><p>查看学生会话 <code>' + esc(entry.action) + '</code></p><p>访问对象：<code>' +
          esc(entry.target || '暂无') + '</code></p></article>';
      }).join('') || '<p>暂无</p>');
    }

    function saveDecision(scope, decision) {
      const now = FLC.time.now();
      const consents = collection('consents');
      const records = FLC.consent.decide(consents.list(), user.id, scope.code, decision, scope.current_version, now);
      const record = records[records.length - 1];
      consents.upsert(record);
      if (decision === 'withdrawn') {
        FLC.consent.withdrawalTasks(record, now).forEach(task => collection('consent_withdrawal_tasks').upsert(task));
      }
      renderConsents();
      renderWithdrawals(now);
      say(scope.title + '：' + labels[decision] + (decision === 'withdrawn' ? '，撤回回执已生成。' : '，选择已保存。'));
    }

    let withdrawing = null;
    const dialog = byId('withdraw-dialog');
    byId('consent-list').addEventListener('click', function (event) {
      const button = event.target.closest('button[data-scope]');
      if (!button) return;
      const scope = scopes.find(item => item.code === button.dataset.scope);
      try {
        if (button.dataset.decision !== 'withdrawn') {
          saveDecision(scope, button.dataset.decision);
          // Restore keyboard position after replacing this scene's markup.
          byId('consent-list').querySelectorAll('button[data-scope]').forEach(item => {
            if (item.dataset.scope === scope.code && item.dataset.decision === button.dataset.decision) item.focus();
          });
          return;
        }
        withdrawing = scope;
        const impact = FLC.consent.withdrawImpact(scope);
        byId('withdraw-impact').innerHTML = '<h3>' + esc(scope.title) + '</h3><p>受影响的功能：</p>' + list(impact.affects) +
          '<p>数据去向：</p>' + list(impact.sinks.map(sink => data.sinkPolicies[sink].title + '（' + sink + '）：' + data.sinkPolicies[sink].detail));
        byId('withdraw-basic').textContent = impact.basic_services;
        byId('withdraw-error').textContent = '';
        dialog.showModal();
      } catch (error) { say(error.message); }
    });
    byId('withdraw-cancel').addEventListener('click', () => dialog.close());
    byId('withdraw-confirm').addEventListener('click', function () {
      if (!withdrawing) return;
      try {
        const scopeCode = withdrawing.code;
        saveDecision(withdrawing, 'withdrawn');
        dialog.close();
        byId('consent-list').querySelectorAll('button[data-scope]').forEach(button => {
          if (button.dataset.scope === scopeCode && button.dataset.decision === 'granted') button.focus();
        });
      } catch (error) { byId('withdraw-error').textContent = error.message; }
    });
    dialog.addEventListener('close', () => { withdrawing = null; });

    byId('export-form').addEventListener('submit', function (event) {
      event.preventDefault();
      const input = byId('export-code');
      byId('export-error').textContent = '';
      if (!/^[0-9]{6}$/.test(input.value)) {
        byId('export-error').textContent = '请输入任意 6 位数字验证码。';
        input.focus();
        return;
      }
      try {
        const now = FLC.time.now();
        const rights = collection('data_rights');
        let serial = now;
        while (rights.get('export-' + user.id + '-' + serial.toString(36))) serial += 1;
        rights.upsert({ id: 'export-' + user.id + '-' + serial.toString(36), user_id: user.id,
          kind: 'export', status: 'queued', created_at: new Date(now).toISOString(), ticket_id: null });
        input.value = '';
        renderExports(now);
        say('二次验证完成，导出申请已排队。');
      } catch (error) { byId('export-error').textContent = error.message; }
    });

    byId('export-list').addEventListener('click', function (event) {
      const button = event.target.closest('button[data-download]');
      if (!button) return;
      const record = collection('data_rights').get(button.dataset.download);
      if (!record || !own(record) || record.kind !== 'export' || FLC.dataRights.exportStatus(record, FLC.time.now()) !== 'ready') {
        renderExports(FLC.time.now());
        say('文件尚不可下载或已过期，请查看当前状态。');
        return;
      }
      const payload = { demo: true, note: '示例 JSON，仅含当前演示学生的数据，不代表完整生产导出。',
        user_id: user.id, exported_at: new Date(FLC.time.now()).toISOString(),
        categories: data.catalog.map(item => ({ category: item.category, purposes: item.purposes,
          retention: item.retention, sample_detail: '本人的' + item.category + '示例明细' })),
        consents: collection('consents').list().filter(own),
        requests: collection('data_rights').list().filter(own) };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'my-data-' + user.id + '-' + record.created_at.slice(0, 10) + '.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      say('示例 JSON 已生成并发起下载。');
    });

    document.querySelectorAll('form[data-request]').forEach(form => {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        const kind = form.dataset.request;
        const input = form.elements.content;
        byId(kind + '-error').textContent = '';
        try {
          const result = FLC.dataRights.requestCase(kind, user, input.value, collection('cases').list(), FLC.time.now());
          collection('cases').upsert(result.ticket);
          collection('data_rights').upsert(result.record);
          input.value = '';
          renderRequests();
          say(labels[kind] + '已提交，工单号：' + result.ticket.ticket_no);
        } catch (error) {
          byId(kind + '-error').textContent = error.message;
          input.focus();
        }
      });
    });

    byId('catalog-list').innerHTML = data.catalog.map(item => '<article class="flc-card"><h3>' + esc(item.category) +
      '</h3><p>用途：' + esc(item.purposes.join('、')) + '</p><p>保留期：' + esc(item.retention) + '</p></article>').join('');
    byId('sla-note').textContent = data.config.sla_note;
    const attention = data.warningAttention[user.id];
    byId('attention').innerHTML = attention ? '<p>是否被纳入预警关注：<strong>' + (attention.is_followed ? '是' : '否') +
      '</strong></p><p>辅导员确认的关注原因：' + esc(attention.reason) + '</p>' : '<p>暂无关注状态记录。</p>';
    byId('appeal-note').textContent = data.appeal_note;
    renderConsents();
    function refresh() {
      const now = FLC.time.now();
      renderWithdrawals(now);
      renderExports(now);
      renderRequests();
      renderAccess();
    }
    refresh();
    window.setInterval(refresh, 250);
    window.addEventListener('storage', function () { renderConsents(); refresh(); });
    window.addEventListener('focus', refresh);
  });
})(window.FLC);
