window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const path = 'external/door-qr.html';
    if (FLC.guard.decide(path, FLC.guard.currentAccount()).action !== 'allow') return;
    const account = FLC.guard.currentAccount();
    document.getElementById('scan-account').textContent = '当前账号：' + account.name + '（' + account.id + '）。' +
      (account.id === 'stu-01' ? '可按下方四种情形演示。' : '请先切换到 stu-01，以符合下方预期结果。');
  });
})(window.FLC);
