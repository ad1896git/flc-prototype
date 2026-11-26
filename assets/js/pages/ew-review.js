window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'teacher/ew-review.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const account = FLC.guard.currentAccount();
    const store = FLC.store.collection('ew_alert');
    const cases = FLC.store.collection('cases');
    const view = document.getElementById('misc-view');
    const feedback = document.getElementById('misc-feedback');
    const escape = FLC.util.escapeHtml;
    const groups = account.roles.filter(role => role.role === 'counselor' && role.scope_type === 'student_group');
    const states = { waitlisted: '候补', pending_review: '待复核', confirmed: '已确认', dismissed: '已驳回', escalated: '已升级', closed: '已关闭' };
    const kinds = { risk: '风险', concern: '关注', kudos: '正向认可' };
    const urgency = { low: '低紧迫', high: '高紧迫' };
    const label = (labels, code) => FLC.ui.codeLabel(labels[code] || code, code);
    const scoped = () => store.list().filter(alert => groups.some(group => group.scope_id === alert.group_id));
    const student = id => escape((FLC.ACCOUNTS.find(item => item.id === id) || {}).name || id);
    function message(text, error = false) {
      feedback.textContent = text;
      feedback.className = error ? 'misc-error' : '';
    }
    function details(alert) {
      return '<p class="misc-status">' + label(states, alert.state) + ' · ' + label(urgency, alert.urgency) + ' · ' +
        label(kinds, alert.kind) + '</p><p>主要因素：' + escape((alert.top_factors || []).join('；') || '暂无') +
        '</p><p>风险分：' + escape(alert.score == null ? '无模型分数' : alert.score) + '</p>';
    }
    function ticketLink(alert) {
      if (!alert.case_ticket_id) return '';
      const ticket = cases.get(alert.case_ticket_id);
      return '<p>关联工单：<a href="cases.html?id=' + escape(encodeURIComponent(alert.case_ticket_id)) + '#op">' +
        escape(ticket ? ticket.ticket_no : alert.case_ticket_id) + '</a> · sensitive_decision（敏感决定）</p>';
    }
    function render() {
      const alerts = scoped();
      const intro = '<p class="misc-notice">本页显示实名：辅导员在本学生组作用域内可见</p><p>管理范围：' +
        groups.map(group => escape(group.scope_name)).join('、') + '</p>';
      if (window.location.hash !== '#op') {
        view.innerHTML = intro + '<ul class="misc-list">' + alerts.map(alert => '<li class="misc-card"><h2>' +
          student(alert.student_id) + '</h2>' + details(alert) + ticketLink(alert) + '<a href="?id=' +
          escape(encodeURIComponent(alert.id)) + '#op">' + (alert.state === 'pending_review' ? '复核预警' : '查看复核结果') +
          '</a></li>').join('') + '</ul>' + (alerts.length ? '' : '<p>本学生组暂无预警。</p>');
        return;
      }
      const id = FLC.util.param('id');
      const alert = id ? alerts.find(item => item.id === id) : alerts.find(item => item.state === 'pending_review') || alerts[0];
      if (!alert) {
        view.innerHTML = intro + '<p>预警不存在或不在本学生组作用域内。</p><a href="ew-review.html">返回预警列表</a>';
        return;
      }
      view.innerHTML = intro + '<section id="op" class="misc-card"><a href="ew-review.html">返回预警列表</a><h2>' +
        student(alert.student_id) + '</h2>' + details(alert) + '<p>' + escape(alert.note) + '</p>' + ticketLink(alert) +
        (alert.state === 'pending_review' ? '<form id="review-form" class="misc-form"><label for="review-reason">复核理由（驳回必填）' +
          '<textarea id="review-reason" aria-describedby="review-help misc-feedback"></textarea></label>' +
          '<p id="review-help">确认记录人工结论；转工单由辅导员继续人工处置。此原型不发送外联。</p>' +
          '<div class="flc-actions"><button type="submit" value="confirm">确认</button>' +
          '<button type="submit" value="dismiss" class="flc-secondary">驳回</button>' +
          '<button type="submit" value="escalate" class="flc-secondary">转为 sensitive_decision 工单</button></div></form>' :
          '<p>复核理由：' + escape(alert.review_reason) + '</p><p>复核时间：' + escape(alert.reviewed_at) + '</p>') + '</section>';
      if (alert.state !== 'pending_review') return;
      const reason = document.getElementById('review-reason');
      document.getElementById('review-form').addEventListener('submit', function (event) {
        event.preventDefault();
        const current = scoped().find(item => item.id === alert.id);
        if (!current || JSON.stringify(current) !== JSON.stringify(alert)) {
          render(); message('预警状态已变化，请重新查看后复核。', true); return;
        }
        const action = event.submitter ? event.submitter.value : 'confirm';
        const result = FLC.teacherMisc.reviewAlert(current, action, reason.value,
          { actor_id: account.id, now: FLC.time.now(), cases: cases.list() });
        if (!result.ok) {
          message(result.reason, true);
          if (result.code === 'ALERT_REASON_REQUIRED') { reason.setAttribute('aria-invalid', 'true'); reason.focus(); }
          return;
        }
        if (result.ticket) {
          cases.upsert({ ...result.ticket, group_id: current.group_id });
          FLC.audit.log({ actor_id: account.id, action: 'case.intake', target: result.ticket.id, note: '预警转敏感决定工单' });
        }
        store.upsert(result.alert);
        FLC.audit.log({ actor_id: account.id, action: 'ew.alert.review', target: current.id, note: result.alert.review_reason });
        render();
        message(result.ticket ? '已创建工单 ' + result.ticket.ticket_no + '，可从关联工单链接进入队列。' : '复核结果已保存。');
      });
      reason.addEventListener('input', () => reason.removeAttribute('aria-invalid'));
    }
    window.addEventListener('hashchange', function () { message(''); render(); });
    render();
  });
})(window.FLC);
