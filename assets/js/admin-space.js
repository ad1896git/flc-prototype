window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const ZONE_LABELS = {
    self_study: '自习区', collab_room: '研讨室', collab_open: '开放小组区',
    consult: '咨询区', maker: '创客制作区', showcase: '展示区', interview: '面谈间'
  };
  const ACOUSTIC_LABELS = { silent: '安静', low: '低', medium: '中', high: '高' };
  const STATUS_LABELS = { active: '正常', maintenance: '维护中', retired: '已退役' };
  const EDIT_FIELDS = ['name', 'building', 'floor', 'room_no', 'zone_type', 'acoustic_level',
    'capacity', 'a11y', 'status', 'bookable'];

  function visibleNodes(account, nodes) {
    const roles = account && account.roles || [];
    if (roles.some(role => role.role === 'center_admin' && role.scope_type === 'global')) return nodes.slice();
    const ids = roles.filter(role => ['space_admin', 'equipment_tech'].includes(role.role) &&
      role.scope_type === 'space_node').map(role => role.scope_id);
    return nodes.filter(node => ids.includes(node.id));
  }

  function canManage(account, spaceId) {
    const data = FLC.data.spaces;
    const space = data.spaces.find(item => item.id === spaceId);
    return Boolean(space && visibleNodes(account, data.nodes).some(node => node.id === space.node_id));
  }

  function merged(space, edits) {
    const result = { ...space, a11y: { ...space.a11y } };
    edits.filter(edit => edit.space_id === space.id).forEach(edit => {
      EDIT_FIELDS.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(edit, key)) {
          result[key] = key === 'a11y' ? { ...result.a11y, ...edit.a11y } : edit[key];
        }
      });
    });
    return result;
  }

  function validate(space, patch) {
    const errors = {};
    if (!String(patch.name || '').trim()) errors.name = '请填写空间名称。';
    if (!Object.prototype.hasOwnProperty.call(ZONE_LABELS, patch.zone_type)) errors.zone_type = '请选择有效分区。';
    if (!Object.prototype.hasOwnProperty.call(ACOUSTIC_LABELS, patch.acoustic_level)) errors.acoustic_level = '请选择声学等级。';
    if (!Object.prototype.hasOwnProperty.call(STATUS_LABELS, patch.status)) errors.status = '请选择有效状态。';
    if (!Number.isInteger(patch.capacity) || patch.capacity < 1 ||
        patch.capacity < (space.min_group || 1) || patch.capacity < (space.max_group || 1)) {
      errors.capacity = '容量须为正整数，且不能小于已有小组人数限制。';
    }
    return errors;
  }

  FLC.adminSpace = { visibleNodes, canManage, merged, validate, ZONE_LABELS, ACOUSTIC_LABELS, STATUS_LABELS };
})(window.FLC);
