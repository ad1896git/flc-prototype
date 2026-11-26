window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const MINUTE = 60000;
  const ms = value => new Date(value).getTime();
  const iso = value => new Date(value).toISOString();
  const userId = user => typeof user === 'string' ? user : user && user.id;
  const RULE_ORDER = [
    { rule: 'R_RESOURCE_STATE', code: 'SPACE_RESOURCE_UNAVAILABLE', message: '资源不存在、不可预约或已停用' },
    { rule: 'R_OPEN_HOURS', code: 'SPACE_RULE_CLOSED', message: '预约时段必须完整落在同一业务日的开放时段内' },
    { rule: 'R_ADVANCE_WINDOW', code: 'SPACE_RULE_WINDOW', message: '预约开始时间超出可提前预约范围' },
    { rule: 'R_PENALTY', code: 'SPACE_RULE_PENALIZED', message: '当前处于预约禁用期' },
    { rule: 'R_CERT_REQUIRED', code: 'SPACE_RULE_CERT', message: '缺少预约结束时仍有效的设备培训认证' },
    { rule: 'R_DAILY_LIMIT', code: 'SPACE_RULE_DAILY_LIMIT', message: '当天该类资源预约次数已达上限' }
  ];
  const STATUS_LABELS = {
    confirmed: '已确认', checked_in: '已签到', completed: '已完成', cancelled: '已取消', no_show: '未到场'
  };

  function localDate(value) {
    const date = new Date(value);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')].join('-');
  }

  function inOpenHours(resource, from, to) {
    if (!Number.isFinite(ms(from)) || !Number.isFinite(ms(to)) || ms(to) <= ms(from) ||
        localDate(from) !== localDate(to)) return false;
    const policy = resource.open_hours_policy;
    if (!policy) return false;
    const date = new Date(from);
    const exception = (policy.exceptions || []).find(item => item.date === localDate(from));
    if (exception && exception.closed) return false;
    const day = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
    const hours = exception && exception.hours ? exception.hours : (policy.weekly || {})[day] || [];
    const at = time => {
      const parts = time.split(':').map(Number);
      const result = new Date(from);
      result.setHours(parts[0], parts[1], 0, 0);
      return result.getTime();
    };
    return hours.some(([start, end]) => ms(from) >= at(start) && ms(to) <= at(end));
  }

  function check(ctx) {
    const { resource, from, to, now, config } = ctx;
    const id = userId(ctx.user);
    const fail = (index, message, hint) => ({ ok: false, ...RULE_ORDER[index],
      message: message || RULE_ORDER[index].message, hint });
    if (!resource || !resource.id || resource.status !== 'active' || resource.bookable !== true ||
        resource.zone_type === 'collab_open' || resource.deleted_at ||
        resource.node_status !== 'active' || resource.admission_status !== 'admitted') {
      return fail(0, null, '请选择正常开放、可预约且节点已准入的资源。');
    }
    if (!inOpenHours(resource, from, to)) return fail(1, null, '请选择同一天内完整的开放时段。');
    const latest = new Date(now);
    latest.setDate(latest.getDate() + config.advance_days);
    if (!Number.isFinite(ms(now)) || ms(from) < ms(now) || ms(from) > latest.getTime()) {
      return fail(2, '开始时间须在现在至提前 ' + config.advance_days + ' 天内', '请选择可提前预约范围内的时段。');
    }
    const penalty = (ctx.penalties || []).find(item => item.user_id === id && !item.lifted_at &&
      ms(item.start_at) <= ms(now) && ms(now) < ms(item.end_at));
    if (penalty) return fail(3, '预约禁用原因：' + penalty.reason + '；禁用截止时间：' + penalty.end_at,
      '如有异议，请前往 student/help.html?type=appeal 提交申诉。');
    if (resource.required_cert && !(ctx.certs || []).some(cert => cert.user_id === id &&
        cert.cert_code === resource.required_cert && !cert.revoked_at &&
        ms(cert.issued_at) <= ms(now) && ms(cert.expires_at) > ms(to))) {
      return fail(4, '需要“' + resource.required_cert + '”认证，且预约结束时仍有效、未撤销。',
        '请前往 student/credentials.html 参加设备安全培训并取得认证。');
    }
    const device = resource.resource_type === 'equipment';
    const limit = device ? config.daily_limit.device :
      resource.zone_type === 'collab_room' ? config.daily_limit.collab_room : null;
    const count = (ctx.bookings || []).filter(booking => booking.booker_id === id &&
      ['confirmed', 'checked_in'].includes(booking.status) &&
      (booking.local_date || localDate(booking.from)) === localDate(from) &&
      (device ? booking.resource_type === 'equipment' && booking.category === resource.category :
        booking.resource_type === 'space' && booking.zone_type === 'collab_room')).length;
    if (limit != null && count >= limit) return fail(5,
      '同一业务日内' + (device ? '该类设备' : '研讨室') + '限约 ' + limit + ' 次，你当天已约 ' + count + ' 次',
      '请选择其他业务日，或取消不再需要的预约。');
    return { ok: true };
  }

  function window(from, config) {
    const start = ms(from);
    const until = start + config.window_after_min * MINUTE;
    return {
      checkin_from: iso(start - config.window_before_min * MINUTE),
      checkin_until: iso(until), no_show_at: iso(until + config.no_show_grace_min * MINUTE)
    };
  }

  function create(ctx) {
    const result = check(ctx);
    if (!result.ok) return result;
    const id = userId(ctx.user);
    return { ok: true, booking: {
      id: ctx.id || ['bk', id, ctx.resource.id, ms(ctx.now), ms(ctx.from)].join('-'),
      booker_id: id, resource_type: ctx.resource.resource_type, resource_id: ctx.resource.id,
      zone_type: ctx.resource.zone_type, category: ctx.resource.category || null,
      from: iso(ctx.from), to: iso(ctx.to), local_date: localDate(ctx.from),
      status: 'confirmed', checked_in_at: null, purpose: ctx.purpose || '',
      participants: (ctx.participants || []).map(item => ({ user_id: item.user_id, checked_in_at: null })),
      ...window(ctx.from, ctx.config)
    } };
  }

  function visibleTo(booking, user) {
    const id = userId(user);
    return Boolean(booking && id && (booking.booker_id === id ||
      (booking.participants || []).some(item => item.user_id === id)));
  }

  function checkin(booking, user, now) {
    if (!visibleTo(booking, user)) return { ok: false, code: 'NOT_FOUND', message: '不是本人的预约' };
    if (booking.status !== 'confirmed') return {
      ok: false, code: 'SPACE_INVALID_TRANSITION', message: '当前预约状态不能签到：' + booking.status
    };
    if (ms(now) < ms(booking.checkin_from)) return {
      ok: false, code: 'SPACE_CHECKIN_WINDOW', message: '还没到签到时间', at: booking.checkin_from
    };
    if (!Number.isFinite(ms(now)) || !Number.isFinite(ms(booking.checkin_from)) ||
        !Number.isFinite(ms(booking.checkin_until)) || ms(now) >= ms(booking.checkin_until)) return {
      ok: false, code: 'SPACE_CHECKIN_WINDOW', message: '已过期', at: booking.checkin_until
    };
    const owner = booking.booker_id === userId(user);
    if (!owner && booking.participants.some(item => item.user_id === userId(user) && item.checked_in_at)) {
      return { ok: false, code: 'SPACE_INVALID_TRANSITION', message: '你已签到，请勿重复签到' };
    }
    const updated = { ...booking, participants: (booking.participants || []).map(item => ({ ...item })) };
    if (owner) {
      updated.status = 'checked_in';
      updated.checked_in_at = iso(now);
    } else {
      updated.participants.find(item => item.user_id === userId(user)).checked_in_at = iso(now);
    }
    return { ok: true, booking: updated, role: owner ? 'owner' : 'participant' };
  }

  FLC.booking = { RULE_ORDER, STATUS_LABELS, check, window, create, checkin, visibleTo, localDate };
})(window.FLC);
