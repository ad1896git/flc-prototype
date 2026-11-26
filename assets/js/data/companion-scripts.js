window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  FLC.data = FLC.data || {};
  const source = (doc, page, excerpt) => ({ doc, version: '演示 v1.0', page, excerpt });
  const scripts = [
    {
      boundary: 'forbidden', mode: FLC.boundary.RULES.forbidden.default_mode,
      task_id: 'task-forbidden', problem_id: 'task-forbidden-p1',
      generic: { content: '本任务禁止使用 AI，学伴已关闭。如需确认规则，请使用“需要老师”联系任课教师。' },
      turns: [
        { id: 'forbidden-crisis', situation: 'crisis',
          student: '（演示）发送含危机信号的消息', demo_text: '（演示）我不想活了，需要有人帮助我。' },
        { id: 'forbidden-hint', situation: 'hint', student: '请给我一个提示', reply: {
          content: '本任务为无工具测验，禁止使用 AI，学伴不提供提示或解答。你可以通过“需要老师”咨询任务规则。'
        } },
        { id: 'forbidden-followup', situation: 'followup', student: '为什么不能使用学伴？', reply: {
          content: '本任务设置为禁止级、学伴模式为关闭（off），依据为无工具测验规则与任务设置。需要确认适用范围时请联系任课教师。',
          citations: [source('【虚构】无工具测验任务规则', 1, '本次测验须独立完成，不使用 AI 或其他工具。')]
        } },
        { id: 'forbidden-challenge', situation: 'challenge', student: '我不同意', reply: {
          content: '已记录你对规则的不同意见。当前任务仍禁止使用 AI；请选择“需要老师”，由任课教师确认规则，不提供题目解答。'
        } }
      ]
    },
    {
      boundary: 'restricted', mode: FLC.boundary.RULES.restricted.default_mode,
      task_id: 'task-restricted', problem_id: 'task-restricted-p1',
      generic: { content: '请指出你方案中尚不确定的一个约束，我们可以一起核查依据；完整方案仍由你独立形成。' },
      turns: [
        { id: 'restricted-crisis', situation: 'crisis',
          student: '（演示）发送含危机信号的消息', demo_text: '（演示）我不想活了，需要有人帮助我。' },
        { id: 'restricted-hint-1', situation: 'hint', student: '先从哪里考虑？', reply: {
          hint_level: 1, content: '先列出行人、自行车使用者的需求，找出两者在交叉口可能冲突的位置。暂时不急着画完整方案。'
        } },
        { id: 'restricted-hint-2', situation: 'hint', student: '怎样检查约束？', reply: {
          hint_level: 2, content: '在草图上标出视线遮挡、过街等待和无障碍通行的位置。你的方案在哪种高峰情境下最容易失效？[1]',
          citations: [source('【虚构】校园慢行交通学习材料', 8, '方案验证应关注交叉冲突、视距及无障碍连续性。')]
        } },
        { id: 'restricted-hint-3', situation: 'hint', student: '如何验证我的构想？', reply: {
          hint_level: 3, content: '选一个最危险的冲突点，写出“预期风险—方案措施—观察指标”，用高峰和低峰两种情境检查。请自己确定措施与判据；仍有疑问可选择“需要老师”。'
        } },
        { id: 'restricted-followup', situation: 'followup', student: '如果道路宽度不够呢？', reply: {
          content: '请先测量可用宽度，并指出哪项需求不能降低。你能提出两种取舍，再解释各自的风险吗？'
        } },
        { id: 'restricted-challenge', situation: 'challenge', student: '我不同意', reply: {
          content: '我理解你有不同判断；我的提示可能遗漏现场条件。依据是优先检查冲突点与通行连续性[1]，请指出不适用之处，也可以选择“需要老师”确认。',
          citations: [source('【虚构】校园慢行交通学习材料', 8, '验证应结合现场条件，不能只凭通用示意图判断安全。')]
        } }
      ]
    },
    {
      boundary: 'encouraged', mode: FLC.boundary.RULES.encouraged.default_mode,
      task_id: 'task-encouraged', problem_id: 'task-encouraged-p1',
      generic: { content: '你最希望验证哪项判断？请提出一个理由、一种反对意见和可观察的证据，我们继续追问。' },
      turns: [
        { id: 'encouraged-crisis', situation: 'crisis',
          student: '（演示）发送含危机信号的消息', demo_text: '（演示）我不想活了，需要有人帮助我。' },
        { id: 'encouraged-hint-1', situation: 'hint', student: '怎样开始比较方案？', reply: {
          hint_level: 1, content: '先选出两类需求不同的学习者。你的主张分别怎样影响他们？有哪些判断还没有证据？'
        } },
        { id: 'encouraged-hint-2', situation: 'hint', student: '怎样寻找证据？', reply: {
          hint_level: 2, content: '能否用噪声、动线和无障碍三个角度检验主张？为其中一个角度选择观察方式，并解释它能支持什么判断。[1]',
          citations: [source('【虚构】学习空间共创指南', 12, '从不同使用者的活动需求出发，结合观察和访谈评价空间。')]
        } },
        { id: 'encouraged-hint-3', situation: 'hint', student: '怎样完善论证？', reply: {
          hint_level: 3, content: '假设有人反对你最看重的安排：他会提出什么证据？你准备如何回应，什么观察结果会让你修订主张？请把这些写进验证计划；需要时可请老师协助。'
        } },
        { id: 'encouraged-followup', situation: 'followup', student: '安静和讨论需求冲突怎么办？', reply: {
          content: '你能想到空间分隔或时间安排两种思路吗？哪一种更照顾不便移动的同学，你打算怎样验证？'
        } },
        { id: 'encouraged-challenge', situation: 'challenge', student: '我不同意', reply: {
          content: '谢谢你指出分歧，我的追问不代表唯一结论。指南强调从不同学习者的需求出发[1]；如果你的证据支持另一种取舍，请说明依据，也可选择“需要老师”一起复核。',
          citations: [source('【虚构】学习空间共创指南', 12, '评价应考虑不同学习者，并允许根据新证据修订方案。')]
        } }
      ]
    },
    {
      boundary: 'open', mode: FLC.boundary.RULES.open.default_mode,
      task_id: 'task-open', problem_id: 'task-open-p1',
      generic: { content: '可以从目标用户、核心功能和效果验证三个方面展开。告诉我你想深入哪一项，并核验学伴建议是否适合实际使用者。' },
      turns: [
        { id: 'open-crisis', situation: 'crisis',
          student: '（演示）发送含危机信号的消息', demo_text: '（演示）我不想活了，需要有人帮助我。' },
        { id: 'open-hint-1', situation: 'hint', student: '给我一些工具灵感', reply: {
          hint_level: 1, content: '可以探索复习日历、任务拆分或学习伙伴配对。先选一个真实困难，例如计划过满，明确它影响哪类同学。'
        } },
        { id: 'open-hint-2', situation: 'hint', student: '怎样形成原型？', reply: {
          hint_level: 2, content: '以复习日历为例：输入可用时间和学习目标，生成可调整的每日安排，并允许标记未完成的原因。先画出输入、计划、回顾三个界面。'
        } },
        { id: 'open-hint-3', situation: 'hint', student: '怎样检验效果？', reply: {
          hint_level: 3, content: '请几位同学试用一周，比较计划可执行性与调整次数，并访谈未完成的原因。示例指标需要你验证，不能把完成次数直接当作学习效果。[1]',
          citations: [source('【虚构】学习工具原型验证手册', 5, '结合行为记录和使用者访谈，区分操作完成与学习成效。')]
        } },
        { id: 'open-followup', situation: 'followup', student: '可以加入提醒吗？', reply: {
          content: '可以加入由使用者设置的提醒时段、暂停和关闭选项，再观察提醒是否造成打扰。先做最小原型，记录使用者的反馈。'
        } },
        { id: 'open-challenge', situation: 'challenge', student: '我不同意', reply: {
          content: '我理解你的不同意见。这个例子只是候选方案，可能不适合你的目标用户。请指出不成立的假设，我们用访谈或试用验证；也可以选择“需要老师”复核。'
        } }
      ]
    }
  ];
  // SLA 演示建议值：2 个自然日，不替代学校工作日日历。
  FLC.data.companion = { scripts, academicHelpSlaMs: 2 * 24 * 60 * 60 * 1000 };
  FLC.store.registerSeed('conversations', function () {
    const restrictedScript = scripts.find(script => script.boundary === 'restricted');
    if (!restrictedScript) throw new Error('conv-frozen-demo 种子缺少 restricted 脚本');
    const firstHint = restrictedScript.turns.find(turn =>
      turn.situation === 'hint' && turn.reply && turn.reply.hint_level === 1);
    if (!firstHint) throw new Error('conv-frozen-demo 种子缺少 restricted 脚本的 hint_level=1 提示');
    const message = (seq, role, kind, content, extra = {}) => ({
      id: 'conv-frozen-demo-m' + seq, seq, role, kind, content,
      hint_level: null, citations: [], flags: [], sensitivity: 'normal', feedback: [], ...extra
    });
    return [{
      id: 'conv-frozen-demo', user_id: 'stu-01', task_id: 'task-restricted', problem_id: 'task-restricted-p1',
      boundary: 'restricted', mode: FLC.boundary.RULES.restricted.default_mode, attempt_first: true,
      hint_level: 1, attempt_submitted: true, crisis_flagged: false, status: 'frozen',
      messages: [
        message(1, 'user', 'attempt', '我的初步方案是让行人与自行车在交叉口分开等候，并标出过街区域。我会观察早晚高峰的人流与骑行流量，检查视线遮挡和无障碍通行，之后再调整等候位置。'),
        message(2, 'assistant', 'hint', firstHint.reply.content, { hint_level: 1, feedback: ['need_teacher'] }),
        message(3, 'system_notice', 'system', '已转给老师，工单号 TK-' + new Date(FLC.time.now()).toISOString().slice(0, 10).replace(/-/g, '') + '-000003。'),
        message(4, 'system_notice', 'system', '自动回复已冻结：老师已接手处理（工单 TK-' + new Date(FLC.time.now()).toISOString().slice(0, 10).replace(/-/g, '') + '-000003）')
      ]
    }];
  });
})(window.FLC);
