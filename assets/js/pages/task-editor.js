window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    if (FLC.guard.decide('teacher/task-editor.html', FLC.guard.currentAccount()).action !== 'allow') return;
    const account = FLC.guard.currentAccount();
    const editor = FLC.taskEditor;
    const tasks = FLC.store.collection('tasks');
    const data = FLC.data.teacher;
    const $ = id => document.getElementById(id);
    const escape = FLC.util.escapeHtml;
    const clone = value => JSON.parse(JSON.stringify(value));
    const labels = {
      task_kind: { practice: '实践', homework: '作业', quiz: '小测', exam: '考试', no_tool_assessment: '无工具测验',
        project: '项目', reflection: '反思', thesis: '论文', thesis_raw_data: '论文原始数据', lab_report: '实验报告' },
      scene: { self_study: '自习', collab: '协作', guidance: '指导', growth: '成长', practice: '实践' },
      icap_target: { active: '主动', constructive: '建构', interactive: '互动' },
      problem_type: { numeric: '数值', expression: '表达式', choice: '选择', short_answer: '简答', proof: '证明',
        code: '代码', design: '设计', essay: '论述', open_ended: '开放题' },
      companion_mode: { off: '关闭', guide: '引导', socratic: '苏格拉底', general: '通用' },
      evidence_required: { start: '起点', process: '过程', product: '成果', reflection: '反思', ai_use: 'AI 使用声明' },
      resource_formats: { text: '文本', video: '视频', audio: '音频', simulation: '仿真', slides: '幻灯片' },
      alt_submission_formats: { report: '报告', video: '视频', oral: '口述', poster: '海报', code: '代码', artifact: '实物' },
      status: { draft: '草稿', published: '已发布', closed: '已关闭' }
    };
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    let task = id ? tasks.get(id) : null;
    function alertMessage(message) {
      $('task-alert').textContent = message;
      $('task-alert').hidden = false;
      $('task-alert').focus();
    }
    if (params.has('id') && !task) {
      alertMessage('任务不存在，请返回我的课程选择任务。');
      return;
    }
    const offeringId = task ? task.offering_id : (params.get('offering') || 'off-demo');
    const offering = data.offerings.find(item => item.id === offeringId);
    if (!offering || offering.teacher_id !== account.id) {
      alertMessage(offering ? '无权管理该教学班的任务。' : '教学班不存在，请返回我的课程。');
      return;
    }
    if (!task) {
      let now = FLC.time.now();
      while (tasks.get(editor.newTaskId(now))) now += 1;
      task = { id: editor.newTaskId(now), offering_id: offeringId, created_by: account.id,
        title: '', description: '', task_kind: 'homework', scene: 'guidance', icap_target: 'constructive',
        observable_output: '', ai_boundary: 'restricted', companion_mode: editor.defaultMode('restricted'),
        attempt_first: true, evidence_required: ['product'], resource_formats: [], alt_submission_formats: ['report'],
        difficulty_tiers: 1, open_at: null, due_at: null, status: 'draft', policy_version: 1, problems: [] };
    }
    task = clone(task);
    let maxSeq = Math.max(task.problem_seq || 0, 0, ...task.problems.map(problem => problem.seq));
    const form = $('task-form');
    const fields = new Map();
    const title = (text, code) => escape(text) + ' <small class="flc-code">' + escape(code) + '</small>';
    function options(values, selected) {
      return Object.entries(values).map(([value, label]) => '<option value="' + escape(value) + '"' +
        (String(selected) === value ? ' selected' : '') + '>' + escape(label + '（' + value + '）') + '</option>').join('');
    }
    function field(root, key, text, control) {
      const wrapper = document.createElement('div');
      wrapper.className = 'teacher-field';
      wrapper.innerHTML = '<label for="field-' + escape(key) + '">' + title(text, key) + '</label>' + control;
      root.appendChild(wrapper);
      fields.set(key, wrapper.querySelector('input, select, textarea'));
    }
    function select(root, key, text, values, selected) {
      field(root, key, text, '<select id="field-' + escape(key) + '">' + options(values, selected) + '</select>');
    }
    function input(root, key, text, type, value, required) {
      field(root, key, text, '<input id="field-' + escape(key) + '" type="' + type + '" value="' +
        escape(value) + '"' + (required ? ' required' : '') + '>');
    }
    function textarea(root, key, text, value, required) {
      field(root, key, text, '<textarea id="field-' + escape(key) + '"' + (required ? ' required' : '') + '>' +
        escape(value) + '</textarea>');
    }
    function checks(key, text) {
      const group = document.createElement('fieldset');
      group.innerHTML = '<legend>' + title(text, key) + '</legend>' + Object.entries(labels[key]).map(([value, label]) =>
        '<label class="teacher-check"><input type="checkbox" name="' + key + '" value="' + value + '"' +
        ((task[key] || []).includes(value) ? ' checked' : '') + '>' + title(label, value) + '</label>').join('');
      $('delivery-fields').appendChild(group);
    }
    function localTime(value) {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
    }
    input($('task-fields'), 'title', '标题', 'text', task.title, true);
    textarea($('task-fields'), 'description', '说明', task.description || '');
    ['task_kind', 'scene', 'icap_target'].forEach((key, i) =>
      select($('task-fields'), key, ['任务类型', '学习场景', 'ICAP 目标'][i], labels[key], task[key]));
    textarea($('task-fields'), 'observable_output', '可观察产出', task.observable_output || '', true);
    select($('policy-fields'), 'ai_boundary', 'AI 边界等级', Object.fromEntries(
      FLC.boundary.LEVELS.map(level => [level, FLC.boundary.RULES[level].label])), task.ai_boundary);
    select($('policy-fields'), 'companion_mode', '学伴模式', {}, task.companion_mode);
    function modes(reset) {
      const level = fields.get('ai_boundary').value;
      const selected = reset ? editor.defaultMode(level) : task.companion_mode;
      fields.get('companion_mode').innerHTML = options(Object.fromEntries(editor.allowedModes(level)
        .map(mode => [mode, labels.companion_mode[mode]])), selected);
    }
    modes(false);
    field($('policy-fields'), 'attempt_first', '先提交有效尝试', '<input id="field-attempt_first" type="checkbox"' +
      (task.attempt_first ? ' checked' : '') + '>');
    checks('evidence_required', '所需证据');
    checks('resource_formats', '资源形式');
    checks('alt_submission_formats', '替代提交形式');
    select($('delivery-fields'), 'difficulty_tiers', '难度层数', { 1: '一层', 2: '两层', 3: '三层' }, task.difficulty_tiers || 1);
    input($('delivery-fields'), 'open_at', '开放时间', 'datetime-local', localTime(task.open_at));
    input($('delivery-fields'), 'due_at', '截止时间', 'datetime-local', localTime(task.due_at));
    ['open_at', 'due_at'].forEach(key => { fields.get(key).step = '1'; });

    function renderProblems() {
      for (const key of fields.keys()) if (key.startsWith('problems.')) fields.delete(key);
      $('problem-fields').replaceChildren();
      task.problems.forEach((problem, index) => {
        const group = document.createElement('fieldset');
        group.innerHTML = '<legend>题目 ' + escape(problem.seq) + ' <small class="flc-code">' + escape(problem.id) + '</small></legend>';
        const prefix = 'problems.' + index + '.';
        select(group, prefix + 'problem_type', '题型', labels.problem_type, problem.problem_type);
        textarea(group, prefix + 'stem', '题干', problem.stem, true);
        group.insertAdjacentHTML('beforeend', '<div class="teacher-fields"><p>参考答案 <small class="flc-code">answer_key</small><br>加密存储，仅护栏引擎使用</p>' +
          '<p>答案模式 <small class="flc-code">final_answer_patterns</small><br>加密存储，仅护栏引擎使用</p></div>');
        field(group, prefix + 'answer_key_provided', '已提供参考答案和答案模式',
          '<input id="field-' + prefix + 'answer_key_provided" type="checkbox"' + (problem.answer_key_provided ? ' checked' : '') + '>');
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'flc-secondary';
        remove.textContent = '删除题目 ' + problem.seq;
        remove.addEventListener('click', function () {
          read();
          task.problems.splice(index, 1);
          clearErrors();
          renderProblems();
          refresh();
          $('add-problem').focus();
        });
        group.appendChild(remove);
        $('problem-fields').appendChild(group);
      });
    }
    renderProblems();
    fields.set('reason', $('change-reason'));
    function read() {
      for (const [key, element] of fields) {
        if (key === 'reason') continue;
        const value = element.type === 'checkbox' ? element.checked : element.value;
        if (key.startsWith('problems.')) {
          const parts = key.split('.');
          const problem = task.problems[Number(parts[1])];
          if (parts[2] !== 'answer_key_provided' || value || problem.answer_key_provided !== undefined) {
            problem[parts[2]] = value;
          }
        } else if (key === 'open_at' || key === 'due_at') {
          task[key] = value ? new Date(value).toISOString() : null;
        } else task[key] = key === 'difficulty_tiers' ? Number(value) : value;
      }
      ['evidence_required', 'resource_formats', 'alt_submission_formats'].forEach(key => {
        task[key] = Array.from(form.querySelectorAll('input[name="' + key + '"]:checked'), element => element.value);
      });
      task.problem_seq = maxSeq;
      return task;
    }
    function values(key) {
      return (task[key] || []).map(value => labels[key][value] || value).join('、') || '未指定';
    }
    function refresh() {
      read();
      const prev = tasks.get(task.id);
      $('reason-field').hidden = !(prev && prev.status === 'published' && prev.ai_boundary !== task.ai_boundary);
      $('close-task').disabled = !prev || prev.status === 'closed';
      $('task-context').textContent = offering.name + '（' + offering.id + '） · ' +
        labels.status[task.status] + '（' + task.status + '） · 策略版本 ' + task.policy_version;
      $('task-preview').innerHTML = '<article class="teacher-task-card"><h3>' + escape(task.title || '未命名任务') + '</h3>' +
        FLC.boundary.badgeHtml(task.ai_boundary, { taskId: task.id }) +
        '<p>' + escape(task.description) + '</p><p>类型：' + escape(labels.task_kind[task.task_kind]) +
        ' · 场景：' + escape(labels.scene[task.scene]) + ' · ICAP：' + escape(labels.icap_target[task.icap_target]) + '</p>' +
        '<p>可观察产出：' + escape(task.observable_output || '待填写') + '</p><p>学伴：' + escape(labels.companion_mode[task.companion_mode]) +
        '；' + (task.attempt_first ? '先提交有效尝试' : '不要求先尝试') + '</p>' +
        '<p>所需证据：' + escape(values('evidence_required')) + '<br>资源形式：' + escape(values('resource_formats')) +
        '<br>提交形式：' + escape(values('alt_submission_formats')) + '<br>难度层数：' + escape(task.difficulty_tiers) + '</p>' +
        '<p>开放：' + escape(task.open_at ? new Date(task.open_at).toLocaleString('zh-CN') : '未设置') +
        '<br>截止：' + escape(task.due_at ? new Date(task.due_at).toLocaleString('zh-CN') : '未设置') + '</p>' +
        task.problems.map(problem => '<section><h4>题目 ' + escape(problem.seq) + ' · ' + escape(labels.problem_type[problem.problem_type]) +
          '</h4><p>' + escape(problem.stem || '待填写题干') + '</p></section>').join('') + '</article>';
    }
    FLC.boundary.bind($('task-preview'));
    function clearErrors() {
      $('task-alert').hidden = true;
      form.querySelectorAll('.teacher-error').forEach(element => element.remove());
      for (const element of fields.values()) {
        element.removeAttribute('aria-invalid');
        element.removeAttribute('aria-describedby');
      }
      $('change-reason').setAttribute('aria-describedby', 'reason-help');
      fields.get('due_at').setCustomValidity('');
    }
    function failure(result) {
      alertMessage(result.code + '：' + (result.code === 'TASK_REASON_REQUIRED' ? '请填写变更原因。' : '请修正以下违反项。'));
      const violations = result.violations || [{ field: 'reason', rule_id: result.code, reason: '已发布任务修改等级必须填写变更原因。' }];
      violations.forEach((violation, index) => {
        const element = fields.get(violation.field) || fields.get('ai_boundary');
        const error = document.createElement('p');
        error.id = 'task-error-' + index;
        error.className = 'teacher-error';
        error.textContent = violation.rule_id + '：' + violation.reason;
        element.parentElement.appendChild(error);
        element.setAttribute('aria-invalid', 'true');
        element.setAttribute('aria-describedby', ((element.getAttribute('aria-describedby') || '') + ' ' + error.id).trim());
      });
    }
    function persist(publish) {
      clearErrors();
      $('task-message').textContent = '';
      read();
      if (task.open_at && task.due_at && task.open_at >= task.due_at) {
        fields.get('due_at').setCustomValidity('截止时间必须晚于开放时间。');
      }
      if (!form.reportValidity()) return;
      const prev = tasks.get(task.id);
      if (prev) task.status = prev.status;
      const reason = $('change-reason').value.trim();
      const opts = { reason, offering, floorRules: data.floorRules, now: FLC.time.now() };
      const result = publish ? editor.publish(prev, task, opts) : editor.save(prev, task, opts);
      if (!result.ok) { failure(result); return; }
      tasks.upsert(result.task);
      if (prev && result.task.policy_version > prev.policy_version) {
        FLC.audit.log({ actor_id: account.id, action: 'task.policy.changed', target: task.id, note: reason || '任务策略更新' });
      }
      task = clone(result.task);
      $('change-reason').value = '';
      const url = new URL(window.location.href);
      url.searchParams.set('id', task.id);
      url.searchParams.delete('offering');
      window.history.replaceState(null, '', url.href);
      refresh();
      $('task-message').textContent = (publish ? '已发布。' : '已保存。') + (result.notifyStudents ? '将通知学生。' : '');
    }
    form.addEventListener('submit', function (event) { event.preventDefault(); persist(false); });
    $('publish-task').addEventListener('click', () => persist(true));
    $('close-task').addEventListener('click', function () {
      const prev = tasks.get(task.id);
      if (!prev) return;
      const result = editor.close(prev);
      if (!result.ok) { failure(result); return; }
      tasks.upsert(result.task);
      task = clone(result.task);
      clearErrors();
      for (const [key, element] of fields) {
        if (key === 'reason' || key.startsWith('problems.')) continue;
        if (element.type === 'checkbox') element.checked = !!task[key];
        else element.value = key === 'open_at' || key === 'due_at' ? localTime(task[key]) : (task[key] || '');
      }
      modes(false);
      ['evidence_required', 'resource_formats', 'alt_submission_formats'].forEach(key => {
        form.querySelectorAll('input[name="' + key + '"]').forEach(element => {
          element.checked = (task[key] || []).includes(element.value);
        });
      });
      $('change-reason').value = '';
      renderProblems();
      refresh();
      $('task-message').textContent = '任务已关闭。';
    });
    $('add-problem').addEventListener('click', function () {
      read();
      const problemId = editor.nextProblemId({ id: task.id, problems: [{ seq: maxSeq }] });
      maxSeq += 1;
      task.problems.push({ id: problemId, seq: maxSeq, problem_type: 'design', stem: '', answer_key_provided: false });
      clearErrors();
      renderProblems();
      refresh();
      fields.get('problems.' + (task.problems.length - 1) + '.stem').focus();
    });
    fields.get('ai_boundary').addEventListener('change', function () { modes(true); });
    form.addEventListener('input', function () {
      fields.get('due_at').setCustomValidity('');
      refresh();
    });
    form.addEventListener('change', refresh);
    $('editor-layout').hidden = false;
    refresh();
  });
})(window.FLC);
