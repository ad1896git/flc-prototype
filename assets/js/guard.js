window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const LATER_FR = Object.freeze([
    'FR-18', 'FR-21', 'FR-23', 'FR-24', 'FR-25', 'FR-26', 'FR-30', 'FR-31', 'FR-32'
  ]);
  const APP_NAMES = Object.freeze({ student: '学生端', teacher: '教师端', admin: '管理端' });
  const ANNO_KEY = 'flc.ui.annotations';

  function findPage(pagePath) {
    return FLC.PAGES.find(page => page.path === pagePath) || null;
  }

  function canAccess(page, account) {
    return Boolean(page && account && account.roles.some(item => page.roles.includes(item.role)));
  }

  function isLater(page) {
    return Boolean(page && (page.app === 'admin' || page.fr.some(fr => LATER_FR.includes(fr))));
  }

  function currentAccount() {
    const raw = localStorage.getItem('flc.account');
    const id = FLC.store.get('flc.account') || raw;
    return FLC.ACCOUNTS.find(account => account.id === id) || null;
  }

  function rootPrefix(pagePath) {
    return '../'.repeat((pagePath.match(/\//g) || []).length);
  }

  function decide(pagePath, account) {
    if (pagePath === 'index.html' || pagePath === '403.html') return { action: 'allow' };
    if (!account) return { action: 'login', target: 'index.html?need=account' };
    const page = findPage(pagePath);
    if (canAccess(page, account)) return { action: 'allow' };
    return { action: 'forbid', target: '403.html?from=' + pagePath };
  }

  /* ---------- 图标（内联 SVG，24×24 描边） ---------- */
  const ICON_PATHS = {
    home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    calendar: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M8 14h3',
    task: 'M9 3h6v3H9zM7 4.5H5V21h14V4.5h-2M9 13.5l2 2 4-4',
    chat: 'M4 5h16v11H9.5L4 20zM8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    notebook: 'M5 3h11l3 3v15H5zM9 8h6M9 12h6M9 16h4',
    upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
    award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 13.8 7 22l5-3 5 3-1.5-8.2',
    shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4',
    mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
    help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6',
    qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18v2M18 14h2',
    plug: 'M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM19 19v2H6',
    edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
    database: 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3zM4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    inbox: 'M3 13h5l1 3h6l1-3h5M5.5 5h13L21 13v6H3v-6z',
    timeline: 'M3 12h18M7 8v8M12 5v14M17 9v6',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    ticket: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM10 7v10',
    alert: 'M12 3 2 20h20zM12 10v4M12 17h.01',
    building: 'M4 21V5l8-3 8 3v16M9 21v-5h6v5M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01',
    bot: 'M5 8h14v11H5zM12 4v4M9 13h.01M15 13h.01M9.5 16h5',
    risk: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM12 9v4M12 16h.01',
    check: 'M4 4h16v16H4zM8 12l3 3 5-6',
    share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
    scale: 'M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z',
    flask: 'M9 3h6M10 3v6L4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2L14 9V3M7 15h10',
    gauge: 'M3 15a9 9 0 0 1 18 0M12 15l4-4M3 19h18',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
    sliders: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
    close: 'M6 6l12 12M18 6 6 18',
    logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10'
  };
  function icon(name) {
    return '<svg class="flc-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' +
      (ICON_PATHS[name] || ICON_PATHS.grid) + '"/></svg>';
  }
  /* 每个页面的图标与色调；只影响外观 */
  const PAGE_ICONS = {
    'student/portal.html': ['home'], 'student/space-search.html': ['pin', 'teal'],
    'student/booking-detail.html': ['qr', 'teal'], 'student/my-bookings.html': ['calendar', 'teal'],
    'student/companion.html': ['chat', 'violet'], 'student/tasks.html': ['task'],
    'student/task.html': ['task'], 'student/evidence.html': ['notebook', 'amber'],
    'student/submit.html': ['upload'], 'student/credentials.html': ['award', 'amber'],
    'student/my-data.html': ['shield', 'green'], 'student/messages.html': ['mail'],
    'student/help.html': ['help', 'rose'], 'external/door-qr.html': ['qr', 'teal'],
    'external/lti-launch.html': ['plug', 'violet'],
    'teacher/courses.html': ['book'], 'teacher/task-editor.html': ['edit'],
    'teacher/companion-kb.html': ['database'], 'teacher/ta-drafts.html': ['inbox'],
    'teacher/evidence-timeline.html': ['timeline'], 'teacher/briefing.html': ['chart'],
    'teacher/cases.html': ['ticket'], 'teacher/ew-review.html': ['alert'],
    'teacher/cert-issue.html': ['award'],
    'admin/spaces.html': ['building'], 'admin/utilization.html': ['chart'],
    'admin/agent-review.html': ['bot'], 'admin/risk-assessment.html': ['risk'],
    'admin/data-catalog.html': ['database'], 'admin/consent-scopes.html': ['check'],
    'admin/share-approval.html': ['share'], 'admin/fairness.html': ['scale'],
    'admin/experiments.html': ['flask'], 'admin/cockpit.html': ['gauge'],
    'admin/audit.html': ['search'], 'admin/config.html': ['sliders']
  };
  function pageIcon(path) { return (PAGE_ICONS[path] || ['grid'])[0]; }
  function tileIcon(path) {
    const entry = PAGE_ICONS[path] || ['grid'];
    return '<span class="flc-tile-icon"' + (entry[1] ? ' data-tone="' + entry[1] + '"' : '') + '>' + icon(entry[0]) + '</span>';
  }

  /* 学生端底部 tab：每个 tab 覆盖的页面（用于高亮） */
  const STUDENT_TABS = [
    { label: '首页', icon: 'home', path: 'student/portal.html', group: ['student/portal.html'] },
    { label: '找空间', icon: 'pin', path: 'student/space-search.html',
      group: ['student/space-search.html', 'student/booking-detail.html', 'student/my-bookings.html', 'external/door-qr.html'] },
    { label: '任务', icon: 'task', path: 'student/tasks.html',
      group: ['student/tasks.html', 'student/task.html', 'student/submit.html', 'student/evidence.html'] },
    { label: '学伴', icon: 'chat', path: 'student/companion.html', group: ['student/companion.html'] }
  ];

  /* ---------- 评审标注：把“（设计 §x）”“【建议值】”等条款引用包成标注 chip ---------- */
  const ANNO_PATTERN = /[（(](?:详细)?设计[^（）()]{0,80}[）)]|(?:详细)?设计\s*§[\d.]+(?:[、,，]\s*§?[\d.]+)*|【(?:建议值|待确认[^】]{0,20})】/g;
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'OPTION', 'SELECT', 'TITLE', 'BUTTON', 'INPUT', 'svg']);
  function annotate(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || node.nodeValue.indexOf('设计') < 0 && node.nodeValue.indexOf('【') < 0) return NodeFilter.FILTER_REJECT;
        for (let el = node.parentNode; el && el !== root.parentNode; el = el.parentNode) {
          if (SKIP_TAGS.has(el.nodeName) || (el.classList && (el.classList.contains('flc-anno') || el.classList.contains('flc-review')))) {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const text = node.nodeValue;
      ANNO_PATTERN.lastIndex = 0;
      if (!ANNO_PATTERN.test(text)) return;
      ANNO_PATTERN.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0;
      let match;
      while ((match = ANNO_PATTERN.exec(text))) {
        if (match.index > last) frag.append(text.slice(last, match.index));
        const span = document.createElement('span');
        span.className = 'flc-anno';
        span.textContent = match[0];
        frag.append(span);
        last = match.index + match[0].length;
      }
      if (last < text.length) frag.append(text.slice(last));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function annotationsOn() {
    try { return localStorage.getItem(ANNO_KEY) !== 'off'; } catch (error) { return true; }
  }
  function applyAnnotations(on) {
    document.documentElement.classList.toggle('flc-anno-off', !on);
  }
  applyAnnotations(annotationsOn());

  FLC.guard = { LATER_FR, APP_NAMES, findPage, canAccess, isLater, currentAccount, rootPrefix, decide };
  FLC.ui = FLC.ui || {};
  /* 学生端列表用的紧凑时间：12月3日 03:46；与当前演示时间不同年时加年份 */
  function shortTime(value) {
    const date = new Date(value);
    if (value == null || Number.isNaN(date.getTime())) return '';
    const now = new Date(FLC.time.now());
    const pad = number => String(number).padStart(2, '0');
    return (date.getFullYear() !== now.getFullYear() ? date.getFullYear() + '年' : '') +
      (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }
  FLC.ui.shortTime = shortTime;
  FLC.ui.icon = icon;
  FLC.ui.pageIcon = pageIcon;
  FLC.ui.tileIcon = tileIcon;

  document.addEventListener('DOMContentLoaded', function () {
    const pagePath = document.documentElement.dataset.page;
    const account = currentAccount();
    const prefix = rootPrefix(pagePath);
    const decision = decide(pagePath, account);
    if (decision.action !== 'allow') {
      window.location.replace(prefix + decision.target);
      return;
    }

    const page = findPage(pagePath);
    const app = page ? page.app : 'entry';
    document.documentElement.dataset.app = app;
    const escape = FLC.util.escapeHtml;
    const href = path => escape(prefix + path);
    const laterChip = '<span class="flc-later">后期</span>';

    function accountMenu() {
      if (!account) return '';
      return '<details class="flc-account-menu"><summary aria-label="' + escape('账号：' + account.name) + '">' +
        '<span class="flc-avatar" aria-hidden="true">' + escape(account.name.replace(/^演示/, '').charAt(0)) + '</span>' +
        '<span class="flc-account-name">' + escape(account.name) + '</span></summary>' +
        '<div class="flc-account-panel"><strong>' + escape(account.name) + '</strong>' +
        '<span class="flc-muted">' + escape(account.title) + '</span>' + identityList() +
        '<a class="flc-button flc-secondary" href="' + href('index.html') + '">切换身份</a></div></details>';
    }
    function identityList() {
      return '<ul class="flc-identity">' + account.roles.map(item => '<li>' +
        FLC.ui.codeLabel(FLC.ROLE_NAMES[item.role], item.role) + ' · ' + escape(item.scope_name) + '</li>').join('') + '</ul>';
    }
    const brand = (sub, link) => '<a class="flc-brand" href="' + href(link) + '"><span class="flc-brand-mark" aria-hidden="true">未</span>' +
      '<span class="flc-brand-text"><b>未来学习中心</b><small>' + escape(sub) + '</small></span></a>';

    const header = document.createElement('header');
    header.className = 'flc-topbar';

    if (app === 'student' && account) {
      header.innerHTML = brand('学生端 · 原型', 'student/portal.html') + accountMenu();
      document.body.prepend(header);

      const accessible = FLC.PAGES.filter(item => item.app === 'student' && canAccess(item, account));
      const tabs = STUDENT_TABS.filter(tab => accessible.some(item => item.path === tab.path));
      const tabPaths = tabs.map(tab => tab.path);
      const morePages = accessible.filter(item => !tabPaths.includes(item.path));
      const activeTab = tabs.find(tab => tab.group.includes(pagePath));
      const nav = document.createElement('nav');
      nav.className = 'flc-tabbar';
      nav.setAttribute('aria-label', '学生端主导航');
      nav.innerHTML = tabs.map(tab => '<a class="flc-tab" href="' + href(tab.path) + '"' +
        (tab === activeTab ? ' aria-current="page"' : '') + '><span class="flc-tab-icon">' + icon(tab.icon) + '</span>' +
        escape(tab.label) + '</a>').join('') +
        '<button type="button" class="flc-tab" id="flc-more-trigger" aria-haspopup="dialog" aria-controls="flc-more"' +
        (activeTab ? '' : ' aria-current="page"') + '><span class="flc-tab-icon">' + icon('user') + '</span>我的</button>';
      document.body.append(nav);

      const sheet = document.createElement('dialog');
      sheet.className = 'flc-sheet';
      sheet.id = 'flc-more';
      sheet.setAttribute('aria-labelledby', 'flc-more-title');
      sheet.innerHTML = '<div class="flc-sheet-head"><h2 id="flc-more-title">我的</h2>' +
        '<button type="button" class="flc-text-button" data-close aria-label="关闭">' + icon('close') + '</button></div>' +
        '<div class="flc-sheet-account"><span class="flc-avatar" aria-hidden="true">' +
        escape(account.name.replace(/^演示/, '').charAt(0)) + '</span><div><strong>' + escape(account.name) + '</strong>' +
        identityList() + '</div></div>' +
        '<ul class="flc-sheet-grid">' + morePages.map(item => '<li><a href="' + href(item.path) + '"' +
          (item.path === pagePath ? ' aria-current="page"' : '') + '>' + tileIcon(item.path) +
          '<span>' + escape(item.title.replace(/（(?!示意).*）$/, '')) + (isLater(item) ? ' ' + laterChip : '') + '</span></a></li>').join('') + '</ul>' +
        '<div class="flc-sheet-switch"><a class="flc-button flc-secondary" href="' + href('index.html') + '">切换身份</a></div>';
      document.body.append(sheet);
      const trigger = nav.querySelector('#flc-more-trigger');
      trigger.addEventListener('click', () => sheet.showModal());
      sheet.addEventListener('click', event => {
        if (event.target === sheet || event.target.closest('[data-close]')) sheet.close();
      });
      sheet.addEventListener('close', () => trigger.focus());
    } else if (account && app !== 'entry') {
      document.body.classList.add('flc-has-sidebar');
      const groups = Object.entries(APP_NAMES).map(([key, label]) => {
        const pages = FLC.PAGES.filter(item => item.app === key && canAccess(item, account));
        if (!pages.length) return '';
        return '<div class="flc-nav-group"><h2>' + escape(label) + '</h2><ul>' + pages.map(item =>
          '<li><a href="' + href(item.path) + '"' + (item.path === pagePath ? ' aria-current="page"' : '') + '>' +
          icon(pageIcon(item.path)) + '<span>' + escape(item.title) + '</span>' + (isLater(item) ? laterChip : '') +
          '</a></li>').join('') + '</ul></div>';
      }).join('');
      const sidebar = document.createElement('aside');
      sidebar.className = 'flc-sidebar';
      sidebar.innerHTML = '<div class="flc-sidebar-brand">' + brand(APP_NAMES[app] + ' · 原型', account.landing) + '</div>' +
        '<nav aria-label="当前账号可访问的页面">' + groups + '</nav>';
      header.innerHTML = '<div class="flc-topbar-title">' + escape(APP_NAMES[app]) + ' / <b>' + escape(page.title) + '</b></div>' +
        accountMenu();
      document.body.prepend(sidebar, header);
    } else if (pagePath !== 'index.html') {
      // 入口页 index.html 是登录页，不带任何应用外壳；只保留右下角评审工具条
      header.innerHTML = brand('可点击原型', 'index.html') + accountMenu();
      document.body.prepend(header);
    }

    // 账号菜单：点击外部或按 Esc 关闭
    const menu = header.querySelector('.flc-account-menu');
    if (menu) {
      document.addEventListener('click', event => { if (menu.open && !menu.contains(event.target)) menu.open = false; });
      menu.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
      });
    }

    // 评审工具条：FR 编号、“后期”、标注开关；“提意见”由 feedback.js 放入 .flc-review-panel
    // 学生端收成右下角圆形按钮，点开再展开面板，避免遮挡对话和输入区
    const review = document.createElement('aside');
    review.className = 'flc-review';
    review.setAttribute('aria-label', '评审工具');
    const panel = document.createElement('div');
    panel.className = 'flc-review-panel';
    panel.id = 'flc-review-panel';
    if (page) {
      const fr = document.createElement('span');
      fr.className = 'flc-review-fr flc-fr-badge';
      fr.setAttribute('aria-label', '需求编号');
      fr.textContent = page.fr.join(' / ');
      if (isLater(page)) {
        const later = document.createElement('span');
        later.className = 'flc-later';
        later.textContent = '后期';
        fr.append(' ', later);
      }
      panel.append(fr);
    }
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'flc-review-toggle';
    function syncToggle() {
      const on = annotationsOn();
      toggle.innerHTML = icon(on ? 'eyeOff' : 'eye') + '<span class="flc-review-label">' + (on ? '隐藏标注' : '显示标注') + '</span>';
      toggle.setAttribute('aria-label', on ? '隐藏评审标注' : '显示评审标注');
      toggle.title = on ? '隐藏评审标注（FR、角色代码、设计条款）' : '显示评审标注';
    }
    toggle.addEventListener('click', function () {
      const next = !annotationsOn();
      try { localStorage.setItem(ANNO_KEY, next ? 'on' : 'off'); } catch (error) { /* 无存储时仅本页生效 */ }
      applyAnnotations(next);
      syncToggle();
    });
    syncToggle();
    panel.append(toggle);
    review.append(panel);
    if (app === 'student' || (pagePath === 'index.html' && window.matchMedia('(max-width: 899px)').matches)) {
      review.classList.add('flc-review--compact');
      const fab = document.createElement('button');
      fab.type = 'button';
      fab.className = 'flc-review-fab';
      fab.setAttribute('aria-controls', panel.id);
      fab.setAttribute('aria-expanded', 'false');
      fab.setAttribute('aria-label', '评审工具：需求编号' + (page ? ' ' + page.fr.join(' / ') : '') + '、标注开关、提意见');
      fab.title = '评审工具';
      fab.innerHTML = icon('edit');
      panel.hidden = true;
      review.append(fab);
      const setOpen = open => {
        panel.hidden = !open;
        fab.setAttribute('aria-expanded', String(open));
        fab.innerHTML = icon(open ? 'close' : 'edit');
      };
      fab.addEventListener('click', () => setOpen(panel.hidden));
      // 点外部收起；提意见对话框打开期间（点击落在 dialog 内）不收起
      document.addEventListener('click', event => {
        if (panel.hidden || review.contains(event.target) || (event.target.closest && event.target.closest('dialog'))) return;
        setOpen(false);
      });
      review.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !panel.hidden) { setOpen(false); fab.focus(); }
      });
    }
    document.body.append(review);

    // 条款引用标注：初次渲染及之后的动态渲染都处理
    const main = document.querySelector('main');
    annotate(main);
    if (main && window.MutationObserver) {
      let scheduled = false;
      new MutationObserver(function () {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(function () { scheduled = false; annotate(main); });
      }).observe(main, { childList: true, subtree: true, characterData: true });
    }
  });
})(window.FLC);
