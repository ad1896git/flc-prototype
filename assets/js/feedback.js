window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const KEY = 'flc.feedback';
  const TYPES = Object.freeze(['缺功能', '流程不对', '多余', '文案或字段', '其他']);
  const APPS = Object.freeze({ student: '学生端', teacher: '教师端', admin: '管理端', entry: '入口与无权限页' });

  function list() {
    try {
      const records = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(records) ? records : [];
    } catch (error) {
      return [];
    }
  }

  function add(record) {
    if (!record || !TYPES.includes(record.type)) return { ok: false, error: '请选择一种问题类型。' };
    if (typeof record.description !== 'string' || !record.description.trim()) {
      return { ok: false, error: '请填写问题描述。' };
    }
    const saved = Object.assign({}, record, {
      id: 'feedback-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2),
      created_at: new Date().toISOString(),
      description: record.description.trim(),
      expectation: typeof record.expectation === 'string' ? record.expectation.trim() : ''
    });
    try {
      const records = list();
      records.push(saved);
      localStorage.setItem(KEY, JSON.stringify(records));
      return { ok: true, record: saved };
    } catch (error) {
      return { ok: false, error: '意见保存失败，请检查浏览器本地存储后重试。' };
    }
  }

  function clear() { localStorage.removeItem(KEY); }
  function toJSON(records) { return JSON.stringify(records, null, 2); }

  function toMarkdown(records) {
    // Escape headings and field contents so user text cannot change the grouping.
    const text = value => String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/([\\`*_\[\]])/g, '\\$1').replace(/\r?\n/g, '\n    ');
    const lines = ['# 原型意见', ''];
    Object.keys(APPS).forEach(app => {
      const group = records.filter(record => record.app === app);
      if (!group.length) return;
      lines.push('## ' + APPS[app] + ' (' + app + ')', '');
      const paths = Array.from(new Set(group.map(record => record.page_path))).sort();
      paths.forEach(path => {
        const pageRecords = group.filter(record => record.page_path === path);
        lines.push('### ' + text(pageRecords[0].page_title) + ' — ' + text(path), '');
        pageRecords.forEach(record => {
          lines.push('- 类型：' + text(record.type),
            '  - 角色：' + text((record.roles || []).join(' / ')),
            '  - FR：' + text((record.fr || []).join(' / ') || '无'),
            '  - 描述：' + text(record.description),
            '  - 期望：' + text(record.expectation || '未填写'),
            '  - 时间：' + text(record.created_at), '');
        });
      });
    });
    return lines.join('\n');
  }

  function fileName(date, ext) {
    const pad = value => String(value).padStart(2, '0');
    return 'flc-feedback-' + date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate()) +
      '-' + pad(date.getHours()) + pad(date.getMinutes()) + '.' + ext;
  }

  function context() {
    const path = document.documentElement.dataset.page;
    const page = FLC.guard.findPage(path);
    const account = FLC.guard.currentAccount();
    return {
      account_id: account ? account.id : '',
      account_name: account ? account.name : '未选择',
      roles: account ? account.roles.map(item => item.role) : ['未选择'],
      page_path: path + window.location.search + window.location.hash,
      page_title: page ? page.title : document.title,
      app: page ? page.app : 'entry',
      fr: page ? page.fr.slice() : []
    };
  }

  FLC.feedback = { TYPES, add, list, clear, toJSON, toMarkdown, fileName, context };

  document.addEventListener('DOMContentLoaded', function () {
    const path = document.documentElement.dataset.page;
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const escapeHtml = FLC.util.escapeHtml;
    const stylePath = FLC.guard.rootPrefix(path) + 'assets/css/feedback.css';
    if (!Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(link => link.getAttribute('href') === stylePath)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = stylePath;
      document.head.append(link);
    }

    const roleText = roles => roles.map(role => FLC.ROLE_NAMES[role] ? FLC.ROLE_NAMES[role] + ' (' + role + ')' : role).join(' / ');
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'flc-feedback-trigger';
    trigger.textContent = '提意见';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', 'feedback-dialog');
    const dialog = document.createElement('dialog');
    dialog.id = 'feedback-dialog';
    dialog.className = 'flc-feedback-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'feedback-title');
    dialog.innerHTML = '<form novalidate>' +
      '<h2 id="feedback-title">提意见</h2>' +
      '<p>意见保存在本浏览器，可在入口页的“评审工具”中导出。</p>' +
      '<dl id="feedback-context"></dl>' +
      '<fieldset><legend>问题类型</legend><div class="flc-feedback-types">' +
      TYPES.map((type, index) => '<label><input type="radio" name="feedback-type" value="' + escapeHtml(type) + '"' +
        (index === 0 ? ' checked' : '') + '> ' + escapeHtml(type) + '</label>').join('') +
      '</div></fieldset>' +
      '<label for="feedback-description">问题描述（必填）</label>' +
      '<textarea id="feedback-description" rows="4" required aria-describedby="feedback-error"></textarea>' +
      '<p id="feedback-error" class="flc-feedback-error" role="alert"></p>' +
      '<label for="feedback-expectation">期望（选填）</label>' +
      '<textarea id="feedback-expectation" rows="3"></textarea>' +
      '<div class="flc-actions"><button type="submit">保存意见</button>' +
      '<button type="button" class="flc-secondary" id="feedback-close">关闭</button></div></form>';
    const notice = document.createElement('p');
    notice.className = 'flc-feedback-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    const review = document.querySelector('.flc-review-panel') || document.querySelector('.flc-review');
    if (review) review.append(trigger);
    else document.body.append(trigger);
    document.body.append(dialog, notice);
    const form = dialog.querySelector('form');
    const description = dialog.querySelector('#feedback-description');
    const error = dialog.querySelector('#feedback-error');
    let openedContext;
    let noticeTimer;

    trigger.addEventListener('click', function () {
      openedContext = context();
      dialog.querySelector('#feedback-context').innerHTML =
        '<dt>角色</dt><dd>' + escapeHtml(roleText(openedContext.roles)) + '</dd>' +
        '<dt>页面</dt><dd>' + escapeHtml(openedContext.page_title) + '<br>' + escapeHtml(openedContext.page_path) + '</dd>' +
        '<dt>FR</dt><dd>' + escapeHtml(openedContext.fr.join(' / ') || '无') + '</dd>';
      error.textContent = '';
      description.removeAttribute('aria-invalid');
      dialog.showModal();
      form.querySelector('input:checked').focus();
    });
    dialog.querySelector('#feedback-close').addEventListener('click', () => dialog.close());
    // Native dialog handles Escape, the modal focus boundary and background inertness.
    dialog.addEventListener('close', () => trigger.focus());
    description.addEventListener('input', function () {
      if (description.value.trim()) {
        description.removeAttribute('aria-invalid');
        error.textContent = '';
      }
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const selected = form.querySelector('input:checked');
      const result = add(Object.assign({}, openedContext, {
        type: selected ? selected.value : '',
        description: description.value,
        expectation: dialog.querySelector('#feedback-expectation').value
      }));
      if (!result.ok) {
        error.textContent = result.error;
        if (!description.value.trim()) description.setAttribute('aria-invalid', 'true');
        description.focus();
        return;
      }
      form.reset();
      dialog.close();
      notice.textContent = '意见已保存，可在入口页的“评审工具”中导出。';
      window.clearTimeout(noticeTimer);
      noticeTimer = window.setTimeout(() => { notice.textContent = ''; }, 5000);
      renderPreview();
    });

    const admin = document.getElementById('feedback-admin');
    function renderPreview() {
      if (!admin) return;
      const records = list();
      admin.querySelector('#feedback-count').textContent = '共 ' + records.length + ' 条意见（预览最近 20 条）';
      admin.querySelector('#feedback-clear').disabled = records.length === 0;
      admin.querySelector('#feedback-preview').innerHTML = records.length ? records.slice(-20).reverse().map(record =>
        '<article class="flc-feedback-item"><h3>' + escapeHtml(record.type) + ' · ' + escapeHtml(record.page_title) + '</h3>' +
        '<p>' + escapeHtml(record.page_path) + '</p><p>角色：' + escapeHtml(roleText(record.roles || [])) +
        '；FR：' + escapeHtml((record.fr || []).join(' / ') || '无') + '</p>' +
        '<p class="flc-feedback-text">描述：' + escapeHtml(record.description) + '</p>' +
        '<p class="flc-feedback-text">期望：' + escapeHtml(record.expectation || '未填写') + '</p>' +
        '<p>时间：' + escapeHtml(record.created_at) + '</p></article>'
      ).join('') : '<p>暂无意见，点击右下角评审工具条中的“提意见”开始。</p>';
    }

    function download(content, name, mime) {
      const url = URL.createObjectURL(new Blob([content], { type: mime }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    if (admin) {
      renderPreview();
      const status = admin.querySelector('#feedback-admin-status');
      const exportButton = admin.querySelector('#feedback-export');
      exportButton.addEventListener('click', function () {
        const records = list();
        const date = new Date();
        exportButton.disabled = true;
        download(toJSON(records), fileName(date, 'json'), 'application/json;charset=utf-8');
        window.setTimeout(function () {
          download(toMarkdown(records), fileName(date, 'md'), 'text/markdown;charset=utf-8');
          exportButton.disabled = false;
          status.textContent = '已发起 JSON 和 Markdown 下载，请检查浏览器下载记录。';
        }, 300);
      });
      admin.querySelector('#feedback-clear').addEventListener('click', function () {
        if (!window.confirm('确定清空本浏览器保存的全部意见？此操作无法撤销。')) return;
        try {
          clear();
          renderPreview();
          status.textContent = '意见已清空。';
        } catch (error) {
          status.textContent = '清空失败，请检查浏览器本地存储后重试。';
        }
      });
      window.addEventListener('storage', function (event) {
        if (event.key === KEY || event.key === null) renderPreview();
      });
    }
  });
})(window.FLC);
