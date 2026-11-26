window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'teacher/ta-drafts.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const account = FLC.guard.currentAccount();
    const store = FLC.store.collection('ta_draft');
    const view = document.getElementById('misc-view');
    const feedback = document.getElementById('misc-feedback');
    const escape = FLC.util.escapeHtml;
    const types = { feedback: '作业反馈初稿', variant: '相似题', digest: '学情摘要' };
    const states = { generated: '已生成', edited: '已编辑', published: '已发布', discarded: '已丢弃' };
    const notice = '<p class="misc-warning">AI 生成草稿，教师确认后才对学生可见</p>';
    function scoped() {
      const offerings = account.roles.filter(role => role.role === 'teacher' && role.scope_type === 'course_offering')
        .map(role => role.scope_id);
      return store.list().filter(draft => draft.teacher_id === account.id && offerings.includes(draft.offering_id));
    }
    function message(text, error = false) {
      feedback.textContent = text;
      feedback.className = error ? 'misc-error' : '';
    }
    function persist(draft, action) {
      store.upsert(draft);
      FLC.audit.log({ actor_id: account.id, action, target: draft.id,
        note: action === 'ta_draft.publish' ? '教师逐份审阅并勾选确认发布' : '教师草稿操作' });
    }
    function render() {
      const drafts = scoped();
      if (window.location.hash !== '#op') {
        view.innerHTML = '<p class="misc-intro">示例课程 · 逐份审阅 AI 草稿。反馈只提供改进建议，不生成分数。学情摘要仅教师本人可见。</p>' +
          '<p class="misc-notice">演示明文，不代表加密实现。</p><ul class="misc-list">' +
          drafts.map(draft => '<li class="misc-card"><h2>' + FLC.ui.codeLabel(types[draft.kind] || draft.kind, draft.kind) + '</h2>' +
            '<p class="misc-status">' + FLC.ui.codeLabel(states[draft.status], draft.status) + '</p>' + notice +
            '<p class="misc-content">' + escape(draft.draft_enc) + '</p><a href="?id=' + escape(encodeURIComponent(draft.id)) +
            '#op">' + (['generated', 'edited'].includes(draft.status) ? '审阅草稿' : '查看详情') + '</a></li>').join('') +
          '</ul>' + (drafts.length ? '' : '<p>当前教学班没有草稿。</p>');
        return;
      }
      const id = FLC.util.param('id');
      const draft = id ? drafts.find(item => item.id === id) : drafts[0];
      if (!draft) {
        view.innerHTML = '<p>草稿不存在或不在本人教学班作用域内。</p><a href="ta-drafts.html">返回草稿箱</a>';
        return;
      }
      const editable = ['generated', 'edited'].includes(draft.status);
      view.innerHTML = '<section id="op" class="misc-card"><a href="ta-drafts.html">返回草稿箱</a><h2>' +
        FLC.ui.codeLabel(types[draft.kind] || draft.kind, draft.kind) + '</h2><p>' +
        FLC.ui.codeLabel(states[draft.status], draft.status) + '</p>' + notice +
        '<p>演示明文，不代表加密实现。' + (draft.kind === 'digest' ? '此摘要仅教师本人可见。' : '') + '</p>' +
        (editable ? '<form id="draft-form" class="misc-form"><label for="draft-content">草稿正文<textarea id="draft-content" required aria-describedby="draft-help misc-feedback">' +
          escape(draft.draft_enc) + '</textarea></label><p id="draft-help">修改后请先保存，再逐份审阅并勾选确认。</p>' +
          '<label class="misc-confirm"><input type="checkbox" id="draft-confirm" aria-describedby="misc-feedback">我已逐份审阅，确认发布</label>' +
          '<div class="flc-actions"><button type="submit">保存修改</button><button type="button" id="draft-publish" disabled' +
          (draft.kind === 'digest' ? ' title="学情摘要仅教师可见"' : '') + '>确认发布</button>' +
          '<button type="button" id="draft-discard" class="flc-secondary">丢弃草稿</button></div></form>' :
          '<p class="misc-content">' + escape(draft.published_content_enc || draft.draft_enc) + '</p>' +
          (draft.status === 'published' ? '<p>本反馈由教师审阅发布（AI 辅助起草）</p><p>发布时间：' + escape(draft.published_at) + '</p>' : '<p>此草稿已丢弃。</p>')) + '</section>';
      if (!editable) return;
      const content = document.getElementById('draft-content');
      const confirmed = document.getElementById('draft-confirm');
      const publish = document.getElementById('draft-publish');
      const sync = () => { publish.disabled = !confirmed.checked || content.value !== draft.draft_enc || draft.kind === 'digest'; };
      confirmed.addEventListener('change', sync);
      content.addEventListener('input', function () { confirmed.checked = false; sync(); });
      document.getElementById('draft-form').addEventListener('submit', function (event) {
        event.preventDefault();
        const current = scoped().find(item => item.id === draft.id);
        if (!current || JSON.stringify(current) !== JSON.stringify(draft)) {
          render(); message('草稿已发生变化，请重新审阅。', true); return;
        }
        if (!content.value.trim()) { message('草稿正文不能为空。', true); return; }
        if (content.value === draft.draft_enc) { message('正文未修改，请审阅后勾选确认。'); return; }
        const before = draft.draft_enc;
        const after = content.value;
        let difference = Math.abs(after.length - before.length);
        for (let i = 0; i < Math.min(before.length, after.length); i += 1) {
          if (before[i] !== after[i]) difference += 1;
        }
        persist({ ...draft, draft_enc: after, status: 'edited', reviewed_confirmed: false,
          edit_distance: difference / Math.max(before.length, after.length, 1) }, 'ta_draft.edit');
        render();
        message('修改已保存。请逐份审阅并重新勾选确认。');
      });
      publish.addEventListener('click', function () {
        if (!confirmed.checked || content.value !== draft.draft_enc) {
          message('请先保存修改，并勾选已逐份审阅。', true); return;
        }
        const current = scoped().find(item => item.id === draft.id);
        if (!current || JSON.stringify(current) !== JSON.stringify(draft)) {
          render(); message('草稿已发生变化，请重新审阅。', true); return;
        }
        const result = FLC.teacherMisc.publishDraft(current, { confirmed: confirmed.checked, actor_id: account.id, now: FLC.time.now() });
        if (!result.ok) { message(result.reason, true); return; }
        persist(result.draft, 'ta_draft.publish');
        render();
        message('已由教师确认发布，刷新页面后仍保留发布状态。');
      });
      document.getElementById('draft-discard').addEventListener('click', function () {
        const current = scoped().find(item => item.id === draft.id);
        if (!current || !['generated', 'edited'].includes(current.status)) {
          render(); message('草稿状态已变化，请重新查看。', true); return;
        }
        persist({ ...current, status: 'discarded', reviewed_confirmed: false }, 'ta_draft.discard');
        render(); message('草稿已丢弃。');
      });
    }
    window.addEventListener('hashchange', function () { message(''); render(); });
    render();
  });
})(window.FLC);
