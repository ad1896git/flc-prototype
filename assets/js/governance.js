window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const hasRole = (account, role) => !!account && Array.isArray(account.roles) &&
    account.roles.some(entry => entry && entry.role === role);
  const fail = code => ({ ok: false, code });
  const text = value => typeof value === 'string' ? value.trim() : '';
  function time(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    return typeof value === 'string' && value.trim() ? Date.parse(value) : NaN;
  }

  function agentActions(account, av) {
    if (!av || !['draft', 'suspended'].includes(av.status)) return [];
    if (av.status === 'draft' && av.review_state === 'tech_review' && hasRole(account, 'agent_reviewer')) {
      return ['approve', 'request_changes'];
    }
    if (av.status === 'draft' && av.review_state === 'ethics_review' && hasRole(account, 'ethics_member')) {
      return ['approve', 'reject'];
    }
    return av.review_state === 'approved' && hasRole(account, 'center_admin') ? ['publish'] : [];
  }

  function review(account, av, action, comment) {
    if (!agentActions(account, av).includes(action)) return fail('FORBIDDEN');
    const opinion = text(comment);
    if (['request_changes', 'reject'].includes(action) && !opinion) return fail('COMMENT_REQUIRED');
    if (action === 'approve' && av.review_state === 'tech_review' &&
        av.risk_level === 'high' && !av.risk_assessment_id) return fail('FEATURE_APPROVAL_REQUIRED');
    const record = copy(av);
    const now = new Date(FLC.time.now()).toISOString();
    if (action === 'publish') {
      record.status = 'published';
      record.published_version = record.version;
    } else {
      const stage = av.review_state === 'tech_review' ? 'tech' : 'ethics';
      record.reviews = record.reviews || [];
      record.reviews.push({ agent_id: av.agent_id, version: av.version, stage,
        reviewer_id: account.id, decision: action, comment: opinion, decided_at: now });
      if (action === 'request_changes') record.review_state = 'changes_requested';
      else if (action === 'reject') record.review_state = 'rejected';
      else record.review_state = stage === 'tech' && av.risk_level === 'high' ? 'ethics_review' : 'approved';
      if (record.review_state === 'approved') record.approved_at = now;
    }
    return { ok: true, record };
  }

  function riskActions(account, assessment) {
    return assessment && assessment.status === 'submitted' &&
      (hasRole(account, 'ethics_member') || hasRole(account, 'data_steward')) ? ['approve', 'reject'] : [];
  }

  function reviewRisk(account, assessment, action, comment) {
    if (!riskActions(account, assessment).includes(action)) return fail('FORBIDDEN');
    const opinion = text(comment);
    if (action === 'reject' && !opinion) return fail('COMMENT_REQUIRED');
    if (action === 'approve' && (!text(assessment.subject_hash) || !text(assessment.assessment_doc_key) ||
        !Number.isFinite(time(assessment.valid_from)) || !Number.isFinite(time(assessment.valid_to)) ||
        time(assessment.valid_from) >= time(assessment.valid_to))) return fail('VALIDATION_ERROR');
    const record = copy(assessment);
    record.status = action === 'approve' ? 'approved' : 'rejected';
    record.ethics_opinion = opinion;
    if (action === 'approve') {
      record.approved_at = new Date(FLC.time.now()).toISOString();
      record.approvers = [{ assessment_id: record.id, approver_id: account.id,
        approver_role: hasRole(account, 'ethics_member') ? 'ethics_member' : 'data_steward',
        approved_at: record.approved_at }];
      record.approver_count = record.approvers.length;
    }
    return { ok: true, record };
  }

  function canEnable(useRecord, assessments = [], now = FLC.time.now()) {
    if (!useRecord) return fail('VALIDATION_ERROR');
    if (useRecord.risk_level === 'prohibited') return fail('FEATURE_PROHIBITED');
    if (useRecord.risk_level === 'high') {
      const instant = time(now);
      const valid = text(useRecord.use_code) && Array.isArray(assessments) && assessments.some(assessment =>
        assessment && assessment.use_code === useRecord.use_code && assessment.status === 'approved' &&
        time(assessment.valid_from) <= instant && instant < time(assessment.valid_to));
      return valid ? { ok: true } : fail('FEATURE_APPROVAL_REQUIRED');
    }
    return ['medium', 'low'].includes(useRecord.risk_level) ? { ok: true } : fail('VALIDATION_ERROR');
  }

  FLC.governance = { agentActions, review, riskActions, reviewRisk, canEnable };
})(window.FLC);
