window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const MINUTE = 60000;
  const DAY = 24 * 60 * MINUTE;
  const iso = value => new Date(value).toISOString();
  const config = {
    window_before_min: 15, // 【建议值】开始前签到分钟数
    window_after_min: 15, // 【建议值】开始后签到分钟数
    no_show_grace_min: 0, // 【建议值】本示例仅二维码签到，无门禁迟到宽限
    advance_days: 7, // 【建议值】最多提前天数
    daily_limit: { device: 1, collab_room: 2 } // 【建议值】同类设备 / 研讨室每日限次
  };
  const openHours = {
    weekly: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
      .map(day => [day, [['08:00', '22:00']]])),
    exceptions: []
  };
  const nodes = [
    { id: 'node-center', name: '未来学习中心', node_type: 'flagship', campus: '犀浦校区',
      campus_id: 'campus-xipu', share_class: 'shared', status: 'active',
      admission_status: 'admitted', open_hours_policy: openHours },
    { id: 'node-college', name: '某学院节点', node_type: 'college', campus: '九里校区',
      campus_id: 'campus-jiuli', share_class: 'restricted', status: 'active',
      admission_status: 'admitted', open_hours_policy: openHours }
  ];
  function space(id, name, node, zone, capacity, occupancy, a11y) {
    return { id, name, node_id: node.id, campus: node.campus, campus_id: node.campus_id,
      resource_type: 'space', zone_type: zone, capacity, occupancy, a11y,
      status: 'active', bookable: zone !== 'collab_open', node_status: node.status,
      admission_status: node.admission_status, open_hours_policy: node.open_hours_policy };
  }
  const spaces = [
    space('space-center-room', '中心研讨室', nodes[0], 'collab_room', 8, 2,
      { wheelchair: true, adjustable_desk: true, hearing_loop: false }),
    space('space-college-room', '学院研讨室', nodes[1], 'collab_room', 6, 1,
      { wheelchair: true, adjustable_desk: false, hearing_loop: false }),
    space('space-maker', '创客制作区', nodes[0], 'maker', 12, 3,
      { wheelchair: true, adjustable_desk: true, hearing_loop: false }),
    space('space-collab-open', '开放小组区', nodes[0], 'collab_open', 24, 9,
      { wheelchair: true, adjustable_desk: false, hearing_loop: true })
  ];
  const devices = [{
    ...spaces[2], id: 'device-3d-printer', name: '3D 打印机', space_id: spaces[2].id,
    resource_type: 'equipment', category: '3d_printer', capacity: 1, occupancy: 0,
    required_cert: '3D 打印机安全培训'
  }];
  const certs = []; // stu-01 尚无“3D 打印机安全培训”认证。
  const now = FLC.time.now();
  const penalties = [{
    id: 'penalty-stu03', user_id: 'stu-03', reason: 'no_show_threshold',
    start_at: iso(now - DAY), end_at: iso(now + 3 * DAY), lifted_at: null
  }];

  function demoSlots(now) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    function slot(hour) {
      const start = new Date(tomorrow);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(hour + 1);
      return { from: iso(start), to: iso(end) };
    }
    return { dailyExisting: [slot(10), slot(14)], request: slot(16) };
  }

  FLC.data = FLC.data || {};
  FLC.data.spaces = { config, nodes, spaces, devices, certs, penalties, demoSlots };
  FLC.store.registerSeed('bookings', function () {
    const now = FLC.time.now();
    // 使用统一窗口算法；不调用 create/check，夜间也保留三种签到演示状态。
    function booking(id, booker, start, resource, participants = [], end = start + 60 * MINUTE) {
      return {
        id, booker_id: booker, resource_type: resource.resource_type, resource_id: resource.id,
        zone_type: resource.zone_type, category: resource.category || null,
        from: iso(start), to: iso(end), local_date: FLC.booking.localDate(start),
        status: 'confirmed', checked_in_at: null, participants,
        ...FLC.booking.window(start, config)
      };
    }
    const slots = demoSlots(now);
    return [
      booking('bk-stu01-open', 'stu-01', now + 5 * MINUTE, spaces[2]),
      booking('bk-stu01-early', 'stu-01', now + 2 * 60 * MINUTE, spaces[2]),
      booking('bk-stu01-expired', 'stu-01', now - 30 * MINUTE, spaces[2]),
      booking('bk-stu02-other', 'stu-02', now + 5 * MINUTE, spaces[1],
        [{ user_id: 'stu-03', checked_in_at: null }]),
      ...slots.dailyExisting.map((slot, index) => booking('bk-stu01-tomorrow-' + (index + 1),
        'stu-01', Date.parse(slot.from), spaces[0], [], Date.parse(slot.to)))
    ];
  });
})(window.FLC);
