window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    if (FLC.guard.decide('teacher/evidence-timeline.html', FLC.guard.currentAccount()).action !== 'allow') return;
    const escape = FLC.util.escapeHtml;
    const el = id => document.getElementById('timeline-' + id);
    const collection = name => FLC.store.collection(name);
    const date = at => Number.isFinite(Date.parse(at)) ? new Date(at).toLocaleString('zh-CN', { hour12: false }) : '时间未记录';
    const name = id => (FLC.ACCOUNTS.find(item => item.id === id) || {}).name || id;
    const params = new URLSearchParams(window.location.search);
    const choice = { offering: params.get('offering'), student: params.get('student'), task: params.get('task') };
    let account, task, data, events = [], selected = null, pendingConversation = null;
    let showTables = false;
    const belongs = item => item && item.user_id === choice.student && item.task_id === choice.task;
    const problem = id => (task.problems || []).find(item => item.id === id);
    const problemTitle = id => {
      const item = problem(id);
      return item ? '第 ' + item.seq + ' 题 · ' + item.stem : '题目未记录';
    };
    function scope() {
      const current = FLC.guard.currentAccount();
      if (!current || !account || current.id !== account.id ||
        FLC.guard.decide('teacher/evidence-timeline.html', current).action !== 'allow') return false;
      const roster = FLC.timeline.roster(current, FLC.data.teacher.offerings, FLC.SEED.enrollments);
      const storedTask = collection('tasks').get(choice.task);
      return roster.offerings.some(item => item.id === choice.offering) &&
        roster.studentsOf(choice.offering).includes(choice.student) && storedTask && storedTask.offering_id === choice.offering;
    }
    function options(id, rows, value, empty) {
      el(id).innerHTML = (rows.length ? '<option value="" disabled>请选择</option>' + rows.map(row =>
        '<option value="' + escape(row.id) + '">' + escape(row.label) + '</option>').join('') :
        '<option value="">' + escape(empty) + '</option>');
      el(id).value = value || '';
      el(id).disabled = !rows.length;
    }
    function updateUrl() {
      const url = new URL(window.location.href);
      Object.keys(choice).forEach(key => choice[key] ? url.searchParams.set(key, choice[key]) : url.searchParams.delete(key));
      window.history.replaceState(null, '', url.href);
    }
    function clearPrivateViews() {
      ['view-dialog', 'adjust-dialog'].forEach(id => { if (el(id).open) el(id).close(); });
      pendingConversation = null;
      selected = null;
      el('body').textContent = '请先选择会话并确认查看。';
      el('detail').innerHTML = '<h2>证据详情</h2><p>请选择泳道中的事件。</p>';
      el('content').hidden = true;
      ['chart', 'tables', 'conversations', 'adjustments', 'boundary'].forEach(id => { el(id).innerHTML = ''; });
    }
    function table(caption, headers, rows) {
      return '<div class="timeline-table-wrap"><table><caption>' + escape(caption) + '</caption><thead><tr>' +
        headers.map(text => '<th scope="col">' + escape(text) + '</th>').join('') + '</tr></thead><tbody>' +
        (rows.length ? rows.map(row => '<tr>' + row.map(text => '<td>' + escape(text == null ? '—' : text) + '</td>').join('') + '</tr>').join('') :
          '<tr><td colspan="' + headers.length + '">暂无数据</td></tr>') + '</tbody></table></div>';
    }
    function fields(rows) {
      return '<dl>' + rows.map(([label, value]) => '<dt>' + escape(label) + '</dt><dd>' +
        escape(value == null || value === '' ? '—' : value) + '</dd>').join('') + '</dl>';
    }
    function viewButton(id) {
      return '<button type="button" data-view-conversation="' + escape(id) + '">查看对话正文</button>';
    }
    function drawTimeline(built) {
      events = built.lanes.flatMap(lane => lane.events.map(event => ({ ...event, lane: lane.label })));
      const times = events.map(event => Date.parse(event.at)).filter(Number.isFinite);
      let start = times.length ? Math.min(...times) : 0;
      let end = times.length ? Math.max(...times) : 0;
      if (times.length && start === end) { start -= 30 * 60000; end += 30 * 60000; }
      function pct(at) {
        const value = (Date.parse(at) - start) / (end - start) * 100;
        return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
      }
      const axis = times.length ? '<div class="timeline-axis"><span>时间</span><div class="timeline-axis-dates"><time>' +
        escape(date(new Date(start).toISOString())) + '</time><time>' + escape(date(new Date(end).toISOString())) + '</time></div></div>' : '';
      let index = 0;
      const gapPercent = 4800 / Math.max(44, el('chart').clientWidth - 190);
      const emptyLanes = built.lanes.filter(lane => !lane.events.length).map(lane => lane.label);
      el('chart').innerHTML = axis + built.lanes.filter(lane => lane.events.length).map(lane => {
        const companion = lane.key === 'companion';
        const slotEnds = [];
        const buttons = lane.events.map(event => {
          const x = pct(event.at);
          let slot = slotEnds.findIndex(last => x - last >= gapPercent);
          if (slot < 0) slot = slotEnds.length;
          slotEnds[slot] = x;
          const eventIndex = index++;
          return '<button type="button" class="timeline-event" data-event="' + eventIndex + '" aria-pressed="false" aria-label="' +
            escape(lane.label + '，' + event.title + '，' + date(event.at)) + '" title="' + escape(event.title + ' · ' + date(event.at)) +
            '" style="left:' + x + '%;top:' + ((companion ? 132 : 8) + slot * 48) + 'px">' + (eventIndex + 1) + '</button>';
        }).join('');
        const points = built.hintSeries.map(point => [pct(point.at) * 10, 108 - Math.max(0, Math.min(3, Number(point.level) || 0)) * 32]);
        const curve = companion && times.length && points.length ?
          [0, 1, 2, 3].map(level => '<span class="timeline-level" style="top:' + (102 - level * 32) + 'px">' + level + '</span>').join('') +
          '<svg class="timeline-curve" viewBox="0 0 1000 120" preserveAspectRatio="none" role="img" aria-label="提示层级折线，纵轴 0 至 3；可切换数据表视图">' +
          '<polyline points="' + points.map(point => point.join(',')).join(' ') + '"></polyline>' +
          points.map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="4"></circle>').join('') + '</svg>' : '';
        return '<div class="timeline-lane"><h3>' + escape(lane.label) + '</h3><div class="timeline-track" style="height:' +
          Math.max(64, (companion && times.length ? 132 : 8) + slotEnds.length * 48 + 8) + 'px">' + curve + buttons +
          '</div></div>';
      }).join('') + (emptyLanes.length ? '<p class="timeline-empty-lanes"><span>暂无证据</span>' +
        emptyLanes.map(label => '<span class="timeline-empty-lane">' + escape(label) + '</span>').join('') + '</p>' : '') +
        (!events.length ? '<p role="status" class="flc-empty">该学生在本任务暂无证据</p>' : '');
      el('tables').innerHTML = table('提示层级', ['时间', '题目', '层级'], built.hintSeries.map(point =>
        [date(point.at), problemTitle(point.problem_id), point.level])) +
        table('全部证据事件', ['编号', '泳道', '时间', '标题'], events.map((event, i) => [i + 1, event.lane, date(event.at), event.title]));
      el('tables').hidden = !showTables;
      el('table-toggle').setAttribute('aria-pressed', String(showTables));
    }
    function renderAdjustments() {
      const rows = collection('task_adjustments').list().filter(item => item.task_id === task.id && item.offering_id === choice.offering);
      el('adjustments').innerHTML = rows.length ? rows.map(item => '<article class="timeline-message">' +
        '<p>' + escape(date(item.created_at)) + ' · ' + escape(name(item.created_by)) + '</p><p class="timeline-text">' +
        escape(item.change_summary) + '</p></article>').join('') : '<p>暂无调整登记。</p>';
    }
    function render() {
      clearPrivateViews();
      account = FLC.guard.currentAccount();
      if (FLC.guard.decide('teacher/evidence-timeline.html', account).action !== 'allow') {
        el('notice').textContent = '无权查看该教学班或学生';
        ['offering', 'student', 'task'].forEach(id => options(id, [], '', '无可用选项'));
        return;
      }
      const roster = FLC.timeline.roster(account, FLC.data.teacher.offerings, FLC.SEED.enrollments);
      if (choice.offering === null) choice.offering = roster.offerings[0]?.id || '';
      const owned = roster.offerings.some(item => item.id === choice.offering);
      const students = roster.studentsOf(choice.offering);
      const tasks = owned ? collection('tasks').list().filter(item => item.offering_id === choice.offering) : [];
      if (choice.student === null) choice.student = students[0] || '';
      if (choice.task === null) choice.task = tasks.find(item => item.status === 'published')?.id || '';
      options('offering', roster.offerings.map(item => ({ id: item.id, label: item.name })), choice.offering, '暂无任课教学班');
      options('student', students.map(id => ({ id, label: name(id) })), choice.student, '本教学班暂无选课学生');
      options('task', tasks.map(item => ({ id: item.id, label: item.title })), choice.task, '本教学班暂无任务');
      updateUrl();
      if (!owned || (choice.student && !students.includes(choice.student))) {
        el('notice').textContent = '无权查看该教学班或学生'; return;
      }
      if (!students.length) { el('notice').textContent = '本教学班暂无选课学生。'; return; }
      task = tasks.find(item => item.id === choice.task);
      if (!task) { el('notice').textContent = choice.task ? '所选任务不属于该教学班。' : '本教学班暂无已发布任务，请选择任务。'; return; }
      if (!scope()) { el('notice').textContent = '无权查看该教学班或学生'; return; }
      el('notice').textContent = name(choice.student) + ' · ' + task.title;
      const now = FLC.time.now();
      data = {
        conversations: collection('conversations').list().filter(belongs),
        submissions: collection('submissions').list().filter(belongs),
        evidence: collection('evidence_entries').list().concat(FLC.data.evidenceSeed.entries(now)).filter(belongs)
      };
      el('boundary').innerHTML = FLC.boundary.badgeHtml(task.ai_boundary, { taskId: task.id });
      el('content').hidden = false;
      drawTimeline(FLC.timeline.build({ studentId: choice.student, taskId: task.id, ...data, now }));
      const conversations = data.conversations.slice().sort((a, b) =>
        (problem(a.problem_id)?.seq || 0) - (problem(b.problem_id)?.seq || 0));
      el('conversations').innerHTML = conversations.length ? conversations.map(conv => '<li><span>' +
        escape(problemTitle(conv.problem_id)) + '</span>' + viewButton(conv.id) + '</li>').join('') : '<li>暂无题目会话。</li>';
      renderAdjustments();
      el('content').hidden = false;
    }
    function showDetail(index) {
      if (!scope()) { render(); return; }
      selected = events[index];
      if (!selected) return;
      el('chart').querySelectorAll('[data-event]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.event) === index)));
      const ref = selected.ref;
      let html = '<h2>' + escape(selected.title) + '</h2><p>' + escape(date(selected.at)) + '</p>';
      if (ref.type === 'conversation') {
        const conv = data.conversations.find(item => item.id === ref.conversation_id);
        const message = FLC.timeline.stampedMessages(conv).find(item => item.id === ref.message_id);
        html += fields([['题目', problemTitle(conv.problem_id)], ['层级', message?.hint_level ?? 0],
          ['是否已尝试', conv.attempt_submitted ? '是' : '否']]) + viewButton(conv.id);
      } else if (ref.type === 'submission') {
        const sub = data.submissions.find(item => item.id === ref.id);
        const declaration = sub.declaration || {};
        const snapshot = declaration.prefill_snapshot;
        html += fields([['版本', sub.version], ['形式', FLC.submission.LABELS.formats[sub.format] || sub.format],
          ['正文', sub.content_demo], ['附件名', (sub.attachment_keys || []).join('、')],
          ['声明使用 AI（used_ai）', declaration.used_ai == null ? '未声明' : declaration.used_ai ? '是' : '否']]);
        html += table('声明工具项', ['工具', '版本', '用途', '使用阶段', '验证方式'], (declaration.items || []).map(item =>
          [item.tool, item.version, item.purpose, FLC.submission.LABELS.stages[item.stage] || item.stage, item.verification]));
        html += snapshot ? fields([['预填轮数', snapshot.total_rounds], ['预填提示数',
          (snapshot.problems || []).reduce((sum, item) => sum + (Number(item.hints_used) || 0), 0)]]) : '<p>无预填摘要。</p>';
      } else {
        const entry = data.evidence.find(item => item.id === ref.id);
        const rows = {
          kwl: [['已知 K', entry.k], ['想知 W', entry.w], ['学到 L', entry.l]],
          progress: [['进度', FLC.data.studentMisc.progressLabels[entry.color] || entry.color], ['说明', entry.note]],
          product: [['作品标题', entry.title], ['作品说明', entry.description]],
          reflection: [['反思', entry.content]], quiz: [['成绩', entry.score], ['满分', entry.max_score]]
        };
        html += fields(rows[entry.type] || []);
      }
      el('detail').innerHTML = html;
    }
    function requestConversation(id) {
      if (!scope() || !belongs(collection('conversations').get(id))) { render(); return; }
      el('body').textContent = '请先确认查看。';
      pendingConversation = id;
      el('view-dialog').showModal();
    }
    el('content').addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-event')) showDetail(Number(button.dataset.event));
      if (button.hasAttribute('data-view-conversation')) requestConversation(button.dataset.viewConversation);
    });
    el('view-confirm').addEventListener('click', () => {
      const conv = collection('conversations').get(pendingConversation);
      if (!el('view-dialog').open || !scope() || !belongs(conv)) { render(); return; }
      const html = FLC.timeline.maskedMessages(conv).map(msg => '<article class="timeline-message"><p>' +
        escape(({ user: '学生', assistant: '学伴', system_notice: '系统提示' })[msg.role] || '消息') + ' · ' +
        escape(date(msg.created_at)) + '</p><p class="timeline-text">' + escape(msg.content) + '</p></article>').join('');
      FLC.audit.log({ actor_id: account.id, actor_role: 'teacher', action: 'companion.view_student_conv', target: conv.id, subject_user_id: conv.user_id });
      el('body').innerHTML = '<h3>' + escape(problemTitle(conv.problem_id)) + '</h3>' + (html || '<p>暂无消息。</p>');
      el('view-dialog').close();
    });
    el('view-cancel').addEventListener('click', () => el('view-dialog').close());
    el('view-dialog').addEventListener('close', () => { pendingConversation = null; });
    el('view-dialog').addEventListener('cancel', () => { pendingConversation = null; });
    el('table-toggle').addEventListener('click', () => {
      showTables = !showTables;
      el('table-toggle').setAttribute('aria-pressed', String(showTables));
      el('tables').hidden = !showTables;
    });
    el('adjust').addEventListener('click', () => {
      if (!scope()) { render(); return; }
      el('adjust-form').reset();
      el('summary').removeAttribute('aria-invalid');
      el('summary-error').textContent = '';
      el('adjust-context').textContent = selected ? '关联证据：' + selected.title : '未选中证据事件，将登记至本任务。';
      el('adjust-dialog').showModal();
      el('summary').focus();
    });
    el('adjust-cancel').addEventListener('click', () => el('adjust-dialog').close());
    el('adjust-form').addEventListener('submit', event => {
      event.preventDefault();
      if (!scope()) { render(); return; }
      const adjustments = collection('task_adjustments');
      const result = FLC.timeline.adjustment({ task, account, offeringId: choice.offering, studentId: choice.student,
        summary: el('summary').value, refs: selected ? [selected.ref] : [], existing: adjustments.list() });
      if (result.ok === false) {
        el('summary-error').textContent = result.errors.map(error => error.message).join(' ');
        el('summary').setAttribute('aria-invalid', 'true');
        el('summary').focus(); return;
      }
      adjustments.upsert(result);
      el('adjust-dialog').close();
      renderAdjustments();
    });
    ['offering', 'student', 'task'].forEach(id => el(id).addEventListener('change', () => {
      choice[id] = el(id).value;
      if (id === 'offering') { choice.student = null; choice.task = null; }
      render();
    }));
    FLC.boundary.bind(el('boundary'));
    render();
    window.addEventListener('pageshow', render);
    window.addEventListener('storage', render);
  });
})(window.FLC);
