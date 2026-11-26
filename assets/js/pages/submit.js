window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'student/submit.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const account = FLC.guard.currentAccount();
    const api = FLC.submission;
    const esc = FLC.util.escapeHtml;
    const byId = id => document.getElementById(id);
    const collection = name => FLC.store.collection(name);
    const form = byId('submission-form');
    const status = byId('submit-status');
    const taskId = FLC.util.param('task');
    let task;
    let snapshot;
    let itemSequence = 0;
    const fullFields = { tool: '工具名称', version: '版本', purpose: '用途', stage: '使用阶段', verification: '验证方式' };
    const errorId = field => 'error-' + field.replace(/\./g, '-');
    const errorSlot = field => '<p class="task-error" id="' + errorId(field) + '" data-error="' + esc(field) + '"></p>';
    const described = field => ' aria-describedby="' + errorId(field) + '" data-field="' + esc(field) + '"';
    const label = (labels, code) => (labels[code] || code) + '（' + code + '）';
    function accessibleTask() {
      const record = collection('tasks').get(taskId);
      return record && record.status === 'published' && FLC.SEED.enrollments.some(enrollment =>
        enrollment.user_id === account.id && enrollment.offering_id === record.offering_id &&
        enrollment.role === 'learner' && enrollment.status === 'active') ? record : null;
    }
    function readSnapshot() {
      return api.prefill(collection('conversations').list().filter(conversation =>
        conversation.user_id === account.id && conversation.task_id === task.id));
    }
    function unavailable() {
      byId('submit-task').textContent = taskId ? '任务不存在、未发布或不在本人选课教学班中。' : '请从任务详情选择要提交的任务。';
      form.hidden = true;
      byId('submit-receipt').hidden = true;
    }
    task = accessibleTask();
    if (!task) { unavailable(); return; }
    snapshot = readSnapshot();

    function showTask() {
      byId('submit-task').innerHTML = '<h2>' + esc(task.title) + '</h2>' +
        FLC.boundary.badgeHtml(task.ai_boundary, { taskId: task.id }) +
        '<p><a href="task.html?id=' + esc(encodeURIComponent(task.id)) + '">返回任务详情</a></p>';
    }
    showTask();
    FLC.boundary.bind(byId('submit-task'));
    const full = task.ai_boundary === 'restricted' || task.ai_boundary === 'encouraged';
    const forbidden = task.ai_boundary === 'forbidden';
    const formats = task.alt_submission_formats && task.alt_submission_formats.length ? task.alt_submission_formats : ['report'];
    const initialFormat = formats.includes('report') ? 'report' : formats[0];
    form.innerHTML = '<div class="flc-card"><h2>提交内容</h2><div class="task-field">' +
      '<label for="format">提交形式</label><select id="format"' + described('format') + '>' +
      formats.map(format => '<option value="' + esc(format) + '"' + (format === initialFormat ? ' selected' : '') + '>' +
        esc(label(api.LABELS.formats, format)) + '</option>').join('') + '</select>' + errorSlot('format') + '</div>' +
      '<div class="task-field"><label for="content-demo">正文</label><textarea id="content-demo" rows="7"' +
      described('content_demo') + '></textarea>' + errorSlot('content_demo') + '</div>' +
      '<div class="task-field"><label for="attachment-keys">附件名（一行一个）</label>' +
      '<p id="attachment-note" class="task-note">上传后经隔离扫描才可引用（示意）</p>' +
      '<textarea id="attachment-keys" rows="2" aria-describedby="attachment-note ' + errorId('attachment_keys') +
      '" data-field="attachment_keys"></textarea>' + errorSlot('attachment_keys') + '</div></div>' +
      '<fieldset><legend>AI 使用声明</legend>' + (forbidden ?
        '<p>本任务禁止使用 AI</p><label class="task-choice"><input id="pledge" type="checkbox"' + described('pledge') +
        '>我承诺本次任务未使用 AI，声明属实。</label>' + errorSlot('pledge') :
        '<fieldset><legend>是否使用 AI（必选）</legend>' +
        '<label class="task-choice"><input type="radio" name="used_ai" value="yes"' + described('used_ai') + '>使用</label>' +
        '<label class="task-choice"><input type="radio" name="used_ai" value="no"' + described('used_ai') + '>未使用</label>' +
        errorSlot('used_ai') + '</fieldset><p id="prefill-summary" class="task-note"></p>' +
        '<div id="tool-fields" hidden><div id="tool-items" aria-describedby="' + errorId('items') + '"></div>' +
        errorSlot('items') + '<button type="button" id="add-tool" class="flc-secondary"' + described('items') + '>' +
        (full ? '添加外部工具' : '添加工具') + '</button></div><p>点提交即视为声明属实。</p>') +
      '</fieldset><button type="submit">提交并保存声明</button>';

    function appendItem(item = {}) {
      const index = itemSequence++;
      const row = document.createElement('fieldset');
      row.className = 'task-tool';
      row.dataset.item = String(index);
      row.innerHTML = '<legend>工具 ' + (index + 1) + '</legend><div class="task-tool-grid">' +
        (full ? Object.keys(fullFields) : ['tool']).map(field => {
          const key = 'items.' + index + '.' + field;
          const id = 'tool-' + index + '-' + field;
          let control;
          if (field === 'stage') {
            control = '<select id="' + id + '" data-item-field="stage"' + described(key) + '><option value="">请选择阶段</option>' +
              Object.keys(api.LABELS.stages).map(stage => '<option value="' + esc(stage) + '">' +
                esc(label(api.LABELS.stages, stage)) + '</option>').join('') + '</select>';
          } else {
            control = '<input id="' + id + '" data-item-field="' + field + '" value="' + esc(item[field] || '') + '"' + described(key) + '>';
          }
          return '<div class="task-field"><label for="' + id + '">' + esc(fullFields[field]) + '</label>' + control + errorSlot(key) + '</div>';
        }).join('') + '</div><button type="button" class="flc-secondary" data-remove>移除此工具</button>';
      byId('tool-items').appendChild(row);
      row.querySelector('[data-remove]').addEventListener('click', function () {
        row.remove();
        byId('add-tool').focus();
      });
      return row;
    }
    function snapshotSummary() {
      if (forbidden) return;
      byId('prefill-summary').textContent = '平台学伴预填：提示 ' + snapshot.max_hint_level + '/3，' + snapshot.total_rounds +
        ' 轮；' + snapshot.problems.length + ' 道题。版本：' + snapshot.version + '。';
    }
    snapshotSummary();
    if (!forbidden) {
      appendItem(snapshot.total_rounds > 0 ? { tool: snapshot.tool, version: snapshot.version,
        purpose: '提示 ' + snapshot.max_hint_level + '/3，' + snapshot.total_rounds + ' 轮' } : {});
      byId('add-tool').addEventListener('click', function () {
        appendItem().querySelector('input').focus();
      });
      form.querySelectorAll('[name="used_ai"]').forEach(radio => radio.addEventListener('change', function () {
        byId('tool-fields').hidden = radio.value !== 'yes';
      }));
    }

    function readForm() {
      const selected = form.querySelector('[name="used_ai"]:checked');
      const rows = Array.from(form.querySelectorAll('[data-item]'));
      return {
        format: byId('format').value, content_demo: byId('content-demo').value,
        attachment_keys: byId('attachment-keys').value.split(/\r?\n/).map(value => value.trim()).filter(Boolean),
        pledge: forbidden && byId('pledge').checked,
        used_ai: selected ? selected.value === 'yes' : undefined,
        items: rows.map(row => Object.fromEntries(Array.from(row.querySelectorAll('[data-item-field]'))
          .map(input => [input.dataset.itemField, input.value]))), prefill_snapshot: snapshot
      };
    }
    function showErrors(result) {
      form.querySelectorAll('[data-error]').forEach(element => { element.textContent = ''; });
      form.querySelectorAll('[data-field]').forEach(element => element.removeAttribute('aria-invalid'));
      status.textContent = result.ok ? '' : result.code + '：请检查下方字段。';
      if (result.ok) return;
      const rows = Array.from(form.querySelectorAll('[data-item]'));
      let first;
      result.errors.forEach(error => {
        let field = error.field;
        const parts = field.split('.');
        if (parts[0] === 'items' && parts.length === 3 && rows[Number(parts[1])]) {
          field = 'items.' + rows[Number(parts[1])].dataset.item + '.' + parts[2];
        }
        const slot = byId(errorId(field));
        if (slot) slot.textContent = error.message;
        form.querySelectorAll('[data-field]').forEach(element => {
          if (element.dataset.field !== field) return;
          element.setAttribute('aria-invalid', 'true');
          if (!first) first = element;
        });
      });
      if (first) first.focus();
    }
    function receipt(record) {
      const declaration = record.declaration;
      const panel = byId('submit-receipt');
      panel.innerHTML = '<h2 id="receipt-title" tabindex="-1">提交回执</h2><p>版本 ' + esc(record.version) +
        '</p><p>提交时间：<time datetime="' + esc(record.submitted_at) + '">' +
        esc(new Date(record.submitted_at).toLocaleString('zh-CN', { hour12: false })) + '</time></p>' +
        '<p>声明摘要：' + esc(FLC.boundary.RULES[declaration.boundary].label) + '级；' +
        (declaration.used_ai ? '使用 AI；工具：' + esc(declaration.items.map(item => item.tool).join('、')) : '未使用 AI') +
        '；已承诺声明属实。</p><button type="button" id="submit-again">再次提交</button>';
      panel.hidden = false;
      form.hidden = true;
      byId('submit-again').addEventListener('click', function () {
        panel.hidden = true;
        form.hidden = false;
        status.textContent = '修订后提交将生成新版本。';
        byId('format').focus();
      });
    }
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const current = accessibleTask();
      if (!current) { unavailable(); return; }
      if (current.ai_boundary !== task.ai_boundary) {
        status.textContent = '任务边界已更新，请刷新后按新规则填写声明。';
        return;
      }
      task = current;
      snapshot = readSnapshot();
      snapshotSummary();
      const values = readForm();
      const result = api.validate(task, values);
      showErrors(result);
      if (!result.ok) return;
      try {
        const submissions = collection('submissions');
        const record = api.build(task, account, values, snapshot, submissions.list(), FLC.time.now());
        if (record.ok === false) { showErrors(record); return; }
        submissions.upsert(record);
        receipt(record);
        status.textContent = '提交已保存。';
        byId('receipt-title').focus();
      } catch (error) {
        status.textContent = '保存失败，请检查浏览器本地存储后重试。';
      }
    });
    const saved = api.latest(collection('submissions').list(), account.id, task.id);
    if (saved) receipt(saved);
    else form.hidden = false;
  });
})(window.FLC);
