window.FLC = window.FLC || {};
(function (FLC) {
  'use strict';
  const clean = value => typeof value === 'string' ? value.trim() : '';

  function offeringsFor(user) {
    const ids = new Set(FLC.SEED.enrollments.filter(item => item.user_id === user.id &&
      item.role === 'learner' && item.status === 'active').map(item => item.offering_id));
    return FLC.SEED.offerings.filter((item, index, all) => ids.has(item.id) &&
      all.findIndex(other => other.id === item.id) === index);
  }

  function makeCase(kind, user, form, cases, now) {
    if (!['academic', 'personal'].includes(kind)) return { ok: false, field: 'kind', message: '请选择求助类型。' };
    const description = clean(form.description);
    if (!description) return { ok: false, field: 'description', message: '请填写你希望获得的帮助。' };
    const academic = kind === 'academic';
    const offerings = academic ? offeringsFor(user) : [];
    const offeringId = academic ? clean(form.offering_id) || (offerings.length === 1 ? offerings[0].id : '') : null;
    if (academic && !offerings.some(item => item.id === offeringId)) return {
      ok: false, field: 'offering_id', message: offerings.length ? '请选择你已选课的教学班。' :
        '你暂无有效选课，无法提交学业求助。你仍可选择个人求助或联系上方资源。'
    };
    const type = academic ? 'academic_help' : 'distress';
    const date = new Date(now).toISOString();
    const max = cases.reduce((value, item) => {
      const match = /^TK-\d{8}-(\d+)$/.exec(item.ticket_no);
      return match ? Math.max(value, Number(match[1])) : value;
    }, 0);
    let idTime = now;
    while (cases.some(item => item.id === 'case-' + type + '-' + idTime.toString(36))) idTime += 1;
    const config = FLC.data.crisis.config;
    return { ok: true, ticket: {
      id: 'case-' + type + '-' + idTime.toString(36),
      ticket_no: 'TK-' + date.slice(0, 10).replace(/-/g, '') + '-' + String(max + 1).padStart(6, '0'),
      type, subtype: null, priority: academic ? 'P2' : 'P1', subject_user_id: user.id,
      offering_id: offeringId, source_ref: null, payload_demo: description,
      summary: academic ? '学生请求任课教师或助教提供学业协助。' : '学生请求辅导员提供个人支持。',
      visibility: academic ? 'standard' : 'restricted_psych', status: 'new',
      assignee_role: academic ? 'teacher' : 'counselor', created_at: date,
      sla_due_at: new Date(now + (academic ? config.academic_sla_ms : config.distress_sla_ms)).toISOString(),
      claimed_at: null, resolution_code: null, resolution: null
    } };
  }

  FLC.help = { makeCase };

  document.addEventListener('DOMContentLoaded', function () {
    if (FLC.guard.decide('student/help.html', FLC.guard.currentAccount()).action !== 'allow') return;
    const user = FLC.guard.currentAccount();
    const esc = FLC.util.escapeHtml;
    const byId = id => document.getElementById(id);
    const form = byId('help-form');
    const offering = byId('help-offering');
    const description = byId('help-description');
    const receipt = byId('help-receipt');
    const offerings = offeringsFor(user);
    const selectedKind = () => form.querySelector('input[name="kind"]:checked').value;
    byId('help-resources').innerHTML = FLC.data.crisis.resources.map(resource =>
      '<article class="help-resource"><h3>' + esc(resource.name) + '</h3><a href="tel:' +
      esc(resource.phone) + '">拨打 ' + esc(resource.phone) + '</a><p>地址：' + esc(resource.address) +
      '</p><p>开放时间：' + esc(resource.opening_hours) + '</p></article>').join('');
    offering.innerHTML = (offerings.length === 1 ? '' : '<option value="">请选择教学班</option>') +
      offerings.map(item => '<option value="' + esc(item.id) + '">' + esc(item.name) + '</option>').join('');
    offering.disabled = offerings.length <= 1;
    byId('offering-note').textContent = offerings.length === 0 ? '暂无有效选课；可选择个人求助或直接联系上方资源。' :
      offerings.length === 1 ? '已自动选择你选课的教学班。' : '请选择与你的问题对应的教学班。';

    function clearErrors() {
      [description, offering].forEach(element => element.removeAttribute('aria-invalid'));
      ['description-error', 'offering-error'].forEach(id => {
        byId(id).textContent = '';
        byId(id).hidden = true;
      });
      byId('help-submit-error').textContent = '';
    }

    function updateKind() {
      const academic = selectedKind() === 'academic';
      byId('offering-field').hidden = !academic;
      offering.required = academic;
      byId('help-route').textContent = academic ?
        '任课教师或助教将在 2 个工作日内联系你。普通可见 standard · P2。' :
        '辅导员将在 1 个工作日内联系你。心理支持受限可见 restricted_psych · P1。';
      clearErrors();
    }
    form.querySelectorAll('input[name="kind"]').forEach(input => input.addEventListener('change', updateKind));
    updateKind();

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearErrors();
      receipt.replaceChildren();
      try {
        const cases = FLC.store.collection('cases');
        const result = makeCase(selectedKind(), user, {
          description: description.value, offering_id: offering.value
        }, cases.list(), FLC.time.now());
        if (!result.ok) {
          const element = result.field === 'description' ? description : offering;
          const error = byId(result.field === 'description' ? 'description-error' : 'offering-error');
          error.textContent = result.message;
          error.hidden = false;
          element.setAttribute('aria-invalid', 'true');
          if (element.disabled) {
            byId('help-submit-error').textContent = result.message;
            form.querySelector('input[value="personal"]').focus();
          } else element.focus();
          return;
        }
        const ticket = result.ticket;
        cases.upsert(ticket);
        const academic = ticket.type === 'academic_help';
        receipt.innerHTML = '<h3>求助已提交</h3><p>工单号：<code>' + esc(ticket.ticket_no) +
          '</code></p><p>' + (academic ? '学业求助' : '个人求助') + ' <code>' + esc(ticket.type) +
          '</code> · 待接手 <code>new</code></p><p>' +
          (academic ? '任课教师或助教将在 2 个工作日内联系你。' : '辅导员将在 1 个工作日内联系你。') +
          '</p><p class="help-note">响应期限为建议值；原型按自然日计算。</p>';
        description.value = '';
      } catch (error) {
        byId('help-submit-error').textContent = '求助未能保存，请保留描述并重试；也可以直接联系上方资源。';
      }
    });
  });
})(window.FLC);
