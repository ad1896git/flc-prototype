window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  FLC.data = FLC.data || {};
  FLC.data.crisis = {
    // 仅供原型演示，正式词库须经心理中心审定【待确认-X14】。
    terms: ['不想活了', '想伤害自己', '想自杀'],
    resources: [
      { name: '学校心理中心【待确认-X14】', phone: '000-00000000',
        address: '心理中心地址占位【待确认-X14】', opening_hours: '开放时间待确认【待确认-X14】' },
      { name: '全国统一心理援助热线（以官方公布为准）', phone: '12356',
        address: '电话服务，无现场地址', opening_hours: '服务时间以官方公布为准' },
      { name: '紧急报警', phone: '110', address: '电话接警，无固定到访地址', opening_hours: '全天' },
      { name: '医疗急救', phone: '120', address: '电话调度，无固定到访地址', opening_hours: '全天' }
    ],
    copy: {
      title: '先让支持来到你身边',
      care: '谢谢你告诉我。你值得被关心，请先联系专业老师或身边可信任的人，让他们陪着你。下方是可以联系的求助资源。',
      help_only: '现在先把求助放在第一位，专业老师会联系你'
    },
    // SLA 均为【建议值】；个人与学业求助按自然日简化，不替代学校工作日日历。
    config: {
      crisis_sla_ms: 15 * 60 * 1000,
      distress_sla_ms: 24 * 60 * 60 * 1000,
      academic_sla_ms: 2 * 24 * 60 * 60 * 1000,
      mode: 'help_only'
    }
  };
  FLC.store.registerSeed('crisis_holds', () => []);
})(window.FLC);
