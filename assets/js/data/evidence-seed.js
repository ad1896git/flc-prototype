window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const HOUR = 60 * 60 * 1000;
  const users = ['stu-01', 'stu-02'];
  const tasks = ['task-restricted', 'task-open'];
  const samples = {
    'task-restricted': {
      k: '推导需要明确已知量与条件。', w: '如何验证推理中每一步成立？', l: '可以逐步核对条件并用反例检验。',
      title: '分步推导与核验报告', description: '虚构作品：列出推导过程、条件检查和独立核验结果。',
      reflection: '下次先写出约束，再逐步检查推导依据。'
    },
    'task-open': {
      k: '开放探索需要比较多个方案。', w: '如何选择适合使用者的方案？', l: '可通过比较标准和反馈修订方案。',
      title: '开放探索方案', description: '虚构作品：比较两种方案，说明选择依据和修订结果。',
      reflection: '下次先确定比较标准，再独立验证工具给出的建议。'
    }
  };

  function entries(now = FLC.time.now()) {
    const iso = hours => new Date(now - hours * HOUR).toISOString();
    const evidence = users.flatMap((userId, userIndex) => tasks.flatMap(taskId => {
      const sample = samples[taskId];
      const prefix = 'evs-' + userId + '-' + taskId + '-';
      const common = { user_id: userId, task_id: taskId };
      const at = hours => iso(hours + userIndex);
      return [
        { ...common, id: prefix + 'kwl', type: 'kwl', created_at: at(48),
          k: sample.k, w: sample.w, l: sample.l },
        ...['red', 'yellow', 'green'].map((color, index) => ({
          ...common, id: prefix + 'progress-' + color, type: 'progress', color,
          created_at: at(36 - index * 8),
          note: ['需要澄清条件与目标。', '正在完善方案与验证步骤。', '已完成并独立核验。'][index]
        })),
        { ...common, id: prefix + 'product', type: 'product', created_at: at(10),
          title: sample.title, description: sample.description },
        { ...common, id: prefix + 'reflection', type: 'reflection', created_at: at(8),
          content: sample.reflection }
      ];
    }));
    const quizzes = users.flatMap((userId, userIndex) =>
      ['task-restricted', 'task-encouraged', 'task-open'].map((taskId, taskIndex) => ({
        id: 'evs-' + userId + '-' + taskId + '-quiz', user_id: userId, task_id: taskId,
        type: 'quiz', created_at: iso(2 + userIndex + taskIndex),
        score: 78 + userIndex * 7 + taskIndex * 3, max_score: 100
      })));
    return evidence.concat(quizzes);
  }

  FLC.data = FLC.data || {};
  FLC.data.evidenceSeed = { entries };
})(window.FLC);
