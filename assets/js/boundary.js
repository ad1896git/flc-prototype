window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const LEVELS = ['forbidden', 'restricted', 'encouraged', 'open'];
  const note = '等级比较：禁止 < 限制 < 鼓励 < 开放，学校禁止清单只能收紧。';
  const fullDeclaration = '完整声明：工具名称、版本、用途、使用阶段、验证方式；平台内学伴记录自动预填，学生补充外部工具使用情况。';
  const openProblem = '每道题须有 answer_key 和 final_answer_patterns，或题型为 essay、design、open_ended（按完整成品泄露判定）。';
  const RULES = {
    forbidden: {
      label: '禁止', icon: '⛔', companion_modes: ['off'], default_mode: 'off',
      declaration: '本任务禁止使用 AI；提交时勾选“未使用 AI”的承诺（used_ai=false、pledge=true）。',
      prerequisites: '无额外题目条件。考试、无工具测验和论文原始数据类任务必须为禁止级且关闭学伴。',
      note
    },
    restricted: {
      label: '限制', icon: '◐', companion_modes: ['guide'], default_mode: 'guide',
      declaration: fullDeclaration,
      prerequisites: openProblem + ' 先提交有效尝试，再接受引导（以任务 attempt_first 设置为准）。',
      note
    },
    encouraged: {
      label: '鼓励', icon: '◑', companion_modes: ['guide', 'socratic'], default_mode: 'socratic',
      declaration: fullDeclaration,
      prerequisites: '建议提供参考答案与规范化答案模式，或采用 essay、design、open_ended 题型。先尝试要求以任务 attempt_first 为准，示例任务要求先尝试。',
      note
    },
    open: {
      label: '开放', icon: '●', companion_modes: ['guide', 'socratic', 'general'], default_mode: 'general',
      declaration: '简表：是否使用 AI、使用了哪些工具。',
      prerequisites: '无额外题目条件。是否先尝试以任务 attempt_first 为准，示例任务不要求先尝试。',
      note
    }
  };
  const modeLabels = { off: '关闭', guide: '引导', socratic: '苏格拉底', general: '通用' };
  const boundRoots = new WeakSet();
  const handledEvents = new WeakSet();
  let sequence = 0;

  function badgeHtml(level, { taskId } = {}) {
    if (!LEVELS.includes(level)) throw new Error('未知边界等级：' + level);
    const rule = RULES[level];
    const escape = FLC.util.escapeHtml;
    sequence += 1;
    const panelId = 'flc-boundary-' + level + '-' + encodeURIComponent(taskId == null ? 'standalone' : String(taskId)) + '-' + sequence;
    const modeLabel = mode => modeLabels[mode] + '（' + mode + '）';
    return '<button type="button" class="flc-boundary flc-boundary--' + escape(level) +
      '" aria-expanded="false" aria-controls="' + escape(panelId) + '">' +
      '<span class="flc-boundary__icon" aria-hidden="true">' + escape(rule.icon) + '</span> ' +
      escape(rule.label) + ' <small class="flc-code">' + escape(level) + '</small></button>' +
      '<div class="flc-boundary__panel" id="' + escape(panelId) + '" hidden>' +
      '<p><strong>' + escape(rule.label) + '级规则</strong></p>' +
      '<p>允许的学伴模式：' + escape(rule.companion_modes.map(modeLabel).join('、')) +
      '；默认：' + escape(modeLabel(rule.default_mode)) + '。</p>' +
      '<p>AI 使用声明：' + escape(rule.declaration) + '</p>' +
      '<p>必备条件与先尝试：' + escape(rule.prerequisites) + '</p>' +
      '<p>' + escape(rule.note) + '</p></div>';
  }

  function bind(root) {
    if (boundRoots.has(root)) return;
    boundRoots.add(root);
    root.addEventListener('click', event => {
      if (handledEvents.has(event)) return;
      const target = event.target;
      const button = target && target.closest ? target.closest('button.flc-boundary') : null;
      if (!button || !root.contains(button)) return;
      const panel = button.nextElementSibling;
      if (!panel || panel.id !== button.getAttribute('aria-controls') || !panel.classList.contains('flc-boundary__panel')) return;
      handledEvents.add(event);
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      panel.hidden = !expanded;
    });
  }

  FLC.boundary = { LEVELS, RULES, badgeHtml, bind };
})(window.FLC);
