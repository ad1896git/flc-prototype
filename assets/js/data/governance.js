window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const day = 24 * 60 * 60 * 1000;
  const iso = ms => new Date(ms).toISOString();

  function ai_use_registry() {
    const confirmed_at = iso(FLC.time.now() - 7 * day);
    return [
      ['emotion_inference', '用生物识别推断学生情绪（禁止用途示例）', 'prohibited'],
      ['academic_warning', '学业预警分级', 'high'],
      ['automated_grading', '自动评分并计入成绩', 'high'],
      ['companion.course_tutoring', '课程学伴辅导', 'medium'],
      ['resource_search', '资源检索', 'low']
    ].map(([use_code, description, risk_level]) => ({ id: 'use-' + use_code,
      use_code, description, risk_level, confirmed_by_ethics: 'eth-01', confirmed_at }));
  }

  function ai_risk_assessment() {
    const now = FLC.time.now();
    function assessment(use_code, seq, status, from, to) {
      const id = 'ra-' + use_code + '-' + seq;
      const approved = status === 'approved' || status === 'expired';
      const approved_at = approved ? iso(now - 20 * day) : null;
      return { id, use_code, subject_type: 'feature', subject_ref: 'feature:' + use_code,
        subject_hash: 'a'.repeat(64), scope: { offering_ids: ['off-demo'], populations: ['undergrad'] },
        assessment_doc_key: 'demo/risk/' + use_code + '-' + seq,
        ethics_opinion: approved ? '演示评估：需人工复核。' : null,
        status, approved_at, valid_from: iso(now + from * day), valid_to: iso(now + to * day),
        approver_count: approved ? 1 : 0,
        approvers: approved ? [{ assessment_id: id, approver_id: 'eth-01',
          approver_role: 'ethics_member', approved_at }] : [] };
    }
    return [
      assessment('academic_warning', 1, 'approved', -10, 80),
      assessment('automated_grading', 1, 'expired', -100, -1),
      assessment('automated_grading', 2, 'submitted', 0, 90),
      assessment('companion.course_tutoring', 1, 'draft', 0, 90)
    ];
  }

  function agent_version() {
    const now = FLC.time.now();
    return [
      ['course_companion', 2, 'draft', 'tech_review', 'companion.course_tutoring', '课程学伴'],
      ['warning_assistant', 1, 'draft', 'ethics_review', 'academic_warning', '预警辅助'],
      ['resource_finder', 1, 'published', 'approved', 'resource_search', '资源检索助手'],
      ['course_companion', 1, 'suspended', 'approved', 'companion.course_tutoring', '课程学伴（暂停版本）'],
      ['legacy_finder', 1, 'retired', 'approved', 'resource_search', '旧版检索助手']
    ].map(([agent_code, version, status, review_state, use_code, name]) => {
      const use = ai_use_registry().find(record => record.use_code === use_code);
      const agent_id = 'agent-' + agent_code;
      return { id: 'av-' + agent_code + '-' + version, agent_code, agent_id, version, status,
        published_version: status === 'draft' ? null : version,
        use_code, risk_level: use.risk_level, review_state,
        card_hash: 'b'.repeat(64),
        card: { name, purpose: use.description, use_code, owner: { user_id: 'tch-01', unit_id: 'node-college' },
          agent_kind: use.risk_level === 'low' ? 'service' : 'companion',
          supported_boundaries: ['restricted', 'encouraged', 'open'], model_alias: 'chat-local-main',
          public_facing: false, a11y_checked: true, languages: ['zh-CN'] },
        submitted_at: iso(now - 3 * day), approved_at: review_state === 'approved' ? iso(now - day) : null,
        approval_subject_type: 'agent_version', approval_subject_ref: 'agent:' + agent_id + '@' + version,
        risk_assessment_id: use.risk_level === 'high' ? 'ra-academic_warning-2' : null,
        reviews: [] };
    });
  }

  // This pending assessment is bound to the high-risk agent version, not its feature approval.
  function assessmentsWithAgent() {
    const records = ai_risk_assessment();
    const now = FLC.time.now();
    records.push({ id: 'ra-academic_warning-2', use_code: 'academic_warning',
      subject_type: 'agent_version', subject_ref: 'agent:agent-warning_assistant@1',
      subject_hash: 'b'.repeat(64), scope: { offering_ids: ['off-demo'], populations: ['undergrad'] },
      assessment_doc_key: 'demo/risk/warning_assistant-1', ethics_opinion: null,
      status: 'submitted', approved_at: null, valid_from: iso(now), valid_to: iso(now + 90 * day),
      approver_count: 0, approvers: [] });
    return records;
  }

  FLC.data = FLC.data || {};
  FLC.data.governance = { agent_version, ai_use_registry, ai_risk_assessment: assessmentsWithAgent };
  Object.entries(FLC.data.governance).forEach(([name, seed]) => FLC.store.registerSeed(name, seed));
})(window.FLC);
