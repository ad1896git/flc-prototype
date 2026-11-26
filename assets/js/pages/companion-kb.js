window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    if (FLC.guard.decide('teacher/companion-kb.html', FLC.guard.currentAccount()).action !== 'allow') return;
    const $ = id => document.getElementById(id);
    const escape = FLC.util.escapeHtml;
    const account = FLC.guard.currentAccount();
    const data = FLC.data.teacher;
    const config = FLC.data.teacherKb;
    const offerings = data.offerings.filter(item => item.teacher_id === account.id);
    const tasks = FLC.store.collection('tasks');
    const bindings = FLC.store.collection('agent_binding');
    const documents = FLC.store.collection('kb_document');
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('id') || params.get('offering');
    let offering = offerings.find(item => item.id === requested) || (!requested && offerings[0]);
    if (!offering) {
      $('kb-alert').textContent = '教学班不存在或无权管理该教学班，请返回我的课程。';
      $('kb-alert').hidden = false;
      return;
    }
    const statuses = { uploaded: '已上传', scanning: '扫描中', rejected: '已拒绝', parsing: '解析中',
      chunking: '切分中', embedding: '向量化中', ready: '可检索', failed: '失败', archived: '已归档' };
    const label = (text, code) => escape(text || code) + ' <small class="flc-code">' + escape(code) + '</small>';
    const supported = agent => (agent.supported_boundaries || []).map(level =>
      label(FLC.boundary.RULES[level] && FLC.boundary.RULES[level].label, level)).join('、');
    const classTasks = () => tasks.list().filter(task => task.offering_id === offering.id);
    const selectedTask = () => {
      const task = tasks.get($('kb-task').value);
      return task && task.offering_id === offering.id ? task : null;
    };
    function error(id, result) {
      $(id).textContent = (result.code ? result.code + '：' : '') + result.reason;
      $(id).focus();
    }
    function view() {
      const op = window.location.hash === '#op';
      $('kb-list-view').hidden = op;
      $('kb-op-view').hidden = !op;
    }
    function syncUrl() {
      const query = '?id=' + encodeURIComponent(offering.id);
      window.history.replaceState(null, '', query + window.location.hash);
      $('kb-open-op').href = query + '#op';
      $('kb-back').href = query + '#';
    }
    function renderBindings() {
      const rows = bindings.list().filter(binding => binding.offering_id === offering.id && binding.enabled);
      $('kb-bindings').innerHTML = rows.map(binding => {
        const agent = data.agents.find(item => item.id === binding.agent_id);
        const task = binding.task_id && tasks.get(binding.task_id);
        return '<li class="teacher-list-item"><h3>' + escape(agent ? agent.name : binding.agent_id) +
          '</h3><p>版本 <small class="flc-code">version_pin</small>：' +
          escape(binding.version_pin == null ? (agent ? agent.published_version : '跟随已发布版本') : binding.version_pin) +
          '</p><p>支持等级 <small class="flc-code">supported_boundaries</small>：' +
          (agent ? supported(agent) : '智能体资料不可用') + '</p><p>绑定范围：' +
          escape(binding.task_id ? (task ? task.title : binding.task_id) : '整个教学班') + '</p></li>';
      }).join('') || '<li>暂无已启用的智能体绑定。</li>';
    }
    function renderDocuments() {
      const rows = documents.list().filter(doc => doc.offering_id === offering.id);
      const html = rows.map(doc => '<li class="teacher-list-item"><h3>' + escape(doc.title) +
        '</h3><p>版本 <small class="flc-code">version</small>：' + escape(doc.version) +
        ' · <span class="teacher-status">' + label(statuses[doc.status], doc.status) + '</span></p></li>').join('');
      $('kb-documents').innerHTML = html || '<li>暂无文档，请上传演示材料。</li>';
      $('kb-upload-progress').innerHTML = html || '<li>上传后将在此显示入库状态。</li>';
    }
    function advanceParsing() {
      let changed = false;
      documents.list().filter(doc => doc.offering_id === offering.id && doc.status === 'parsing')
        .forEach(doc => {
          if (doc.ready_at && FLC.time.now() >= Date.parse(doc.ready_at)) {
            documents.update(doc.id, { status: 'ready' });
            changed = true;
          }
        });
      if (changed) {
        renderDocuments();
        $('kb-message').textContent = '文档解析模拟完成，状态已更新为可检索（ready）。';
      }
    }
    function renderAgents() {
      const task = selectedTask();
      $('kb-bind-error').textContent = '';
      $('kb-task-note').textContent = task ? '仅更换此任务的绑定；教学班级绑定保留。' : '该班暂无任务，请先在我的课程中新建任务设计卡。';
      $('kb-task-boundary').innerHTML = task ? FLC.boundary.badgeHtml(task.ai_boundary, { taskId: task.id }) : '';
      const current = task && bindings.list().find(binding => binding.task_id === task.id && binding.enabled);
      const results = data.agents.map(agent => ({ agent, result: task ? FLC.taskEditor.canBindAgent(agent, task) :
        { ok: false, reason: '请先创建并选择任务。' } }));
      const preferred = results.find(item => item.result.ok && current && item.agent.id === current.agent_id) ||
        results.find(item => item.result.ok);
      $('kb-agent-options').innerHTML = results.map(({ agent, result }, index) => {
        const id = 'kb-agent-' + index;
        return '<div class="kb-agent-choice"><input type="radio" name="kb-agent" id="' + id +
          '" value="' + escape(agent.id) + '" aria-describedby="' + id + '-note kb-bind-error"' +
          (!result.ok ? ' disabled' : '') + (preferred && preferred.agent.id === agent.id ? ' checked' : '') +
          '><div><label for="' + id + '">' + escape(agent.name) + ' · 版本 ' + escape(agent.version) +
          '</label><p class="teacher-help">支持等级 <small class="flc-code">supported_boundaries</small>：' +
          supported(agent) + '</p><p id="' + id + '-note"' + (!result.ok ? ' class="teacher-error"' : '') + '>' +
          (result.ok ? '可绑定' : escape((result.code ? result.code + '：' : '') + result.reason)) + '</p></div></div>';
      }).join('');
      $('kb-bind-submit').disabled = !preferred;
    }
    function renderTasks() {
      const previous = $('kb-task').value;
      const rows = classTasks();
      $('kb-task').innerHTML = rows.map(task => '<option value="' + escape(task.id) + '">' +
        escape(task.title) + '</option>').join('') || '<option value="">暂无任务</option>';
      if (rows.some(task => task.id === previous)) $('kb-task').value = previous;
      $('kb-task').disabled = !rows.length;
      renderAgents();
    }
    function render() {
      renderBindings();
      advanceParsing();
      renderDocuments();
      renderTasks();
    }
    $('kb-offering').innerHTML = offerings.map(item => '<option value="' + escape(item.id) + '">' +
      escape(item.name + '（' + item.id + '）') + '</option>').join('');
    $('kb-offering').value = offering.id;
    $('kb-offering').addEventListener('change', function () {
      offering = offerings.find(item => item.id === this.value);
      $('kb-message').textContent = '';
      $('kb-upload-form').reset();
      $('kb-upload-error').textContent = '';
      clearUploadErrors();
      syncUrl();
      render();
    });
    $('kb-task').addEventListener('change', renderAgents);
    $('kb-bind-form').addEventListener('submit', function (event) {
      event.preventDefault();
      const task = selectedTask();
      const choice = this.querySelector('input[name="kb-agent"]:checked');
      const agent = choice && data.agents.find(item => item.id === choice.value);
      if (!task || !agent) {
        error('kb-bind-error', { reason: '请选择本教学班的任务及可用智能体。' });
        return;
      }
      const result = FLC.taskEditor.canBindAgent(agent, task);
      if (!result.ok) {
        error('kb-bind-error', result);
        return;
      }
      const id = 'binding-task-' + task.id;
      bindings.list().filter(binding => binding.offering_id === offering.id && binding.task_id === task.id && binding.id !== id)
        .forEach(binding => bindings.remove(binding.id));
      bindings.upsert({ id, agent_id: agent.id, version_pin: agent.version, offering_id: offering.id,
        task_id: task.id, enabled: true, bound_by: account.id });
      $('kb-bind-error').textContent = '';
      $('kb-message').textContent = '已保存“' + task.title + '”的智能体绑定：' + agent.name + '，版本 ' + agent.version + '。';
      renderBindings();
    });
    function clearUploadErrors() {
      ['kb-file', 'kb-title', 'kb-license', 'kb-rights'].forEach(id => $(id).removeAttribute('aria-invalid'));
    }
    $('kb-file').addEventListener('change', function () {
      if (this.files[0]) $('kb-title').value = this.files[0].name;
    });
    $('kb-upload-form').addEventListener('submit', function (event) {
      event.preventDefault();
      clearUploadErrors();
      const title = $('kb-title').value.trim();
      const license = $('kb-license').value;
      const result = FLC.taskEditor.validateUpload({ title, license, rights_confirmed: $('kb-rights').checked });
      if (!result.ok) {
        (result.code === 'KB_RIGHTS_UNCONFIRMED' ? ['kb-rights'] : ['kb-title', 'kb-license'])
          .forEach(id => $(id).setAttribute('aria-invalid', 'true'));
        error('kb-upload-error', result);
        return;
      }
      const file = $('kb-file').files[0];
      if (!file) {
        $('kb-file').setAttribute('aria-invalid', 'true');
        error('kb-upload-error', { reason: '请选择要上传的演示文档。' });
        return;
      }
      const now = FLC.time.now();
      let sequence = now;
      while (documents.get('kb-doc-' + sequence.toString(36))) sequence += 1;
      const id = 'kb-doc-' + sequence.toString(36);
      documents.upsert({ id, source_id: 'kb-source-' + sequence.toString(36),
        kb_id: offering.id === 'off-demo' ? 'kb-demo' : 'kb-demo-2', offering_id: offering.id,
        title, version: 1, source_type: 'upload', mime: file.type || 'application/octet-stream',
        license, rights_confirmed_by: account.id, data_level: 1, status: 'parsing',
        uploaded_at: new Date(now).toISOString(), ready_at: new Date(now + config.parsingMs).toISOString() });
      this.reset();
      $('kb-upload-error').textContent = '';
      $('kb-message').textContent = '文档元数据已保存，解析中（parsing）；约 ' + config.parsingMs / 1000 + ' 秒后模拟变为可检索。';
      renderDocuments();
    });
    FLC.boundary.bind($('kb-task-boundary'));
    syncUrl();
    render();
    view();
    $('kb-content').hidden = false;
    window.addEventListener('hashchange', view);
    window.addEventListener('pageshow', render);
    window.addEventListener('storage', render);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });
    window.setInterval(advanceParsing, config.pollMs);
  });
})(window.FLC);
