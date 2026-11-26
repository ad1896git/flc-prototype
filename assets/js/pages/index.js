window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const escape = FLC.util.escapeHtml;
    const current = FLC.guard.currentAccount();
    if (FLC.util.param('need') === 'account') {
      document.getElementById('account-alert').hidden = false;
    }

    // ---------- 登录视图：分组 tab + 演示账号单选 + 账号/密码（示意） ----------
    const GROUPS = [
      { app: 'student', label: '学生', note: '学生端 · 移动端' },
      { app: 'teacher', label: '教师', note: '教师、辅导员、心理中心、技术员 · PC' },
      { app: 'admin', label: '管理', note: '管理端 · PC' }
    ];
    const groupOf = account => account.landing.split('/')[0];
    const accountsOf = app => FLC.ACCOUNTS.filter(account => groupOf(account) === app);
    const findAccount = id => FLC.ACCOUNTS.find(account => account.id === id);
    // 登录后去向：账号自带的 landing（accounts.js）→ 学生门户 / 我的课程 → pages.json 顺序中第一个可访问页面
    function homeFor(account) {
      const has = code => account.roles.some(item => item.role === code);
      const allowed = FLC.PAGES.filter(page => FLC.guard.canAccess(page, account));
      const fallback = has('student') ? 'student/portal.html' : has('teacher') ? 'teacher/courses.html' : '';
      const page = allowed.find(item => item.path === account.landing) ||
        allowed.find(item => item.path === fallback) || allowed[0];
      return page ? page.path : '403.html';
    }

    const tabsRoot = document.getElementById('login-tabs');
    const panel = document.getElementById('login-accounts');
    const idInput = document.getElementById('login-id');
    const errorBox = document.getElementById('login-error');
    let activeApp = current ? groupOf(current) : 'student';
    let selectedId = current ? current.id : '';

    tabsRoot.innerHTML = GROUPS.map(group => '<button type="button" role="tab" id="login-tab-' + group.app +
      '" data-app="' + group.app + '" aria-controls="login-accounts">' + escape(group.label) + '</button>').join('');
    const tabs = Array.from(tabsRoot.querySelectorAll('[role="tab"]'));

    function accountOption(account) {
      const codes = account.roles.map(item => item.role).filter((code, index, list) => list.indexOf(code) === index);
      return '<li><label class="flc-login-option">' +
        '<input type="radio" name="login-account" value="' + escape(account.id) + '"' +
        (account.id === selectedId ? ' checked' : '') + '>' +
        '<span class="flc-avatar" aria-hidden="true">' + escape(account.name.replace(/^演示/, '').charAt(0)) + '</span>' +
        '<span class="flc-login-option-text"><span class="flc-login-option-name">' + escape(account.name) +
        ' <span class="flc-login-option-title">· ' + escape(account.title) + '</span></span>' +
        '<small class="flc-code">' + escape(account.id + ' · ' + codes.join(' / ')) + '</small></span>' +
        (current && current.id === account.id ? '<span class="flc-current">当前</span>' : '') +
        '</label></li>';
    }
    function renderGroup(app, focusTab) {
      activeApp = app;
      const group = GROUPS.find(item => item.app === app);
      const accounts = accountsOf(app);
      if (!accounts.some(account => account.id === selectedId) && accounts.length) {
        selectedId = accounts[0].id;
        idInput.value = selectedId;
      }
      tabs.forEach(tab => {
        const on = tab.dataset.app === app;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        if (on && focusTab) tab.focus();
      });
      panel.setAttribute('aria-labelledby', 'login-tab-' + app);
      panel.innerHTML = '<fieldset><legend>选择演示账号 <span class="flc-login-note">' + escape(group.note) +
        '</span></legend><ul class="flc-login-options">' + accounts.map(accountOption).join('') + '</ul></fieldset>';
    }
    tabsRoot.addEventListener('click', event => {
      const tab = event.target.closest('[role="tab"]');
      if (tab) renderGroup(tab.dataset.app, true);
    });
    tabsRoot.addEventListener('keydown', event => {
      const index = tabs.indexOf(document.activeElement);
      if (index < 0) return;
      const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      renderGroup(tabs[(next + tabs.length) % tabs.length].dataset.app, true);
    });
    panel.addEventListener('change', event => {
      if (event.target.name !== 'login-account') return;
      selectedId = event.target.value;
      idInput.value = selectedId;
      errorBox.hidden = true;
    });
    // 手动输入账号 ID 时同步分组与单选
    idInput.addEventListener('input', () => {
      errorBox.hidden = true;
      const account = findAccount(idInput.value.trim());
      selectedId = account ? account.id : '';
      if (account && groupOf(account) !== activeApp) renderGroup(groupOf(account), false);
      panel.querySelectorAll('input[name="login-account"]').forEach(radio => { radio.checked = radio.value === selectedId; });
    });

    function login() {
      const account = findAccount(idInput.value.trim());
      if (!account) {
        errorBox.textContent = idInput.value.trim() ? '未找到该演示账号，请从上方列表选择。' : '请先选择一个演示账号。';
        errorBox.hidden = false;
        idInput.focus();
        return;
      }
      localStorage.setItem('flc.account', account.id);
      window.location.assign(homeFor(account));
    }
    const form = document.getElementById('login-form');
    form.addEventListener('submit', event => { event.preventDefault(); login(); });
    // 单选框上按 Enter 也直接登录（浏览器对 radio 不做隐式提交）
    form.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.name === 'login-account') { event.preventDefault(); login(); }
    });
    document.getElementById('login-sso').addEventListener('click', login);

    if (current) {
      const box = document.getElementById('login-current');
      box.innerHTML = '当前已登录：<strong>' + escape(current.name) + '</strong> <span class="flc-muted">' +
        escape(current.title) + '</span> <button type="button" class="flc-text-button" id="login-logout">退出登录</button>';
      box.hidden = false;
      box.querySelector('#login-logout').addEventListener('click', () => {
        localStorage.removeItem('flc.account');
        window.location.replace('index.html');
      });
    }
    idInput.value = selectedId;
    renderGroup(activeApp, false);

    // ---------- 视图切换：#review 为评审工具，其余为登录页 ----------
    const loginView = document.getElementById('login-view');
    const reviewView = document.getElementById('review-view');
    function showView(moveFocus) {
      const review = window.location.hash === '#review';
      loginView.hidden = review;
      reviewView.hidden = !review;
      document.documentElement.dataset.view = review ? 'review' : 'login';
      document.title = (review ? '评审工具' : '登录') + '｜未来学习中心原型';
      if (moveFocus) {
        window.scrollTo(0, 0);
        (review ? document.getElementById('review-title') : tabs.find(tab => tab.tabIndex === 0)).focus();
      }
    }
    showView(false);
    window.addEventListener('hashchange', () => showView(true));

    document.getElementById('page-list').innerHTML = Object.entries(FLC.guard.APP_NAMES).map(([app, label]) =>
      '<section class="flc-card"><h3>' + escape(label) + '</h3><ul class="flc-page-list">' +
      FLC.PAGES.filter(page => page.app === app).map(page => {
        const allowed = FLC.guard.canAccess(page, current);
        return '<li><a href="' + escape(page.path) + '">' + escape(page.title) + '</a>' +
          (allowed ? '' : ' <span class="flc-locked"><span aria-hidden="true">🔒</span> 无权限</span>') +
          (FLC.guard.isLater(page) ? ' <span class="flc-later">后期</span>' : '') +
          '<small class="flc-code">' + escape(page.fr.join(' / ')) + '</small></li>';
      }).join('') + '</ul></section>'
    ).join('');

    const routesRoot = document.getElementById('demo-routes');
    const routes = FLC.DEMO_ROUTES;
    function targetValid(target, shouldAllow) {
      const account = FLC.ACCOUNTS.find(item => item.id === target.account);
      const page = FLC.PAGES.find(item => item.path === target.start.split(/[?#]/)[0]);
      return Boolean(account && page && FLC.guard.canAccess(page, account) === shouldAllow);
    }
    function openButton(target, routeIndex, stepIndex) {
      const account = FLC.ACCOUNTS.find(item => item.id === target.account);
      const label = account ? account.name + '（' + account.id + '）' : target.account;
      return '<button type="button" data-route="' + escape(routeIndex) + '"' +
        (stepIndex === undefined ? '' : ' data-step="' + escape(stepIndex) + '"') + '>' +
        escape('切换到 ' + label + ' 并打开') + '</button>';
    }
    routesRoot.setAttribute('aria-labelledby', 'demo-routes-title');
    routesRoot.innerHTML = '<h2 id="demo-routes-title">演示路线</h2>' +
      '<p>每条路线单独从重置开始。先点上方“重置演示数据”，再用卡片按钮进入；F2 段间不重置，可回评审工具继续下一段。</p>' +
      [['F', '核心流程'], ['S', '关键状态']].map(([prefix, title]) =>
        '<section aria-labelledby="routes-' + escape(prefix) + '"><h3 id="routes-' + escape(prefix) + '">' +
        escape(title) + '</h3><div class="demo-route-grid">' + routes.map((route, routeIndex) => {
          if (!route.id.startsWith(prefix)) return '';
          const account = FLC.ACCOUNTS.find(item => item.id === route.account);
          const valid = targetValid(route, route.id !== 'S20') && route.steps.every(step =>
            typeof step === 'string' || !step.account || targetValid(step, true));
          return '<article class="flc-card demo-route" aria-labelledby="route-' + escape(route.id) + '">' +
            '<h4 id="route-' + escape(route.id) + '"><span class="flc-code">' + escape(route.id) +
            '</span> ' + escape(route.title) + '</h4>' +
            (valid ? '' : '<p class="flc-alert" role="alert">路线配置有误</p>') +
            '<p>账号：' + escape(account ? account.name : '账号不存在') + ' <span class="flc-code">' +
            escape(route.account) + '</span></p>' + openButton(route, routeIndex) +
            '<p class="demo-route-start">起始页面：<code>' + escape(route.start) + '</code></p><ol>' +
            route.steps.map((step, stepIndex) => '<li>' + escape(typeof step === 'string' ? step : step.text) +
              (typeof step === 'object' && step.account ? '<div class="demo-route-action">' +
                openButton(step, routeIndex, stepIndex) + '</div>' : '') + '</li>').join('') +
            '</ol><h5>预期结果</h5><p>' + escape(route.expect) + '</p></article>';
        }).join('') + '</div></section>'
      ).join('');
    routesRoot.addEventListener('click', function (event) {
      const button = event.target.closest('button[data-route]');
      if (!button || !routesRoot.contains(button)) return;
      const route = routes[Number(button.dataset.route)];
      const target = button.hasAttribute('data-step') ? route.steps[Number(button.dataset.step)] : route;
      if (!targetValid(target, target === route ? route.id !== 'S20' : true)) return;
      localStorage.setItem('flc.account', target.account);
      window.location.assign(target.start);
    });

    document.getElementById('reset-demo').addEventListener('click', function () {
      FLC.store.resetDemo();
      document.getElementById('reset-status').textContent = '已重置';
    });
  });
})(window.FLC);
