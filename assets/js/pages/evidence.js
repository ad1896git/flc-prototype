window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  function tasksFor(account) {
    const offerings = FLC.SEED.enrollments.filter(item => item.user_id === account.id && item.status === 'active')
      .map(item => item.offering_id);
    return FLC.store.collection('tasks').list().filter(task =>
      offerings.includes(task.offering_id) && ['published', 'closed'].includes(task.status));
  }

  function validateKWL(values, tasks) {
    const errors = {};
    if (!tasks.some(task => task.id === values.task_id)) errors.task = '请选择本人课程中的任务。';
    ['k', 'w', 'l'].forEach(key => {
      if (!String(values[key] || '').trim()) errors[key] = '请填写 ' + key.toUpperCase() + ' 栏内容，不能只填空白。';
    });
    return errors;
  }
  FLC.evidence = { tasksFor, validateKWL };

  document.addEventListener('DOMContentLoaded', function () {
    const path = 'student/evidence.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const escape = FLC.util.escapeHtml;
    const misc = FLC.data.studentMisc;
    const entries = FLC.store.collection('evidence_entries');
    const form = document.getElementById('kwl-form');
    const select = document.getElementById('kwl-task');
    const time = value => new Date(value).toLocaleString('zh-CN', { hour12: false });

    function content(entry) {
      if (entry.type === 'kwl') return '<dl>' + ['k', 'w', 'l'].map(key =>
        '<dt>' + key.toUpperCase() + '</dt><dd>' + escape(entry[key]) + '</dd>').join('') + '</dl>';
      if (entry.type === 'progress') {
        const color = Object.prototype.hasOwnProperty.call(misc.progressLabels, entry.color) ? entry.color : null;
        return '<p><span class="' + (color ? 'progress-' + color : 'misc-badge') + '">' +
          (color ? FLC.ui.codeLabel(misc.progressLabels[color], color) : '进度未标记') +
          '</span></p><p>' + escape(entry.note) + '</p>';
      }
      if (entry.type === 'reflection') return '<p>' + escape(entry.content) + '</p>';
      return '<p><strong>' + escape(entry.title) + '</strong></p><p>' + escape(entry.description) + '</p>';
    }

    function render() {
      const account = FLC.guard.currentAccount();
      if (FLC.guard.decide(path, account).action !== 'allow') return;
      const tasks = tasksFor(account);
      const records = entries.list().filter(entry => entry.user_id === account.id)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
      const op = window.location.hash === '#op';
      document.getElementById('evidence-list-view').hidden = op;
      document.getElementById('evidence-op-view').hidden = !op;
      document.getElementById('evidence-list').innerHTML = tasks.map(task => {
        const taskEntries = records.filter(entry => entry.task_id === task.id);
        return '<section class="evidence-group"><h2>' + escape(task.title) + '</h2>' +
          '<p><a href="?id=' + escape(encodeURIComponent(task.id)) + '#op">为此任务填写 KWL</a></p>' +
          Object.entries(misc.evidenceTypes).map(([type, label]) => {
            const items = taskEntries.filter(entry => entry.type === type);
            return '<section class="evidence-entry"><h3>' + FLC.ui.codeLabel(label, type) + '</h3>' +
              (items.length ? items.map(entry => '<article><p class="misc-meta">' +
                escape(time(entry.created_at)) + '</p>' + content(entry) + '</article>').join('') :
                '<p>暂无' + escape(label) + '记录。</p>') + '</section>';
          }).join('') + '</section>';
      }).join('') || '<p>暂无可展示的任务。</p>';

      const requested = FLC.util.param('id');
      const previous = select.value;
      select.innerHTML = tasks.map(task => '<option value="' + escape(task.id) + '">' +
        escape(task.title) + '</option>').join('');
      select.value = requested !== null ? requested :
        (tasks.some(task => task.id === previous) ? previous : (tasks[0] ? tasks[0].id : ''));
      const unavailable = !tasks.some(task => task.id === select.value);
      form.hidden = unavailable;
      document.getElementById('evidence-op-notice').textContent = unavailable ?
        '未找到可填写的任务，请返回列表选择本人课程中的任务。' : 'K、W、L 三栏均为必填。';
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const account = FLC.guard.currentAccount();
      if (FLC.guard.decide(path, account).action !== 'allow') return;
      const values = { task_id: select.value };
      ['k', 'w', 'l'].forEach(key => { values[key] = form.elements[key].value.trim(); });
      const errors = validateKWL(values, tasksFor(account));
      let firstError = null;
      ['task', 'k', 'w', 'l'].forEach(key => {
        const field = document.getElementById('kwl-' + key);
        document.getElementById('kwl-' + key + '-error').textContent = errors[key] || '';
        field.setAttribute('aria-invalid', errors[key] ? 'true' : 'false');
        if (errors[key] && !firstError) firstError = field;
      });
      document.getElementById('kwl-save-error').textContent = '';
      document.getElementById('evidence-status').textContent = '';
      if (firstError) { firstError.focus(); return; }
      try {
        const now = FLC.time.now();
        let uniqueTime = now;
        while (entries.get('ev-' + account.id + '-' + uniqueTime.toString(36))) uniqueTime += 1;
        entries.upsert(Object.assign({}, values, {
          id: 'ev-' + account.id + '-' + uniqueTime.toString(36), user_id: account.id,
          type: 'kwl', created_at: new Date(now).toISOString()
        }));
      } catch (error) {
        document.getElementById('kwl-save-error').textContent = '保存失败，请检查浏览器是否允许本地存储后重试；填写内容已保留。';
        return;
      }
      form.reset();
      document.getElementById('evidence-status').textContent = 'KWL 已保存，可在所属任务的列表中查看。';
      window.location.hash = '';
      render();
      const status = document.getElementById('evidence-status');
      status.setAttribute('tabindex', '-1');
      status.focus();
    });
    render();
    window.addEventListener('hashchange', render);
    window.addEventListener('pageshow', render);
  });
})(window.FLC);
