window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const seeds = new Map();
  let fixedNow = null;
  let auditSequence = 0;

  function get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (error) {
      return null;
    }
  }

  function set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function collection(name) {
    const key = 'flc.demo.' + name;
    function list() {
      if (localStorage.getItem(key) === null) {
        if (!seeds.has(name)) return [];
        set(key, seeds.get(name)());
      }
      const records = get(key);
      return Array.isArray(records) ? records : [];
    }
    return {
      list,
      get(id) {
        return list().find(record => record.id === id) || null;
      },
      upsert(obj) {
        const records = list();
        const index = records.findIndex(record => record.id === obj.id);
        if (index < 0) records.push(obj);
        else records[index] = obj;
        set(key, records);
        return obj;
      },
      update(id, patch) {
        const records = list();
        const index = records.findIndex(record => record.id === id);
        if (index < 0) return null;
        records[index] = Object.assign({}, records[index], patch);
        set(key, records);
        return records[index];
      },
      remove(id) {
        const records = list();
        const remaining = records.filter(record => record.id !== id);
        set(key, remaining);
        return remaining.length !== records.length;
      }
    };
  }

  FLC.store = {
    get,
    set,
    registerSeed(name, fn) { seeds.set(name, fn); },
    collection,
    resetDemo() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key.startsWith('flc.demo.')) keys.push(key);
      }
      keys.forEach(key => localStorage.removeItem(key));
    }
  };

  FLC.time = {
    now() { return fixedNow === null ? Date.now() : fixedNow; },
    setNow(ms) { fixedNow = ms; }
  };

  FLC.util = {
    escapeHtml(value) {
      const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return String(value == null ? '' : value).replace(/[&<>"']/g, char => entities[char]);
    },
    param(name) { return new URLSearchParams(window.location.search).get(name); }
  };

  FLC.pseudo = function (userId, purpose) {
    const input = purpose + '|' + userId;
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i += 1) {
      hash = Math.imul(hash ^ input.charCodeAt(i), 0x01000193) >>> 0;
    }
    return purpose + ':' + hash.toString(16).padStart(8, '0');
  };

  FLC.ui = {
    pseudoNote(purpose) {
      return '学习数据以假名显示。真实身份仅 `ethics_member`、`data_steward` 经 `lookup_approval` 审批后可查询，每次查询写审计（设计 §5.4、附录 B `idmap.lookup`）';
    },
    codeLabel(zh, code) {
      const escape = FLC.util.escapeHtml;
      return escape(zh) + ' <small class="flc-code">' + escape(code) + '</small>';
    }
  };

  FLC.store.registerSeed('audit', () => []);
  FLC.audit = {
    log(entry) {
      const records = collection('audit');
      const now = FLC.time.now();
      let id;
      do {
        auditSequence += 1;
        id = 'audit-' + now + '-' + auditSequence;
      } while (records.get(id));
      const record = Object.assign({}, entry, { id, occurred_at: new Date(now).toISOString() });
      const entries = records.list();
      entries.push(record);
      set('flc.demo.audit', entries);
      return record;
    }
  };
})(window.FLC);
