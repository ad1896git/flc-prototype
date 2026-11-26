window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const metrics = [
    { code: 'space.utilization', name: '利用率', formula: '利用率 u = f × o' },
    { code: 'space.booking_fill_rate', name: '预约填充率',
      formula: '已预约分钟数（confirmed、checked_in、completed、no_show）÷ 可预约分钟数' },
    { code: 'space.no_show_rate', name: '爽约率', formula: 'no_show ÷ (completed + no_show)' }
  ];
  const spaceDetails = {
    'space-center-room': { building: '未来学习中心楼（演示）', floor: '2', room_no: '201', acoustic_level: 'low' },
    'space-college-room': { building: '学院教学楼（演示）', floor: '1', room_no: '101', acoustic_level: 'low' },
    'space-maker': { building: '未来学习中心楼（演示）', floor: '1', room_no: '103', acoustic_level: 'high' },
    'space-collab-open': { building: '未来学习中心楼（演示）', floor: '2', room_no: '开放区', acoustic_level: 'medium' }
  };
  const end = new Date(FLC.time.now());
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  const common = {
    from: start.toISOString(), to: end.toISOString(), demo: true, metric_version: '6.18.2-demo-v1',
    open_hours_definition: '窗口内每日 08:00–22:00，按 open_hours_policy 开放时间内的分钟数',
    available_minutes: 5880
  };
  const rows = [
    { ...common, node_id: 'node-center', zone_type: 'collab_room', space_ids: ['space-center-room'],
      capacity: 8, used_minutes: 2940, person_minutes: 11760, bookable_minutes: 5880,
      booked_minutes: 3528, completed: 30, no_show: 3,
      source_minutes: { sensor: 4704, checkin: 882, missing: 294 } },
    { ...common, node_id: 'node-college', zone_type: 'collab_room', space_ids: ['space-college-room'],
      capacity: 6, used_minutes: 2352, person_minutes: 7056, bookable_minutes: 5880,
      booked_minutes: 2940, completed: 20, no_show: 5,
      source_minutes: { sensor: 0, checkin: 5292, missing: 588 } },
    { ...common, node_id: 'node-center', zone_type: 'maker', space_ids: ['space-maker'],
      capacity: 12, used_minutes: 1764, person_minutes: 10584, bookable_minutes: 5880,
      booked_minutes: 2352, completed: 18, no_show: 2,
      source_minutes: { sensor: 3528, checkin: 1764, missing: 588 } },
    { ...common, node_id: 'node-center', zone_type: 'collab_open', space_ids: ['space-collab-open'],
      capacity: 24, used_minutes: 1764, person_minutes: 21168, bookable_minutes: 0,
      booked_minutes: 0, completed: 0, no_show: 0,
      source_minutes: { sensor: 3528, checkin: 0, missing: 2352 } }
  ];
  function calculate(row) {
    const A = row.available_minutes;
    const U = row.used_minutes;
    const f = A > 0 ? U / A : null;
    const o = A > 0 && U > 0 ? row.person_minutes / (U * row.capacity) : null;
    const missing = A > 0 ? row.source_minutes.missing / A : null;
    const quality = A === 0 ? '不开放' : missing > 0.2 ? '数据不足' : '演示数据';
    return {
      frequency: f, occupancy: o, missing_rate: missing, quality,
      'space.utilization': A === 0 || missing > 0.2 ? null : U === 0 ? 0 : f * o,
      'space.booking_fill_rate': row.bookable_minutes > 0 ? row.booked_minutes / row.bookable_minutes : null,
      'space.no_show_rate': row.completed + row.no_show > 0 ? row.no_show / (row.completed + row.no_show) : null
    };
  }
  const deadTime = rows.map(row => ({
    node_id: row.node_id, zone_type: row.zone_type, weekday: 1, hour: 8,
    utilization: 0.06, consecutive_months: 6, demo: true
  }));
  FLC.data = FLC.data || {};
  FLC.data.utilization = {
    metrics, rows, spaceDetails, calculate, deadTime,
    formulas: {
      available_minutes: '可开放分钟 A = S 中落在 open_hours_policy 开放时间内的分钟数',
      used_minutes: '使用分钟 U = A 中“有人使用”的分钟数',
      frequency: '使用频率 f = U / A', occupancy: '占用率 o = (Σ_{分钟∈U} 人数) / (U × capacity)',
      dead_time: '连续 6 个月【建议值】利用率低于 10% 的时段'
    },
    source_priority: ['sensor', 'checkin', 'missing'],
    dead_time_threshold: { months: 6, utilization: 0.1, suggested: true }
  };
  FLC.store.registerSeed('space_edits', () => []);
})(window.FLC);
