window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const openTypes = ['essay', 'design', 'open_ended'];
  const forbiddenKinds = ['exam', 'no_tool_assessment', 'thesis_raw_data'];

  function allowedModes(level) {
    const rule = FLC.boundary.RULES[level];
    return rule ? rule.companion_modes.slice() : [];
  }

  function defaultMode(level) {
    const rule = FLC.boundary.RULES[level];
    return rule && rule.default_mode;
  }

  function matches(rule, task, offering) {
    if (rule.enabled === false || !rule.match) return false;
    const entries = Object.entries(rule.match);
    return entries.length > 0 && entries.every(([field, values]) => {
      if (!['task_kind', 'discipline', 'college_id'].includes(field)) return false;
      const value = field === 'task_kind' ? task.task_kind : offering && offering[field];
      return value != null && Array.isArray(values) && values.includes(value);
    });
  }

  function validate(task, floorRules = [], offering) {
    const violations = [];
    const add = (rule_id, field, reason) => violations.push({ rule_id, field, reason });
    if (!allowedModes(task.ai_boundary).includes(task.companion_mode)) {
      add('TASK_MODE_ALLOWED', 'companion_mode', '所选等级与学伴模式组合不合法。');
    }
    if (['restricted', 'encouraged'].includes(task.ai_boundary)) {
      (task.problems || []).forEach((problem, index) => {
        if (!openTypes.includes(problem.problem_type) && problem.answer_key_provided !== true) {
          add('TASK_ANSWER_KEY_REQUIRED', 'problems.' + index + '.answer_key_provided',
            '此题须确认已提供参考答案和答案模式。');
        }
      });
    }
    const rank = level => FLC.boundary.LEVELS.indexOf(level);
    const matched = floorRules.filter(rule => matches(rule, task, offering));
    const ceiling = Math.min(...matched.map(rule => rank(rule.max_level)));
    if (rank(task.ai_boundary) > ceiling) {
      matched.filter(rule => rank(task.ai_boundary) > rank(rule.max_level)).forEach(rule => {
        add(rule.id, 'ai_boundary', '超过禁止清单“' + rule.name + '”的等级上限：' + rule.max_level + '。');
      });
    }
    if (forbiddenKinds.includes(task.task_kind)) {
      if (task.ai_boundary !== 'forbidden') {
        add('TASK_KIND_FORBIDDEN', 'ai_boundary', '考试、无工具测验和论文原始数据必须为禁止级。');
      }
      if (task.companion_mode !== 'off') {
        add('TASK_KIND_FORBIDDEN', 'companion_mode', '此任务类型必须关闭学伴。');
      }
    }
    return violations.length ? { ok: false, code: 'TASK_BOUNDARY_INVALID', violations } :
      { ok: true, violations };
  }

  function save(prev, next, { reason, floorRules = [], offering, now } = {}) {
    const result = validate(next, floorRules, offering);
    if (!result.ok) return result;
    const boundaryChanged = !!prev && prev.ai_boundary !== next.ai_boundary;
    const notifyStudents = !!prev && prev.status === 'published' && boundaryChanged;
    if (notifyStudents && (typeof reason !== 'string' || !reason.trim())) {
      return { ok: false, code: 'TASK_REASON_REQUIRED' };
    }
    const versions = floorRules.filter(rule => rule.enabled !== false)
      .map(rule => [rule.id, rule.version]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const changed = !!prev && (['ai_boundary', 'companion_mode', 'attempt_first', 'problems']
      .some(field => JSON.stringify(prev[field]) !== JSON.stringify(next[field])) ||
      (prev.boundary_floor_versions !== undefined &&
        JSON.stringify(prev.boundary_floor_versions) !== JSON.stringify(versions)));
    const task = JSON.parse(JSON.stringify(next));
    task.policy_version = prev ? (prev.policy_version || 1) + (changed ? 1 : 0) : 1;
    task.boundary_floor_versions = versions;
    if (now !== undefined) task.updated_at = new Date(now).toISOString();
    return { ok: true, task, notifyStudents };
  }

  function publish(prev, next, opts) {
    return save(prev, { ...next, status: 'published' }, opts);
  }

  function close(task) {
    return { ok: true, task: { ...JSON.parse(JSON.stringify(task)), status: 'closed' }, notifyStudents: false };
  }

  function newTaskId(now) {
    return 'task-' + now.toString(36);
  }

  function nextProblemId(task) {
    const seq = Math.max(0, ...(task.problems || []).map(problem => problem.seq));
    return task.id + '-p' + (seq + 1);
  }

  function canBindAgent(agent, task) {
    if (task.ai_boundary === 'forbidden') {
      return { ok: false, code: 'GUARD_AGENT_NOT_ALLOWED', reason: '禁止级任务关闭学伴，不能绑定智能体。' };
    }
    if (!(agent.supported_boundaries || []).includes(task.ai_boundary)) {
      return { ok: false, code: 'GUARD_AGENT_NOT_ALLOWED', reason: '此智能体不支持任务等级：' + task.ai_boundary + '。' };
    }
    return { ok: true };
  }

  function validateUpload({ title, license, rights_confirmed }) {
    if (rights_confirmed !== true) {
      return { ok: false, code: 'KB_RIGHTS_UNCONFIRMED', reason: '请确认拥有上传和使用此文档的权利。' };
    }
    if (typeof title !== 'string' || !title.trim() || typeof license !== 'string' || !license.trim()) {
      return { ok: false, code: 'KB_METADATA_REQUIRED', reason: '请填写文档标题与版权许可。' };
    }
    return { ok: true };
  }

  FLC.taskEditor = { allowedModes, defaultMode, validate, save, publish, close,
    newTaskId, nextProblemId, canBindAgent, validateUpload };
})(window.FLC);
