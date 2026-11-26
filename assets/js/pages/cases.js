window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'teacher/cases.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const account = FLC.guard.currentAccount();
    const tickets = FLC.store.collection('cases');
    const conversations = FLC.store.collection('conversations');
    const activities = FLC.store.collection('case_activity');
    const data = FLC.data.cases;
    data.ensureDemoCases(tickets, FLC.time.now());
    const queue = document.getElementById('case-list');
    const detail = document.getElementById('case-detail');
    const feedback = document.getElementById('case-feedback');
    const escape = FLC.util.escapeHtml;
    const label = (labels, code) => FLC.ui.codeLabel(labels[code] || code || '未设置', code || '');
    const actionLabels = { claim: '接手', assign: '接手', start: '开始处理', wait: '等待学生',
      resume: '继续处理', resolve: '处置', close: '关闭' };
    const actions = { new: ['claim'], escalated: ['assign'], assigned: ['start'],
      in_progress: ['wait', 'resolve'], waiting_student: ['resume'], resolved: ['close'], closed: [] };
    let selected = null;
    let renderedStatus = null;
    let sequence = 0;
    function context() {
      return { tasks: FLC.store.collection('tasks').list(), conversations: conversations.list(),
        groupMembers: data.groupMembers };
    }
    function visible() { return FLC.cases.visible(account, tickets.list(), context(), FLC.time.now()); }
    function student(ticket, access) {
      if (!access.realName) return escape(FLC.pseudo(ticket.subject_user_id, 'cases'));
      return escape((FLC.ACCOUNTS.find(item => item.id === ticket.subject_user_id) || {}).name || ticket.subject_user_id);
    }
    function person(id) { return escape((FLC.ACCOUNTS.find(item => item.id === id) || {}).name || id || '未分派'); }
    function message(text, error = false) {
      feedback.textContent = text;
      feedback.className = error ? 'case-error' : '';
    }
    function sla(ticket) {
      const value = FLC.cases.slaState(ticket, FLC.time.now());
      return '<span class="' + (value.warn ? 'case-warning' : '') + '">' + escape(value.label) +
        (value.warn && !value.overdue ? ' · 即将超时' : '') + '</span>' + (ticket.claimed_at ? '（已接手）' : '');
    }
    function state(ticket) { return FLC.cases.effectiveStatus(ticket, FLC.time.now()); }
    function renderQueue() {
      const list = visible();
      document.getElementById('case-count').textContent = list.length + ' 张可见工单';
      queue.innerHTML = list.map(ticket => '<li><a class="case-row" href="?id=' +
        escape(encodeURIComponent(ticket.id)) + '#op"' + (ticket.id === selected ? ' aria-current="true"' : '') +
        '><strong>' + escape(ticket.ticket_no) + '</strong><span>' + label(data.typeLabels, ticket.type) +
        ' · ' + escape(ticket.priority) + '</span><span>' + student(ticket, FLC.cases.access(account, ticket)) +
        '</span><span data-case-status="' + escape(ticket.id) + '">' + label(data.statusLabels, state(ticket)) +
        '</span><span data-case-sla="' + escape(ticket.id) + '">' + sla(ticket) + '</span></a></li>').join('') ||
        '<li>当前作用域暂无工单。</li>';
    }
    function field(name, value) { return '<dt>' + escape(name) + '</dt><dd>' + (value || '—') + '</dd>'; }
    function conversationSummary(ticket, access) {
      if (!access.showLearningLinks || ticket.type === 'crisis') return '';
      const ctx = context();
      const conv = typeof ticket.source_ref === 'string' && ctx.conversations.find(item => item.id === ticket.source_ref);
      if (!conv) return '';
      const task = ctx.tasks.find(item => item.id === conv.task_id);
      const problem = task && (task.problems || []).find(item => item.id === conv.problem_id);
      return '<section class="case-conversation"><h3>引用会话摘要</h3><p>' +
        '会话学习信息</p><dl class="case-fields">' +
        field('任务', escape(task ? task.title : conv.task_id)) + field('题目', escape(problem ? problem.stem : conv.problem_id)) +
        field('提示层级', escape(conv.hint_level)) + field('轮数', escape((conv.messages || []).filter(m => m.role === 'user').length)) +
        '</dl>' + ((conv.messages || []).some(m => m.sensitivity === 'crisis') ?
          '<p>[此消息已转由专业人员处理]</p>' : '') + '</section>';
    }
    function history(ticket) {
      const records = activities.list().filter(item => item.ticket_id === ticket.id);
      return '<section><h3>处理记录</h3><ol class="case-history">' + records.map(item => '<li>' +
        label(actionLabels, item.action) + ' · ' + label(data.statusLabels, item.from_status) + ' → ' +
        label(data.statusLabels, item.to_status) + '<br>' + person(item.actor_id) + ' · <code>' +
        escape(item.actor_id) + '</code> · ' + escape(item.occurred_at) + '</li>').join('') +
        '</ol>' + (records.length ? '' : '<p>暂无处理记录。</p>') + '</section>';
    }
    function renderDetail() {
      const ticket = visible().find(item => item.id === selected);
      if (!ticket) {
        detail.innerHTML = '<h2>工单详情</h2><p>工单不存在或不在当前账号的可见范围内。</p>';
        renderedStatus = null; return;
      }
      const access = FLC.cases.access(account, ticket);
      const summaryOnly = ticket.type === 'crisis' && account.roles.some(r => r.role === 'counselor') &&
        !account.roles.some(r => r.role === 'psych_staff');
      const status = state(ticket);
      const conv = typeof ticket.source_ref === 'string' && conversations.get(ticket.source_ref);
      const freezeNotice = conv ? '<p class="case-notice">' +
        (conv.status === 'frozen' ? '自动回复已冻结' : '自动回复未冻结') + '</p>' : '';
      renderedStatus = status;
      const available = access.canAct ? (actions[status] || []).filter(action =>
        action !== 'close' || ticket.type !== 'crisis' || account.roles.some(r => r.role === 'psych_staff')) : [];
      detail.innerHTML = '<h2 id="case-heading">' + escape(ticket.ticket_no) + '</h2><dl class="case-fields">' +
        field('类型', label(data.typeLabels, ticket.type)) + field('优先级', escape(ticket.priority)) +
        field('当事学生', student(ticket, access)) + field('有效状态', '<span id="detail-status">' + label(data.statusLabels, status) + '</span>') +
        field('SLA', '<span id="detail-sla">' + sla(ticket) + '</span>') + field('接手人', person(ticket.assignee_id)) +
        field('接手时间', escape(ticket.claimed_at)) + '</dl><h3>摘要</h3><p>' + escape(ticket.summary) + '</p>' + freezeNotice +
        (summaryOnly ? '<p class="case-notice">辅导员只可查看危机工单摘要，看不到正文（设计 §6.8.3）。</p>' :
          conversationSummary(ticket, access) + (ticket.resolution_code ? '<p>处置代码：' +
            label(data.resolutionLabels, ticket.resolution_code) + '</p><p>处置理由：' + escape(ticket.resolution) + '</p>' : '') +
          (access.canViewPayload ? '<button type="button" id="view-payload" class="flc-secondary">查看正文（此操作会被审计）</button><div id="case-payload" aria-live="polite"></div>' : '') +
          operationForm(available) + (!access.canAct ? '<p>当前账号仅可查看此工单。</p>' : '') + history(ticket));
      const form = document.getElementById('case-operation');
      if (form) form.addEventListener('submit', event => {
        event.preventDefault();
        const action = event.submitter && event.submitter.value;
        if (action) change(ticket, action);
      });
      const payloadButton = document.getElementById('view-payload');
      if (payloadButton) payloadButton.addEventListener('click', () => showPayload(ticket));
    }
    function operationForm(available) {
      if (!available.length) return '';
      return '<form id="case-operation" novalidate><h3>工单操作</h3>' +
        (available.includes('resolve') ? '<label for="case-resolution">处置理由（处置必填）</label>' +
          '<textarea id="case-resolution" rows="3" required aria-describedby="case-feedback"></textarea>' +
          '<label for="case-code">处置代码（处置必填）</label><select id="case-code" required aria-describedby="case-feedback">' +
          '<option value="">请选择处置代码</option>' + Object.keys(data.resolutionLabels).map(code =>
            '<option value="' + escape(code) + '">' + escape(data.resolutionLabels[code] + ' · ' + code) + '</option>').join('') + '</select>' : '') +
        '<div class="flc-actions">' + available.map(action => '<button type="submit" value="' + action +
          '" aria-describedby="case-feedback">' + escape(actionLabels[action]) + '</button>').join('') + '</div></form>';
    }
    function change(snapshot, action) {
      const current = visible().find(item => item.id === snapshot.id);
      if (!current || !FLC.cases.access(account, current).canAct || JSON.stringify(current) !== JSON.stringify(snapshot)) {
        render(); message('工单或权限已变化，请重新查看后操作。', true); return;
      }
      const reason = document.getElementById('case-resolution');
      const code = document.getElementById('case-code');
      const payload = { actor_id: account.id, actor_role: current.assignee_role,
        resolution: reason ? reason.value : '', resolution_code: code ? code.value : '' };
      if (action === 'resolve') {
        const missingReason = !payload.resolution.trim();
        const missingCode = !payload.resolution_code;
        reason.setAttribute('aria-invalid', String(missingReason));
        code.setAttribute('aria-invalid', String(missingCode));
        if (missingReason || missingCode) {
          message('处置理由和处置代码均为必填项。', true);
          (missingReason ? reason : code).focus(); return;
        }
      }
      const result = FLC.cases.transition(current, action, payload, FLC.time.now());
      if (!result.ok) { message('操作失败：' + result.code + '，请核对当前状态及必填项。', true); return; }
      tickets.upsert(result.ticket);
      let activityId;
      do { sequence += 1; activityId = 'case-activity-' + FLC.time.now() + '-' + sequence; } while (activities.get(activityId));
      activities.upsert({ ...result.activity, id: activityId });
      FLC.audit.log({ action: 'case.' + action, target: current.id, actor_id: account.id,
        subject_user_id: current.subject_user_id });
      const patch = FLC.cases.conversationPatch(result.ticket, action, context(), tickets.list());
      if (patch) conversations.update(patch.id, patch);
      render(); message(actionLabels[action] + '成功，处理记录和审计已保存。');
    }
    function showPayload(snapshot) {
      if (!window.confirm('此操作会被审计')) return;
      const ticket = visible().find(item => item.id === snapshot.id);
      if (!ticket || !FLC.cases.access(account, ticket).canViewPayload) {
        render(); message('当前账号无权查看正文。', true); return;
      }
      FLC.audit.log({ action: 'case.view_payload', target: ticket.id, actor_id: account.id,
        subject_user_id: ticket.subject_user_id });
      let body = ticket.payload_demo || '';
      if (!body && typeof ticket.source_ref === 'string') {
        const conv = conversations.get(ticket.source_ref);
        const ids = Array.isArray(ticket.source_msg_ids) ? ticket.source_msg_ids : [];
        body = conv ? (conv.messages || []).filter(m => ids.includes(m.id)).map(m => m.content).join('\n\n') : '';
      }
      document.getElementById('case-payload').textContent = body || '暂无可显示的正文。';
      message('正文查看已写入审计。');
    }
    function render() {
      const id = new URLSearchParams(window.location.search).get('id');
      selected = id || (visible()[0] || {}).id || null;
      renderQueue(); renderDetail();
    }
    const psych = account.roles.some(r => r.role === 'psych_staff');
    document.getElementById('case-policy').textContent = psych ?
      '心理中心人员只接收危机转介，不看学习数据（设计 §1.3）' :
      '本页显示实名的依据：教师限本教学班，辅导员限本学生组（设计 §6.11.4）；数据管理员为处理数据权利显示实名。';
    window.addEventListener('hashchange', () => { message(''); render(); });
    window.addEventListener('popstate', () => { message(''); render(); });
    window.addEventListener('storage', () => { message('工单数据已更新。'); render(); });
    render();
    window.setInterval(function () {
      const list = visible();
      document.querySelectorAll('[data-case-sla]').forEach(node => {
        const ticket = list.find(item => item.id === node.dataset.caseSla);
        if (ticket) node.innerHTML = sla(ticket);
      });
      document.querySelectorAll('[data-case-status]').forEach(node => {
        const ticket = list.find(item => item.id === node.dataset.caseStatus);
        if (ticket) node.innerHTML = label(data.statusLabels, state(ticket));
      });
      const ticket = list.find(item => item.id === selected);
      if (!ticket) return;
      const node = document.getElementById('detail-sla');
      if (node) node.innerHTML = sla(ticket);
      if (state(ticket) !== renderedStatus) renderDetail();
    }, 1000);
  });
})(window.FLC);
