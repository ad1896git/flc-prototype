window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const reset = '先在评审工具（入口页右上角）点“重置演示数据”，再点本路线的“切换到该账号并打开”按钮；本路线独立演示。';
  const attempt = '在“我的尝试”输入并点“提交尝试”：我计划把安静自习区与小组讨论区分开，在两区之间安排缓冲空间，并保留连续的无障碍通道。我会观察高峰时段的噪声和人流，访谈不同需求的同学，再根据证据调整布局并比较两种方案的效果。';
  const roadAttempt = '在“我的尝试”输入并点“提交尝试”：我计划让行人与自行车分开等候，在交叉口标出过街区域并保持视线通畅。我会观察早晚高峰的行人和骑行流量，检查无障碍通道的连续性，对比两种等候位置的冲突风险，再通过现场观察修订方案。';
  const encouraged = 'student/companion.html?task=task-encouraged';
  const restricted = 'student/companion.html?task=task-restricted';
  const myData = 'student/my-data.html';
  FLC.DEMO_ROUTES = [
    {
      id: 'F1', title: '找空间 → 预约 → 我的预约 → 同一预约签到',
      account: 'stu-01', start: 'student/space-search.html',
      steps: [reset,
        '人工前置：在浏览器本地营业时间 08:00–22:00 内演示，留足预约时长和操作时间。选择“创客制作区”（无培训要求、无限次限制），不要选择 3D 打印机。',
        '日期选今天，开始时间填当前时间后 5 分钟（按分钟填写），结束时间晚于开始且不晚于 22:00；例如预约 30 分钟。点“提交预约”。',
        '创建成功进入详情后记下新生成的预约编号。通过导航打开“我的预约”，按该编号找到刚创建的同一预约，点详情链接。',
        '核对编号仍为刚创建的预约，并在详情所示签到窗口内点“签到”；操作应在开始后 15 分钟之前完成。不要使用 bk-stu01-open 代替新预约。'],
      expect: '新预约先为 confirmed；从“我的预约”打开的同一预约签到成功，状态变为已签到 checked_in，并显示签到时间。'
    },
    {
      id: 'F2', title: '任务发布 → 内嵌学伴 → 提交声明 → 教师证据',
      account: 'tch-01', start: 'teacher/task-editor.html?offering=off-demo',
      steps: [reset,
        { text: '第一段：填写唯一标题（如“演示共创任务”）、说明和可观察产出。边界选鼓励、模式选苏格拉底，保留“先提交有效尝试”。点“添加题目”，题型选设计，填写学习空间改进题干。点“保存草稿”，修改题干后再保存，观察策略版本，再点“发布”。段间不要重置数据。', account: 'tch-01', start: 'teacher/task-editor.html?offering=off-demo' },
        { text: '第二段：在“我的任务”按刚才的唯一标题找到刚发布的任务，查看鼓励级徽章，点标题打开任务详情。', account: 'stu-01', start: 'student/tasks.html' },
        { text: '第三段：从任务列表再次打开刚发布的同一任务，在第 1 题内嵌学伴完成有效尝试：' + attempt + ' 然后点“提示 1/3”，等回答完成。随后点“去提交”，填写正文，AI 声明选“使用”，核对平台预填工具、版本和用途，补齐使用阶段、验证方式，点“提交并保存声明”。', account: 'stu-01', start: 'student/tasks.html' },
        { text: '第四段：教学班选示例课程、学生选 stu-01，在“任务”下拉框选刚发布的唯一标题。查看学伴和提交泳道，点证据事件查看详情；需要查看正文时先阅读审计提示并确认。', account: 'tch-01', start: 'teacher/evidence-timeline.html?offering=off-demo&student=stu-01' }],
      expect: '第一段：保存草稿也会让 policy_version 加 1（策略变化时，见 decisions/05.md），发布后学生可见。第二段：同一任务出现在我的任务。第三段：内嵌学伴保留提示，提交成功显示版本及声明回执。第四段：选中刚发布的同一任务后可见 stu-01 的学伴和提交证据。'
    },
    {
      id: 'S01', title: '签到失败：还没到签到时间', account: 'stu-01',
      start: 'student/booking-detail.html?id=bk-stu01-early&scan=1',
      steps: [reset, '重置后立即打开本路线，扫码参数自动尝试签到；查看详情中的签到开放时刻，也可点“签到”重试。'],
      expect: '显示“还没到签到时间”及开放时刻，错误码 SPACE_CHECKIN_WINDOW；预约仍为 confirmed。种子开始时间约为初始化后 2 小时，签到提前 15 分钟开放。'
    },
    {
      id: 'S02', title: '签到失败：已过期', account: 'stu-01',
      start: 'student/booking-detail.html?id=bk-stu01-expired&scan=1',
      steps: [reset, '打开本路线，由扫码参数自动尝试签到；对照详情的签到截止时刻。'],
      expect: '显示“已过期”，错误码 SPACE_CHECKIN_WINDOW；该种子开始于初始化前约 30 分钟，截止于开始后 15 分钟，不会签到成功。'
    },
    {
      id: 'S03', title: '签到失败：不是本人的预约', account: 'stu-01',
      start: 'student/booking-detail.html?id=bk-stu02-other&scan=1',
      steps: [reset, '以 stu-01 打开本路线，查看页面。该预约属于 stu-02，参与者为 stu-03。'],
      expect: '详情页实际显示“预约不存在”。对应签到判定的“不是本人的预约”（NOT_FOUND，设计 §5.3.4 越权按不存在处理），不泄露他人预约详情。'
    },
    {
      id: 'S04', title: '预约拒绝：每日限次', account: 'stu-01', start: 'student/space-search.html',
      steps: [reset, '在“演示预设”点“限次”，核对选中中心研讨室、明天 16:00–17:00，再点“提交预约”。'],
      expect: '种子已有明天两条研讨室预约，显示 R_DAILY_LIMIT / SPACE_RULE_DAILY_LIMIT 及处理建议。'
    },
    {
      id: 'S05', title: '预约拒绝：培训前置', account: 'stu-01', start: 'student/space-search.html',
      steps: [reset, '在“演示预设”点“培训前置”，核对选中 3D 打印机、明天 16:00–17:00，再点“提交预约”。', '点拒绝提示中的“查看培训与认证”。'],
      expect: '显示 R_CERT_REQUIRED / SPACE_RULE_CERT，说明缺少 3D 打印机安全培训认证，并提供培训与认证入口。'
    },
    {
      id: 'S06', title: '预约拒绝：no-show 禁用期与申诉', account: 'stu-03', start: 'student/space-search.html',
      steps: [reset, '在“演示预设”点“禁用期”，核对明天 16:00–17:00，再点“提交预约”。', '点“提交申诉”，查看求助页。若提交求助，记下回执工单号；求助工单 source_ref 为 null，在工单队列按工单号找，不能按会话 id 找。'],
      expect: '显示 R_PENALTY / SPACE_RULE_PENALIZED、禁用截止与建议，页面有申诉入口。'
    },
    {
      id: 'S07', title: '我的任务：四级边界徽章', account: 'stu-01', start: 'student/tasks.html',
      steps: [reset, '查看四个已发布种子任务卡片，逐个点击禁止、限制、鼓励、开放徽章。'],
      expect: '卡片用文字、颜色和图标区分四个等级，点击徽章展开规则说明。'
    },
    {
      id: 'S08', title: '学伴顶部：边界徽章', account: 'stu-02', start: encouraged,
      steps: [reset, '查看学伴顶部的鼓励级徽章，点击展开规则。'],
      expect: '顶部显示鼓励级，规则说明包括允许模式、AI 声明要求和先尝试约束。'
    },
    {
      id: 'S09', title: '提交页：边界徽章与 AI 声明', account: 'stu-02', start: 'student/submit.html?task=task-encouraged',
      steps: [reset, '查看提交页顶部徽章并展开规则，查看“AI 使用声明”；选择“使用”查看工具明细字段。'],
      expect: '显示鼓励级徽章；声明含工具、版本、用途、使用阶段、验证方式。重置后本账号尚无该任务对话，平台预填提示为 0/3、0 轮。'
    },
    {
      id: 'S10', title: '先尝试后提示', account: 'stu-02', start: encouraged,
      steps: [reset, '先不提交尝试，观察提示按钮不可用；在“我的尝试”只填“我不知道”并点“提交尝试”，查看补充要求。', attempt, '点“提示 1/3”，等待校验和完整回答。'],
      expect: '无效尝试不消耗提示层级；有效尝试保存后才能获取提示，第一层引导选择两类学习者并寻找未有证据的判断。'
    },
    {
      id: 'S11', title: '提示层级 n/3 与上限', account: 'stu-02', start: encouraged,
      steps: [reset, attempt, '依次点“提示 1/3”“提示 2/3”“提示 3/3”，每次等回答完成后再点下一层。'],
      expect: '三层分别引导比较需求、寻找噪声/动线/无障碍证据、回应反对意见。到 3/3 后提示按钮禁用，并引导使用“需要老师”。'
    },
    {
      id: 'S12', title: '回答下方四个反馈按钮', account: 'stu-02', start: encouraged,
      steps: [reset, attempt, '点“提示 1/3”，等待回答，查看“有用、没用、我不同意、需要老师”。先点“有用”“没用”，再点“我不同意”，然后点追问“安静和讨论需求冲突怎么办？”。', '观察下一轮说明依据，再点回答下的“需要老师”，记下生成的工单号。'],
      expect: '反馈记录后对应按钮禁用；质疑后的下一轮说明依据并允许继续分歧。“需要老师”创建学业求助工单并显示工单号；此处回答反馈工单引用会话，区别于求助页 source_ref=null 的工单。'
    },
    {
      id: 'S13', title: '来源卡片展开', account: 'stu-02', start: encouraged,
      steps: [reset, attempt, '依次获取第 1、2 层提示，等待回答后展开第二层回答下的“来源 [1]”。'],
      expect: '展开显示【虚构】学习空间共创指南、演示版本、页码 12 与摘录，作为知识库来源示意。'
    },
    {
      id: 'S14', title: 'AI 标识常驻', account: 'stu-02', start: encouraged,
      steps: [reset, attempt, '获取第 1 层提示，再点“安静和讨论需求冲突怎么办？”，等待两次回答，观察顶部标识。'],
      expect: '交互和回答更新后仍显示“你正在与 AI 学伴交流”，AI 身份标识不消失。'
    },
    {
      id: 'S15', title: '元认知收尾可跳过', account: 'stu-02', start: encouraged,
      steps: [reset, attempt, '获取第 1 层提示并等回答完成，点“我完成了”。查看两个收尾问题，点“跳过”。'],
      expect: '出现元认知收尾卡片；跳过后记录 metacog_skipped，会话变为 closed，不能再获取提示。S17c 必须另行重置后演示。'
    },
    {
      id: 'S16', title: '限制级：先校验后交付', account: 'stu-02', start: restricted,
      steps: [reset, roadAttempt, '点“提示 1/3”，观察等待状态直到完整回答交付。'],
      expect: '先显示“正在校验…”，随后一次交付完整提示，引导列出行人、自行车使用者需求与冲突位置，不逐字泄露未校验内容。'
    },
    {
      id: 'S17a', title: '禁止级脚本：规则、追问与质疑', account: 'stu-02', start: 'student/companion.html?task=task-forbidden',
      steps: [reset, '打开后先阅读系统自动显示的禁止规则提示；点“为什么不能使用学伴？”，等回应完成后展开来源。', '点“我不同意”，查看规则回应与联系老师的引导。'],
      expect: '学伴关闭，只给系统规则提示，不提供解答；说明禁止级及 off 模式，引用无工具测验规则，记录质疑并提供“需要老师”。禁止级不要求先提交尝试。'
    },
    {
      id: 'S17b', title: '限制级脚本：引导、追问与质疑', account: 'stu-02', start: restricted,
      steps: [reset, roadAttempt, '依次获取三层提示并等每层校验完成，再点“如果道路宽度不够呢？”，最后点“我不同意”。'],
      expect: '三层引导检查需求、约束、验证构想；追问要求测量并比较取舍；质疑回应说明依据与可能遗漏，提供来源和老师入口，不给完整方案。'
    },
    {
      id: 'S17c', title: '鼓励级脚本：苏格拉底追问与质疑', account: 'stu-02', start: encouraged,
      steps: [reset, '本路线必须独立重置，不能沿用 S15 已 closed 的会话。', attempt, '依次获取三层提示，再点“安静和讨论需求冲突怎么办？”，最后点“我不同意”；每次等回答完成。'],
      expect: '从两类学习者的需求逐层追问证据和反对意见；追问比较空间分隔与时间安排；质疑回应承认并非唯一结论，说明指南依据并提供老师入口。'
    },
    {
      id: 'S17d', title: '开放级脚本：灵感、追问与质疑', account: 'stu-02', start: 'student/companion.html?task=task-open',
      steps: [reset, '开放级无需先尝试。依次获取三层提示，每次等逐字回答结束。', '点“可以加入提醒吗？”，再点“我不同意”。'],
      expect: '逐字显示工具灵感、原型构成、效果检验建议；追问提醒时段、暂停和关闭；质疑回应承认候选方案可能不适用，建议验证假设。'
    },
    {
      id: 'S18', title: '危机卡片、电话与人工求助', account: 'stu-03', start: 'student/companion.html?task=task-open',
      steps: [reset, '点“（演示）发送含危机信号的消息”，查看危机卡片和求助资源。', '查看可点击拨号的电话链接，无需实际拨打；如使用求助页提交，填写描述并记下回执工单号。求助页工单 source_ref 为 null，需在工单队列按工单号找，不能按会话 id 找。', '演示后回评审工具重置演示数据，以解除本次演示遗留的用户级危机限制。'],
      expect: '出现醒目的危机卡片与电话链接；默认 help_only，只显示求助资源而不继续自动辅导。学校心理中心号码标注待确认；演示后回评审工具重置演示数据。'
    },
    {
      id: 'S19', title: '教师查看对话正文前的审计提示', account: 'tch-01',
      start: 'teacher/evidence-timeline.html?offering=off-demo&student=stu-01&task=task-restricted',
      steps: [reset, '在题目会话列表点“查看对话正文”，先阅读弹窗中的审计提示，可先取消；再次打开并确认查看。'],
      expect: '查看前明确提示此操作会被审计，确认后显示正文并写入查看审计；教师只能查看本人教学班的学生，危机消息正文被遮蔽。'
    },
    {
      id: 'S20', title: '学生无权进入审计页', account: 'stu-01', start: 'admin/audit.html',
      steps: [reset, '以学生账号打开本路线的审计页，查看跳转后的权限说明。'],
      expect: '跳转 403 无权限页，显示目标、所需角色和当前角色；可返回首页或切换身份。403 页上也有“提意见”按钮。'
    },
    {
      id: 'S21', title: '心理中心人员只看到转介', account: 'psy-01', start: 'teacher/cases.html',
      steps: [reset, '查看可见工单队列，打开危机转介详情，观察页面中的权限说明和字段。'],
      expect: '心理中心人员只接收危机转介，不看学习数据；不展示常规学业工单或会话学习摘要，敏感正文查看前仍需确认审计。'
    },
    {
      id: 'S22', title: '系统管理员只看技术配置', account: 'sys-01', start: 'admin/config.html',
      steps: [reset, '查看技术配置列表，点一项打开操作视图；查看业务项区域提示。'],
      expect: '仅技术配置可见，业务区域显示“系统管理员无权查看业务敏感数据（设计 §1.3、§5.3.4）”，没有学生业务数据。'
    },
    {
      id: 'S23', title: '校院领导只看聚合指标', account: 'ldr-01', start: 'admin/cockpit.html',
      steps: [reset, '查看聚合指标图表，切换“数据表”，查看小样本抑制说明；点“指标目录查询”，选择预置问题并查询。'],
      expect: '只显示聚合结果，小样本显示抑制提示，不能下钻到个人；目录查询只返回预置的聚合指标。'
    },
    {
      id: 'S24', title: '学情简报假名与真实身份权限说明', account: 'tch-01', start: 'teacher/briefing.html',
      steps: [reset, '查看“学生学习摘要（假名）”及说明，点“查看简报详情”。'],
      expect: '学生以 analytics 用途假名显示；说明真实身份仅 ethics_member、data_steward 经 lookup_approval 审批后可查询且每次写审计。危机正文不展示，少于 10 人不生成聚合结论。'
    },
    {
      id: 'S25', title: '按场景单独同意', account: 'stu-01', start: myData,
      steps: [reset, '在“同意管理”逐项展开“阅读告知全文”。对“学伴对话日志用于教学研究”点“同意”，对“学习记录用于实验导出”点“不同意”。'],
      expect: '每个场景独立保存决策和版本；研究场景当前版本有效同意变为“是”，实验导出仍为“否”。拒绝不影响基本学习服务。'
    },
    {
      id: 'S26', title: '撤回同意及影响说明', account: 'stu-01', start: myData,
      steps: [reset, '先对“学伴对话日志用于教学研究”点“同意”，确保当前版本有效。再点该场景“撤回”，阅读受影响功能、数据去向和基本服务说明。', '点“确认撤回”，查看撤回回执及各去向状态。'],
      expect: '当前决策变为 withdrawn，有效同意为“否”；展示学习记录库、分析库和备份的处置状态。备份按周期自然过期，恢复重放撤回；基本学习服务不受影响。'
    },
    {
      id: 'S27', title: '数据导出状态', account: 'stu-01', start: myData,
      steps: [reset, '滚动到“导出”，输入任意 6 位数字验证码（如 123456），点“验证并申请导出”。观察状态变化，待可下载后点“下载示例 JSON”。'],
      expect: '依次显示排队中 queued、生成中 generating、可下载 ready，显示 24 小时有效期；发起本人示例 JSON 下载，非真实生产数据导出。'
    },
    {
      id: 'S28', title: '更正申请提交后的状态', account: 'stu-01', start: myData,
      steps: [reset, '在“更正申请”填写需要更正的数据及正确信息，例如“请核验并更正我的预约到场记录”，点“提交更正申请”。'],
      expect: '显示工单号和 P2，更正申请状态为新建 new。提示正式时限 15 个工作日，原型按 15 天模拟，不会直接完成更正。'
    },
    {
      id: 'S29', title: '删除申请提交后的状态', account: 'stu-01', start: myData,
      steps: [reset, '在“删除申请”填写需要删除的数据及说明，例如“申请删除我的历史研究用途数据，请核验适用范围”，点“提交删除申请”。'],
      expect: '显示工单号和 P2，删除申请状态为新建 new，等待人工核验处理；提交申请不等于已删除。'
    },
    {
      id: 'S30', title: '危机工单 SLA 倒计时', account: 'psy-01', start: 'teacher/cases.html?id=case-crisis-demo#op',
      steps: [reset, '重置后立即打开本路线的 case-crisis-demo，不先走其他路线；查看详情及队列的 SLA，停留几秒观察变化。'],
      expect: '倒计时持续减少。显示格式为 mm:ss，不固定精确剩余时间；超过 1 小时时分钟数会超过 60，例如 tch-01 可见的 case-academic-new 显示“1439:xx”，不折算为小时。'
    },
    {
      id: 'S31', title: '教师接管后自动回复冻结', account: 'stu-01', start: 'student/task.html?id=task-restricted',
      steps: [reset, '打开任务第 1 题（单题时默认打开），查看内嵌学伴顶部提示和禁用的输入区域。'],
      expect: '显示“自动回复已冻结：老师已接手处理（工单 TK-<日期>-000003）”，对应 case-academic-demo / conv-frozen-demo；不再自动回复。'
    },
    {
      id: 'S32', title: '院级空间管理员只能管理本节点', account: 'spa-01', start: 'admin/spaces.html',
      steps: [reset, '查看空间列表，打开一个本节点空间的操作视图，确认可管理范围。',
        { text: '再打开中心节点空间的操作视图，核对页内拒绝提示。', account: 'spa-01', start: 'admin/spaces.html?id=space-center-room#op' }],
      expect: '列表只显示本账号学院节点范围；直接打开中心节点资源时显示“无权管理该节点”，页面门禁放行与节点数据范围校验分开生效。'
    }
  ];
})(window.FLC);
