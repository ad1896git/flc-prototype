window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const hasRole = (account, role) => !!account && Array.isArray(account.roles) &&
    account.roles.some(entry => entry && entry.role === role);
  const time = value => typeof value === 'number' ? value : Date.parse(value);
  const absent = value => value == null || value === '';
  const compareId = (a, b) => String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0;
  function compareTime(a, b, direction) {
    const first = time(a.occurred_at);
    const second = time(b.occurred_at);
    if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : compareId(a, b);
    if (!Number.isFinite(second)) return -1;
    return direction * (first - second) || compareId(a, b);
  }

  function merge(seed = [], stored = []) {
    const byId = new Map();
    seed.concat(stored).forEach(record => byId.set(record.id, record));
    return Array.from(byId.values()).sort((a, b) => compareTime(a, b, -1));
  }

  function filter(records, criteria = {}) {
    const { from, to, role, action } = criteria;
    const start = absent(from) ? -Infinity : time(from);
    const end = absent(to) ? Infinity : time(to);
    if ((!absent(from) && !Number.isFinite(start)) ||
        (!absent(to) && !Number.isFinite(end)) || start > end) return [];
    return records.filter(record => {
      if (!absent(from) || !absent(to)) {
        const instant = time(record.occurred_at);
        if (!Number.isFinite(instant) || instant < start || instant > end) return false;
      }
      if (!absent(action) && record.action !== action) return false;
      if (absent(role)) return true;
      if (record.actor_role) return record.actor_role === role;
      const account = (FLC.ACCOUNTS || []).find(entry => entry.id === record.actor_id);
      return hasRole(account, role);
    });
  }

  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
      const sorted = {};
      Object.keys(value).sort().forEach(key => { sorted[key] = canonical(value[key]); });
      return sorted;
    }
    return value;
  }

  function chainCheck(records) {
    let head = '00000000';
    const chain = records.slice().sort((a, b) => compareTime(a, b, 1)).map(record => {
      const previous = head;
      const input = previous + '|' + JSON.stringify(canonical(record));
      let hash = 0x811c9dc5;
      for (let i = 0; i < input.length; i += 1) {
        hash = Math.imul(hash ^ input.charCodeAt(i), 0x01000193) >>> 0;
      }
      head = hash.toString(16).padStart(8, '0');
      return { id: record.id, prev_hash: previous, hash: head };
    });
    return { demo: true, count: chain.length, head, records: chain,
      message: 'FNV 哈希链示意：仅重新计算演示摘要，不能证明未篡改，未经真实锚定校验。' };
  }

  function visibleItems(account, items) {
    if (hasRole(account, 'sys_admin')) return items.filter(item => item.group === 'technical');
    return hasRole(account, 'center_admin') ? items.slice() : [];
  }

  function canEdit(account, item) {
    if (!account || !account.id || !item || !item.key || item.readonly ||
        item.key === 'crisis.companion_after_trigger') return false;
    if (hasRole(account, 'sys_admin')) return item.group === 'technical';
    return hasRole(account, 'center_admin') && item.group === 'business';
  }

  function validValue(item, value) {
    if (item.value_type === 'integer') {
      if (!Number.isSafeInteger(value)) return false;
    } else if (item.value_type === 'string') {
      if (typeof value !== 'string') return false;
    } else return false;
    const limits = item.constraints || {};
    return !(limits.min != null && value < limits.min) &&
      !(limits.max != null && value > limits.max) &&
      (!limits.enum || limits.enum.includes(value));
  }

  function saveEdit(account, item, value, reason) {
    if (!canEdit(account, item)) return { ok: false, code: 'FORBIDDEN' };
    if (typeof reason !== 'string' || !reason.trim()) return { ok: false, code: 'REASON_REQUIRED' };
    if (!validValue(item, value)) return { ok: false, code: 'VALIDATION_ERROR' };
    const edits = FLC.store.collection('config_edits');
    const seq = edits.list().filter(record => record.key === item.key)
      .reduce((max, record) => Math.max(max, Number.isSafeInteger(record.seq) ? record.seq : 0), 0) + 1;
    const record = { id: 'cfg-' + item.key + '-' + seq, key: item.key, seq, value,
      reason: reason.trim(), updated_by: account.id, updated_at: new Date(FLC.time.now()).toISOString() };
    edits.upsert(record);
    FLC.audit.log({ actor_id: account.id, action: 'config.update', target: item.key, note: record.reason });
    return { ok: true, record };
  }

  FLC.auditQuery = { merge, filter, chainCheck };
  FLC.adminConfig = { visibleItems, canEdit, saveEdit };
})(window.FLC);
