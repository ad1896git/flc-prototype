window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const text = value => typeof value === 'string' ? value.trim() : '';
  const fail = code => ({ ok: false, code });
  const actorId = actor => typeof actor === 'string' ? actor : actor.id;
  const editable = ['std_category', 'std_level', 'internal_level', 'purposes', 'retention_rule'];

  function mergedCatalog(items, edits) {
    return items.map(item => {
      const row = copy(item);
      edits.filter(edit => edit.item_id === item.id).forEach(edit => {
        editable.forEach(key => {
          if (Object.prototype.hasOwnProperty.call(edit, key)) row[key] = copy(edit[key]);
        });
      });
      return row;
    });
  }

  function validateCatalogEdit(edit) {
    const row = edit || {};
    const fields = ['std_category', 'std_level'].filter(key => !text(row[key]));
    if (!Number.isInteger(row.internal_level) || row.internal_level < 1 || row.internal_level > 4) {
      fields.push('internal_level');
    }
    if (!Array.isArray(row.purposes) || !row.purposes.length || row.purposes.some(value => !text(value))) {
      fields.push('purposes');
    }
    const rule = row.retention_rule;
    if (!(text(rule) || (rule && !Array.isArray(rule) && text(rule.description)))) {
      fields.push('retention_rule');
    }
    return fields.length ? { ok: false, code: 'VALIDATION_ERROR', fields } : { ok: true };
  }

  function latestVersion(row, versions) {
    return versions.filter(version => version.scope_code === row.code &&
      Number.isInteger(version.version) && version.version > row.current_version)
      .reduce((latest, version) => !latest || version.version > latest.version ? version : latest, null);
  }

  function scopeRows(scopes, versions, extras) {
    return scopes.map(scope => {
      const latest = latestVersion(scope, versions);
      const extra = extras[scope.code] || {};
      return { ...copy(scope), minors_policy: extra.minors_policy || 'exclude_under_14',
        effective_count: latest ? 0 : (extra.effective_count || 0),
        current_version: latest ? latest.version : scope.current_version,
        notice_md: latest ? latest.notice_md : scope.notice_md,
        purposes: copy(latest ? latest.purposes : scope.purposes) };
    });
  }

  function publishVersion(row, versions, notice, actor, now) {
    const notice_md = text(notice);
    if (!notice_md) return fail('CONSENT_NOTICE_REQUIRED');
    const latest = latestVersion(row, versions);
    const version = (latest ? latest.version : row.current_version) + 1;
    const record = { id: 'csv-' + row.code + '-' + version, scope_code: row.code, version,
      notice_md, purposes: copy(latest ? latest.purposes : row.purposes), effective_at: new Date(now).toISOString(),
      published_by: actorId(actor) };
    return { ok: true, record, message: '旧版本的同意不再有效，需要重新征询' };
  }

  function reviewShare(req, decision, comment, actor, now) {
    if (!req || req.status !== 'submitted' || !['approved', 'rejected'].includes(decision)) {
      return fail('SHARE_INVALID_TRANSITION');
    }
    const conditions = text(comment);
    if (!conditions) return fail('SHARE_COMMENT_REQUIRED');
    return { ok: true, record: { ...copy(req), status: decision, conditions,
      approver_id: actorId(actor), decided_at: new Date(now).toISOString() } };
  }

  function sampleRows(req) {
    return (req.samples || []).map(sample => ({
      student: FLC.pseudo(sample.user_id, 'export:' + req.id),
      learning_events: sample.learning_events, completion_rate: sample.completion_rate
    }));
  }

  FLC.dataGov = { mergedCatalog, validateCatalogEdit, scopeRows, publishVersion, reviewShare, sampleRows };
})(window.FLC);
