window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const second = 1000;
  const day = 24 * 60 * 60 * second;
  FLC.data = FLC.data || {};
  FLC.data.consentScopes = [
    {
      code: 'companion_log_research', title: '学伴对话日志用于教学研究',
      current_version: 2, withdrawable: true,
      notice_md: '经你单独同意后，平台将你的学伴对话日志以假名用于教学研究，分析学习过程与教学改进。假名数据仍属于个人信息。研究不使用日志给你作终结性评分。你可以拒绝或随时撤回，不影响正常使用学伴、预约等基本学习服务。撤回后停止新的研究处理，并对学习记录库、分析库和备份分别登记处置回执。备份按周期自然过期，恢复时重放撤回。',
      purposes: ['teaching_research'], sinks: ['lrs', 'analytics', 'backup'],
      affects: ['停止将你的学伴日志用于后续教学研究和研究分析。']
    },
    {
      code: 'learning_experiment_export', title: '学习记录用于实验导出', example: true,
      current_version: 1, withdrawable: true,
      notice_md: '示例场景，待数据管理部门确认。经单独同意后，你的学习记录以一次性导出假名进入教学实验数据集，用于评估教学方法。假名数据仍属于个人信息。拒绝或撤回不影响基本学习服务。撤回后从后续导出和分析中剔除，并在已导出清单上登记需剔除。备份按周期自然过期。',
      purposes: ['learning_experiment'], sinks: ['experiment_export', 'backup'],
      affects: ['后续教学实验数据导出与分析不再包含你的记录。']
    },
    {
      code: 'companion_quality_eval', title: '学伴对话用于质量评测', example: true,
      current_version: 1, withdrawable: true,
      notice_md: '示例场景，待数据管理部门确认。经单独同意后，你的学伴对话以假名用于评测集及下一次模型训练快照，以改进学伴质量。假名数据仍属于个人信息。拒绝或撤回不影响基本学习服务。撤回后删除来源于你的评测样本、重建评测集版本，并从下一次训练快照中排除；已产生的评测报告只保留汇总数。演示数据尚未进入训练快照。',
      purposes: ['companion_evaluation', 'model_improvement'], sinks: ['kb_eval', 'model_training'],
      affects: ['不再使用你的对话构造后续评测集或训练快照。']
    }
  ];
  FLC.data.myData = {
    // 建议值：用于原型时间推算，不代表生产处理时长或正式保留政策。
    config: { withdrawal_delay_ms: 3 * second, backup_retention_ms: 30 * day,
      export_generating_ms: second, export_ready_ms: 3 * second,
      export_valid_ms: day, request_sla_ms: 15 * day,
      sla_note: '原型按 15 天模拟，正式为 15 个工作日' },
    sinkPolicies: {
      lrs: { title: '学习记录库', result_status: 'done',
        detail: '作废相关语句；物理删除用途映射和用户盐并验证无法再识别，后续抽取跳过已作废语句。' },
      analytics: { title: '分析库', result_status: 'done',
        detail: '物理删除相关假名对应的分析行及用途映射和用户盐，并进行再识别验证。' },
      experiment_export: { title: '实验导出', result_status: 'done',
        detail: '从后续导出和分析中剔除，并在已导出数据集清单登记需剔除。' },
      model_training: { title: '模型训练数据', result_status: 'not_applicable',
        detail: '本示例尚未进入训练快照，无历史快照需处置；后续快照排除，评估报告注明。' },
      kb_eval: { title: '评测集', result_status: 'done',
        detail: '删除本人来源样本并重新生成评测集版本，既有报告仅保留汇总数。' },
      backup: { title: '备份', result_status: 'done',
        detail: '备份按 30 天周期自然过期；恢复后重放撤回及删除，重放完成前不启动研究、导出和抽取任务。' }
    },
    catalog: [
      { category: '学伴会话与消息', purposes: ['提供学伴辅导', '经单独同意的教学研究'], retention: '示例：课程结束后 2 学期' },
      { category: '学习过程证据与提交', purposes: ['教学反馈与学生查阅'], retention: '示例：课程结束后 2 学期' },
      { category: '预约与签到记录', purposes: ['空间预约和到场管理'], retention: '示例：预约结束后 180 天' },
      { category: '同意与数据权利记录', purposes: ['记录授权及权利请求处理'], retention: '示例：处理结束后 3 年' }
    ],
    warningAttention: {
      'stu-01': { is_followed: true, reason: '辅导员确认：近期学习节奏需要支持，已与本人沟通（虚构示例）。' },
      'stu-02': { is_followed: false, reason: '暂无关注原因。' },
      'stu-03': { is_followed: false, reason: '暂无关注原因。' }
    },
    appeal_note: '如对关注状态或原因有异议，可通过求助入口提出申诉，由人工复核。'
  };
  FLC.store.registerSeed('consents', function () {
    return [{ id: 'consent-stu-01-companion_log_research-1', seq: 1, user_id: 'stu-01',
      scope_code: 'companion_log_research', scope_version: 1, decision: 'granted',
      decided_at: new Date(FLC.time.now() - 7 * day).toISOString() }];
  });
  FLC.store.registerSeed('data_rights', () => []);
  FLC.store.registerSeed('consent_withdrawal_tasks', () => []);
})(window.FLC);
