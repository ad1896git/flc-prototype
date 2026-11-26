window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const day = 24 * 60 * 60 * 1000;
  const copy = value => JSON.parse(JSON.stringify(value));
  // 分类名称、级别映射和保留期均为原型示例，待数据管理部门确认。
  const catalog = [
    { id: 'dci-companion-message', item_name: '学伴对话正文', system_module: 'M09',
      table_name: 'message', column_names: ['content_enc'], std_category: '教学过程数据',
      std_level: '第3级（示例，待确认）', internal_level: 3,
      purposes: ['companion.course_tutoring'],
      retention_rule: { after: 'offering_end', semesters: 2, description: '建议值：课程结束后 2 学期' },
      destroy_method: 'hard_delete', steward_id: 'dst-01', legal_basis: 'edu_necessary', consent_scope_code: null },
    { id: 'dci-submission', item_name: '学习任务提交正文', system_module: 'M13',
      table_name: 'submission', column_names: ['content_enc'], std_category: '教学过程数据',
      std_level: '第3级（示例，待确认）', internal_level: 3,
      purposes: ['teaching_feedback'],
      retention_rule: { after: 'offering_end', semesters: 2, description: '建议值：课程结束后 2 学期' },
      destroy_method: 'hard_delete', steward_id: 'dst-01', legal_basis: 'edu_necessary', consent_scope_code: null },
    { id: 'dci-booking', item_name: '空间预约与签到', system_module: 'M03',
      table_name: 'booking', column_names: ['booker_id', 'checked_in_at'], std_category: '学习服务数据',
      std_level: '第2级（示例，待确认）', internal_level: 2,
      purposes: ['space_management'],
      retention_rule: { after: 'booking_end', days: 180, description: '建议值：预约结束后 180 天' },
      destroy_method: 'anonymize', steward_id: 'dst-01', legal_basis: 'edu_necessary', consent_scope_code: null },
    { id: 'dci-consent', item_name: '场景同意决策', system_module: 'M17',
      table_name: 'consent_record', column_names: ['user_id', 'decision'], std_category: '授权管理数据',
      std_level: '第3级（示例，待确认）', internal_level: 3,
      purposes: ['consent_management'],
      retention_rule: { after: 'processing_end', years: 3, description: '建议值：处理结束后 3 年' },
      destroy_method: 'hard_delete', steward_id: 'dst-01', legal_basis: 'legal_duty', consent_scope_code: null },
    { id: 'dci-research-log', item_name: '教学研究学习日志', system_module: 'M17',
      table_name: 'fact_learning_event', column_names: ['analytics_pseudo', 'verb'], std_category: '教学过程数据',
      std_level: '第3级（示例，待确认）', internal_level: 3,
      purposes: ['teaching_research'],
      retention_rule: { after: 'offering_end', semesters: 2, description: '建议值：课程结束后 2 学期；撤回后停止研究处理' },
      destroy_method: 'hard_delete', steward_id: 'dst-01', legal_basis: 'separate_consent',
      consent_scope_code: 'companion_log_research' },
    { id: 'dci-experiment', item_name: '教学实验学习记录', system_module: 'M17',
      table_name: 'fact_learning_event', column_names: ['verb', 'score'], std_category: '教学过程数据',
      std_level: '第3级（示例，待确认）', internal_level: 3,
      purposes: ['learning_experiment'],
      retention_rule: { after: 'experiment_end', days: 180, description: '建议值：实验结束后 180 天；撤回后从后续导出剔除' },
      destroy_method: 'hard_delete', steward_id: 'dst-01', legal_basis: 'separate_consent',
      consent_scope_code: 'learning_experiment_export' }
  ];
  const scopeExtras = {
    companion_log_research: { minors_policy: 'exclude_under_14', effective_count: 126 },
    learning_experiment_export: { minors_policy: 'exclude_under_14', effective_count: 64 },
    companion_quality_eval: { minors_policy: 'guardian_required', effective_count: 38 }
  };
  const labels = {
    status: { submitted: '待审批', approved: '已通过', rejected: '已驳回', delivered: '已交付', expired: '已过期' },
    minors_policy: { exclude_under_14: '不向未满 14 周岁学生展示', guardian_required: '需监护人同意' },
    legal_basis: { edu_necessary: '教育教学必要', separate_consent: '单独同意', legal_duty: '法定义务' },
    destroy_method: { hard_delete: '物理删除', anonymize: '匿名化', crypto_shred: '密钥销毁', expire_backup: '备份自然过期' },
    purposes: { 'companion.course_tutoring': '课程学伴辅导', teaching_feedback: '教学反馈',
      space_management: '空间预约和到场管理', consent_management: '同意与权利管理',
      teaching_research: '教学研究', learning_experiment: '教学实验',
      companion_evaluation: '学伴质量评测', model_improvement: '模型质量改进' },
    errors: { VALIDATION_ERROR: '请填写完整的分级、用途和保留期',
      CONSENT_NOTICE_REQUIRED: '请填写告知文本', SHARE_COMMENT_REQUIRED: '请填写审批意见',
      SHARE_INVALID_TRANSITION: '仅待审批申请可通过或驳回' }
  };

  function shareRequests() {
    const now = FLC.time.now();
    const iso = offset => new Date(now + offset * day).toISOString();
    return ['submitted', 'approved', 'rejected', 'delivered', 'expired'].map((status, index) => {
      const decided = status !== 'submitted';
      return { id: 'share-demo-' + (index + 1), requester_id: 'tch-01',
        purpose: index % 2 ? 'learning_experiment' : 'teaching_research',
        item_ids: [index % 2 ? 'dci-experiment' : 'dci-research-log'],
        recipient: '示例校内教学研究组（虚构）', recipient_verification: '演示：已核验用途与接收方',
        deidentify_method: '按 export:<request_id> 生成假名；假名数据仍属个人信息',
        period: { from: iso(-7), to: iso(status === 'expired' ? -1 : 30) }, status,
        approver_id: decided ? 'dst-01' : null, decided_at: decided ? iso(-3) : null,
        conditions: !decided ? null : status === 'rejected' ? '用途说明不充分，请补充研究方案。' : '仅限批准用途；到期删除，不得尝试再识别。',
        delivery_receipt: status === 'delivered' ? '演示交付回执 share-demo-4' : null,
        samples: [
          { user_id: 'stu-01', learning_events: 24, completion_rate: 0.8 },
          { user_id: 'stu-02', learning_events: 18, completion_rate: 0.6 },
          { user_id: 'stu-03', learning_events: 27, completion_rate: 0.9 }
        ] };
    });
  }

  FLC.data = FLC.data || {};
  FLC.data.dataGov = { catalog, scopeExtras, labels, shareRequests };
  FLC.store.registerSeed('catalog_edits', () => []);
  FLC.store.registerSeed('consent_scope_versions', () => []);
  FLC.store.registerSeed('data_share_requests', () => copy(shareRequests()));
})(window.FLC);
