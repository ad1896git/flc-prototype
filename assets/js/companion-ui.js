window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const escape = value => FLC.util.escapeHtml(value);
  const feedbackLabels = { helpful: '有用', not_helpful: '没用', disagree: '我不同意', need_teacher: '需要老师' };
  const statuses = { active: '辅导中', closing: '元认知收尾', closed: '已结束', frozen: '自动回复已冻结' };
  const hooks = { beforeRender: null };
  const disabled = value => value ? ' disabled' : '';

  function renderCrisis(msg) {
    const data = FLC.data.crisis;
    return '<article class="companion-crisis" role="alert" aria-live="assertive"' +
      (msg ? ' data-message="' + escape(msg.id) + '"' : '') + '><h3>' + escape(data.copy.title) +
      '</h3><p>' + escape(data.copy.care) + '</p><ul class="companion-resources">' + data.resources.map(resource =>
        '<li><strong>' + escape(resource.name) + '</strong><a href="tel:' + escape(resource.phone) + '">' +
        escape(resource.phone) + '</a><p>' + escape(resource.address) + '</p><p>' + escape(resource.opening_hours) +
        '</p></li>').join('') + '</ul></article>';
  }

  function renderMessage(msg, locked = false) {
    if (msg.kind === 'crisis_response') return renderCrisis(msg);
    const assistant = msg.role === 'assistant';
    const feedback = assistant || msg.role === 'system_notice';
    return '<article class="companion-message ' + (msg.role === 'user' ? 'companion-message--user' : '') +
      '" data-message="' + escape(msg.id) + '"><h3>' + (assistant ? 'AI 学伴' : msg.role === 'user' ? '我' : '系统提示') +
      '</h3><p class="companion-content">' + escape(msg.content) + '</p>' +
      (msg.citations || []).map((citation, index) => '<details class="companion-source"><summary>来源 [' + (index + 1) +
        ']</summary><p>文档：' + escape(citation.doc) + '</p><p>版本：' + escape(citation.version) +
        ' · 页码：' + escape(citation.page) + '</p><blockquote>' + escape(citation.excerpt) + '</blockquote></details>').join('') +
      (feedback ? '<div class="companion-actions" aria-label="回答反馈">' + Object.keys(feedbackLabels).map(value =>
        '<button type="button" class="flc-secondary" data-action="feedback" data-msg="' + escape(msg.id) +
        '" data-value="' + value + '" aria-pressed="' + String((msg.feedback || []).includes(value)) + '"' + disabled(locked) + '>' +
        feedbackLabels[value] + '</button>').join('') + '</div>' : '') + '</article>';
  }

  function renderHtml(state) {
    const conv = state.conversation, task = state.task, problem = state.problem;
    if (state.helpOnly) {
      const card = conv.messages.filter(msg => msg.kind === 'crisis_response').slice(-1)[0];
      return '<section class="companion companion-help-only" aria-label="求助资源">' + renderCrisis(card) +
        '<p id="companion-notice">' + escape(FLC.data.crisis.copy.help_only) + '</p>' +
        '<fieldset class="companion-controls" disabled><legend>学伴已暂停辅导</legend>' +
        '<label>向学伴提问<textarea name="chat" disabled aria-describedby="companion-notice"></textarea></label>' +
        '<button type="button" disabled>发送</button></fieldset></section>';
    }
    const frozen = conv.status === 'frozen';
    const inactive = conv.status !== 'active' || state.busy;
    const off = conv.boundary === 'forbidden';
    const hintNote = conv.status === 'closed' ? '本题对话已结束' : frozen ? '老师已接手，自动回复已停止。' : off ? '本任务禁止使用 AI，学伴已关闭。' :
      conv.hint_level >= 3 ? '已到 3/3，仍有疑问请选择回答下的“需要老师”。' :
        task.attempt_first && !conv.attempt_submitted ? '先写下你的尝试' : '按层获取提示，保留自己的思考。';
    const attempts = conv.messages.filter(msg => msg.kind === 'attempt');
    const draft = state.attemptDraft == null ? (attempts.length ? attempts[attempts.length - 1].content : '') : state.attemptDraft;
    const script = FLC.data.companion.scripts.find(item => item.problem_id === problem.id && item.boundary === conv.boundary) ||
      FLC.data.companion.scripts.find(item => item.boundary === conv.boundary);
    const crisisTurn = script && script.turns.find(turn => turn.situation === 'crisis');
    return '<section class="companion' + (state.embedded ? ' companion--embedded' : '') + '">' +
      '<header class="companion-banner"><strong>你正在与 AI 学伴交流</strong><div>' +
      (state.boundaryHtml || '<span>' + escape(FLC.boundary.RULES[conv.boundary].label) + '</span>') + '</div>' +
      (frozen ? '<p class="flc-alert" role="status">自动回复已冻结：老师已接手处理（工单 ' + escape(state.ticketNo || 'TK-…') + '）</p>' : '') + '</header>' +
      '<div data-slot="before-render"></div><div class="companion-layout"><details class="companion-problem" open>' +
      '<summary>题目与我的尝试（展开 / 收起）</summary><div class="flc-card"><h2>' + escape(task.title) +
      '</h2><p>第 ' + escape(problem.seq) + ' 题</p><p>' + escape(problem.stem) + '</p>' +
      '<form data-form="attempt"><label>我的尝试<textarea name="attempt" rows="7" aria-describedby="companion-note companion-notice"' +
      disabled(inactive || off) + '>' + escape(draft) + '</textarea></label><button type="submit"' + disabled(inactive || off) +
      '>提交尝试</button></form><p id="companion-note">' + hintNote + '</p><button type="button" data-action="hint"' +
      disabled(inactive || !FLC.companion.canHint(conv, task)) + '>提示 ' + Math.min(conv.hint_level + 1, 3) + '/3</button></div></details>' +
      '<section class="companion-dialogue" aria-label="学伴对话"><h2>对话 <small class="flc-code">' +
      escape(statuses[conv.status]) + ' · ' + escape(conv.status) + '</small></h2>' +
      '<div class="companion-history" aria-live="polite" aria-relevant="additions text" aria-busy="' + String(!!state.busy) + '">' +
      (conv.messages.map(msg => renderMessage(msg, frozen || state.busy)).join('') || '<p>从自己的尝试开始，一起梳理思路。</p>') +
      '<div data-slot="delivery">' + (state.busy ? '<p role="status">' + (conv.boundary === 'open' ? '正在回答…' : '正在校验…') + '</p>' : '') +
      '</div></div><p id="companion-notice" role="status">' + escape(state.notice || '') + '</p>' +
      '<fieldset class="companion-controls"' + disabled(inactive) + '><legend>继续学习</legend>' +
      '<div class="companion-actions" aria-label="快捷句">' + (script ? script.turns.filter(turn => turn.situation !== 'hint' && turn.situation !== 'crisis').map(turn =>
        '<button type="button" class="flc-secondary" data-action="quick" data-text="' + escape(turn.student) + '">' +
        escape(turn.student) + '</button>').join('') : '') + '</div><form data-form="chat"><label>向学伴提问<textarea name="chat" rows="3"' +
      disabled(off) + ' aria-describedby="companion-notice">' + escape(state.chatDraft || '') + '</textarea></label><button type="submit"' +
      disabled(off) + '>发送</button></form><button type="button" class="flc-secondary" data-action="finish"' + disabled(off) +
      '>我完成了</button></fieldset>' + (crisisTurn ? '<div class="companion-crisis-entry"><button type="button" class="flc-secondary" data-action="quick" data-text="' + escape(crisisTurn.demo_text) + '">' + escape(crisisTurn.student) + '</button></div>' : '') + (conv.status === 'closing' ? renderMetacog() : '') + '</section></div></section>';
  }

  function renderMetacog() {
    const questions = FLC.companion.METACOG_QUESTIONS;
    return '<section class="flc-card companion-metacog" aria-label="元认知收尾"><h2>回顾一下你的思考</h2>' +
      '<form data-form="metacog"><label>' + escape(questions[0]) + '<textarea name="explanation" rows="3" required></textarea></label>' +
      '<label>' + escape(questions[1]) + '<select name="confidence" required><option value="">请选择</option>' +
      [1, 2, 3, 4, 5].map(n => '<option value="' + n + '">' + n + '</option>').join('') + '</select></label>' +
      '<div class="companion-actions"><button type="submit">保存并结束</button><button type="button" class="flc-secondary" data-action="skip">跳过</button></div></form></section>';
  }

  function mount(container, options) {
    const account = FLC.guard.currentAccount();
    const page = document.documentElement.dataset.page;
    if (FLC.guard.decide(page, account).action !== 'allow') return;
    const conversations = FLC.store.collection('conversations');
    const cases = FLC.store.collection('cases');
    const holds = FLC.store.collection('crisis_holds');
    const requested = options.convId && conversations.get(options.convId);
    if (options.convId && (!requested || requested.user_id !== account.id)) {
      container.textContent = '会话不存在或无权访问。';
      return;
    }
    const task = FLC.store.collection('tasks').get(requested ? requested.task_id : options.taskId);
    const problem = task && task.problems.find(item => item.id === (requested ? requested.problem_id : options.problemId || task.problems[0].id));
    if (!task || !problem) { container.textContent = '任务或题目不存在。'; return; }
    let conv = FLC.companion.findOrCreate(account.id, task.id, problem.id);
    let busy = false, notice = '', timer = null, destroyed = false, attemptDraft = null, chatDraft = '';
    const boundaryHtml = FLC.boundary.badgeHtml(conv.boundary, { taskId: task.id });
    let pendingBase = null, helpOnly = false;
    const desktop = window.matchMedia('(min-width: 800px)');
    let problemOpen = desktop.matches;
    function syncProblem(details) {
      // Override the desktop CSS fallback so the summary remains operable.
      details.querySelector('summary').style.display = 'block';
      details.querySelector('.flc-card').style.setProperty('display', details.open ? 'block' : 'none', 'important');
    }
    function openProblem() {
      problemOpen = desktop.matches;
      const details = container.querySelector('.companion-problem');
      if (details) { details.open = problemOpen; syncProblem(details); }
    }
    function held() {
      return FLC.companion.activeHold(holds.list(), conv.user_id);
    }
    function checkHold() {
      if (!held()) return false;
      const changed = !helpOnly || busy;
      stop();
      helpOnly = true;
      if (changed) render();
      return true;
    }
    function crisis(text) {
      if (!FLC.companion.detectCrisis(text)) return false;
      if (destroyed || checkHold()) return true;
      stop();
      // Deliberately bypass latest(): frozen conversations still accept crisis signals.
      const current = conversations.get(conv.id);
      if (!current) { latest(); return true; }
      const result = FLC.companion.triggerCrisis(current, text, account, cases.list(), FLC.time.now());
      if (checkHold()) return true;
      holds.upsert(result.hold);
      const ownHoldOnly = () => !FLC.companion.activeHold(
        holds.list().filter(hold => hold.id !== result.hold.id), conv.user_id);
      if (ownHoldOnly()) cases.upsert(result.ticket);
      if (ownHoldOnly()) {
        // Rebase the crisis messages on concurrent changes, retaining the original ticket and hold.
        const fresh = conversations.get(conv.id);
        if (fresh) {
          const rebased = JSON.stringify(fresh) === JSON.stringify(current) ? result :
            FLC.companion.triggerCrisis(fresh, text, account, cases.list(), FLC.time.now());
          conversations.upsert(rebased.conversation);
          if (rebased !== result) cases.update(result.ticket.id, { source_msg_ids: rebased.ticket.source_msg_ids });
        }
      }
      conv = conversations.get(conv.id) || current;
      chatDraft = '';
      attemptDraft = null;
      render();
      return true;
    }

    function stop() {
      clearTimeout(timer);
      timer = null;
      busy = false;
      pendingBase = null;
    }
    function latest() {
      const record = conversations.get(conv.id);
      if (destroyed || checkHold()) return null;
      if (!record || record.status === 'frozen') {
        stop();
        if (record) { conv = record; render(); }
        else { destroy(); container.textContent = '会话已重置，请刷新页面。'; }
        return null;
      }
      return record;
    }
    function save(next) {
      if (!latest()) return false;
      if (checkHold()) return false;
      conversations.upsert(next);
      conv = next;
      return true;
    }
    function render() {
      if (destroyed) return;
      helpOnly = !!held();
      if (helpOnly) stop();
      const focused = container.contains(document.activeElement) ? document.activeElement : null;
      const focusKey = focused && { name: focused.name, action: focused.dataset.action, msg: focused.dataset.msg, value: focused.dataset.value, text: focused.dataset.text };
      const related = cases.list().filter(item => item.source_ref === conv.id && item.type === 'academic_help');
      const ticket = related.find(item => item.claimed_at) || related[related.length - 1];
      const state = { conversation: conv, task, problem, boundaryHtml, ticketNo: ticket && ticket.ticket_no,
        busy, notice, attemptDraft, chatDraft, helpOnly, embedded: !!options.embedded };
      const extra = !helpOnly && typeof hooks.beforeRender === 'function' ? hooks.beforeRender(state) : '';
      const previousDetails = container.querySelector('.companion-problem');
      if (previousDetails) problemOpen = previousDetails.open;
      container.innerHTML = renderHtml(state);
      if (!helpOnly && typeof extra === 'string') container.querySelector('[data-slot="before-render"]').innerHTML = extra;
      container.querySelectorAll('[data-action="feedback"]').forEach(button => {
        button.disabled = busy || conv.status === 'frozen';
      });
      FLC.boundary.bind(container);
      const details = container.querySelector('.companion-problem');
      if (details) {
        details.open = problemOpen;
        syncProblem(details);
        details.addEventListener('toggle', function () {
          if (!container.contains(details)) return;
          problemOpen = details.open;
          syncProblem(details);
        });
      }
      if (focusKey) {
        const candidate = Array.from(container.querySelectorAll('button, textarea, select')).find(element =>
          !element.disabled && (focusKey.name ? element.name === focusKey.name : focusKey.action &&
            element.dataset.action === focusKey.action && element.dataset.msg === focusKey.msg &&
            element.dataset.value === focusKey.value && element.dataset.text === focusKey.text));
        if (candidate) candidate.focus({ preventScroll: true });
      }
    }
    function reject(result) {
      notice = result.message || ({ attempt_first: '先写下你的尝试', hint_limit: '已到 3/3，请选择“需要老师”。',
        invalid_metacog_answer: '请回答关键思路，并选择 1–5 的把握程度。', empty_message: '请先输入问题。' }[result.blocked] || '当前会话不能继续此操作。');
      render();
    }
    function deliver(next) {
      if (checkHold()) return;
      if (next.blocked) { reject(next); return; }
      const added = next.messages.slice(conv.messages.length);
      const answer = added.find(msg => msg.role === 'assistant');
      if (!answer || FLC.companion.deliveryMode(conv.boundary) === 'none') {
        if (save(next)) render();
        return;
      }
      const base = { ...conv, messages: conv.messages.concat(added.filter(msg => msg.role === 'user')) };
      if (!save(base)) return;
      pendingBase = JSON.stringify(base);
      busy = true;
      render();
      const letters = Array.from(answer.content);
      let length = 0;
      function step() {
        const current = latest();
        if (!current) return;
        if (JSON.stringify(current) !== pendingBase) { stop(); conv = current; render(); return; }
        if (conv.boundary === 'open') {
          length += 1;
          const slot = container.querySelector('[data-slot="delivery"]');
          slot.innerHTML = renderMessage({ ...answer, content: letters.slice(0, length).join(''), citations: [] });
          slot.querySelectorAll('button').forEach(button => { button.disabled = true; });
          if (length < letters.length) { timer = setTimeout(step, 25); return; }
        }
        if (save(next)) { stop(); render(); }
      }
      timer = setTimeout(step, conv.boundary === 'open' ? 25 : 1200);
    }
    function act(action, button) {
      if (action === 'quick' && crisis(button.dataset.text)) return;
      const current = latest();
      if (!current || busy) return;
      conv = current;
      notice = '';
      if (action === 'hint') deliver(FLC.companion.requestHint(conv, task));
      if (action === 'quick') deliver(FLC.companion.reply(conv, button.dataset.text));
      if (action === 'finish' || action === 'skip') {
        const next = action === 'finish' ? FLC.companion.finish(conv) : FLC.companion.metacogSkip(conv);
        if (next.blocked) reject(next);
        else if (save(next)) {
          render();
          if (action === 'finish') container.querySelector('[name="explanation"]').focus();
        }
      }
      if (action === 'feedback') {
        const msg = conv.messages.find(item => item.id === button.dataset.msg);
        if (!msg || msg.feedback.includes(button.dataset.value)) return;
        let next = FLC.companion.addFeedback(conv, msg.id, button.dataset.value);
        if (next.blocked) { reject(next); return; }
        let ticket = null;
        if (button.dataset.value === 'need_teacher') {
          ticket = FLC.companion.needTeacherCase(conv, msg.id, account, cases.list(), FLC.time.now());
          const seq = next.messages.reduce((max, item) => Math.max(max, item.seq), 0) + 1;
          next.messages.push({ id: conv.id + '-m' + seq, seq, role: 'system_notice', kind: 'system',
            content: '已转给老师，工单号 ' + ticket.ticket_no, hint_level: null, citations: [], flags: [], sensitivity: 'normal', feedback: [] });
        }
        notice = button.dataset.value === 'disagree' ? '已记录分歧，下一轮将说明依据，也可选择“需要老师”。' : '反馈已记录。';
        if (save(next)) {
          if (ticket && !checkHold()) cases.upsert(ticket);
          render();
        }
      }
    }
    function onClick(event) {
      const button = event.target.closest('[data-action]');
      if (button && container.contains(button) && !button.disabled) act(button.dataset.action, button);
    }
    function onInput(event) {
      if (checkHold()) return;
      if (event.target.name === 'attempt') attemptDraft = event.target.value;
      if (event.target.name === 'chat') chatDraft = event.target.value;
    }
    function onSubmit(event) {
      const form = event.target.closest('[data-form]');
      if (!form || !container.contains(form)) return;
      event.preventDefault();
      const values = new FormData(form);
      if ((form.dataset.form === 'chat' || form.dataset.form === 'attempt') &&
        crisis(values.get(form.dataset.form))) return;
      const current = latest();
      if (!current || busy) return;
      conv = current;
      notice = '';
      if (form.dataset.form === 'chat') {
        const next = FLC.companion.reply(conv, values.get('chat'));
        if (!next.blocked) chatDraft = '';
        deliver(next);
      } else {
        const next = form.dataset.form === 'attempt' ? FLC.companion.submitAttempt(conv, values.get('attempt'), problem) :
          FLC.companion.metacogAnswer(conv, [values.get('explanation'), values.get('confidence')]);
        if (next.blocked) reject(next);
        else if (save(next)) { notice = form.dataset.form === 'attempt' ? '尝试已保存，可以获取提示。' : '回顾已保存，会话已结束。'; render(); }
      }
    }
    function refresh() {
      if (destroyed) return;
      if (checkHold()) {
        const current = conversations.get(conv.id);
        if (current && JSON.stringify(current) !== JSON.stringify(conv)) { conv = current; render(); }
        return;
      }
      const released = helpOnly;
      helpOnly = false;
      const record = conversations.get(conv.id);
      if (!record) { latest(); return; }
      if (released || JSON.stringify(record) !== JSON.stringify(conv)) { stop(); conv = record; render(); }
    }
    function onStorage(event) {
      if (event.key === 'flc.demo.conversations' || event.key === 'flc.demo.cases' || event.key === 'flc.demo.crisis_holds' || event.key === null) refresh();
    }
    function destroy() {
      destroyed = true;
      stop();
      clearInterval(poll);
      container.removeEventListener('click', onClick);
      container.removeEventListener('input', onInput);
      container.removeEventListener('submit', onSubmit);
      window.removeEventListener('storage', onStorage);
      desktop.removeEventListener('change', openProblem);
    }
    container.addEventListener('click', onClick);
    container.addEventListener('input', onInput);
    container.addEventListener('submit', onSubmit);
    window.addEventListener('storage', onStorage);
    desktop.addEventListener('change', openProblem);
    const poll = setInterval(refresh, 1000);
    if (conv.boundary === 'forbidden' && conv.status === 'active' && !conv.messages.length) save(FLC.companion.requestHint(conv));
    render();
    return { destroy, refresh };
  }
  FLC.companionUI = { renderHtml, renderMessage, mount, hooks };
})(window.FLC);
