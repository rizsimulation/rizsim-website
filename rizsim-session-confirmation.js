/* RizSim session confirmation: presentation only. Original callers own all RPCs. */
(function () {
  'use strict';
  let pending = false;
  function snapshot() {
    try { return window.RizSimFacultyBridge?.getSnapshot() || null; }
    catch (_) { return null; }
  }
  function allowed(sessionId, course) {
    const s = snapshot();
    if (!s || !(course ? ['course_lead'] : ['faculty', 'course_lead', 'owner']).includes(s.role)) return null;
    return (s.sessions || []).find(item => String(item.session_id) === String(sessionId) && item.active === true) || null;
  }
  async function ask(sessionId, course = false) {
    const session = allowed(sessionId, course);
    if (!session || pending) return false;
    const warning = 'Student access will stop immediately. The session, student progress and submitted responses will remain preserved.';
    if (typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) {
      return window.confirm('End session: ' + (session.class_name || 'Classroom session') + '?\n\n' + warning);
    }
    pending = true;
    const previous = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.id = 'rzEndSessionDialog';
    dialog.className = 'rz-session-confirm';
    dialog.setAttribute('aria-labelledby', 'rzEndSessionHeading');
    dialog.setAttribute('aria-describedby', 'rzEndSessionDescription');
    const title = document.createElement('h2'); title.id = 'rzEndSessionHeading'; title.textContent = 'End this session?';
    const name = document.createElement('p'); name.className = 'rz-session-confirm-name'; name.textContent = session.class_name || 'Classroom session';
    const description = document.createElement('p'); description.id = 'rzEndSessionDescription'; description.textContent = warning;
    const actions = document.createElement('div'); actions.className = 'rz-session-confirm-actions';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Keep Session Open'; cancel.id = 'rzEndSessionCancel';
    const accept = document.createElement('button'); accept.type = 'button'; accept.textContent = 'End Session'; accept.id = 'rzEndSessionConfirm'; accept.className = 'rz-session-confirm-danger';
    actions.append(cancel, accept); dialog.append(title, name, description, actions); document.body.append(dialog);
    return new Promise(resolve => {
      let settled = false;
      const finish = value => {
        if (settled) return;
        settled = true;
        accept.disabled = true;
        const confirmed = value === true && !!allowed(sessionId, course);
        if (dialog.open) dialog.close();
        dialog.remove(); pending = false;
        if (previous?.isConnected) previous.focus({preventScroll: true});
        resolve(confirmed);
      };
      cancel.addEventListener('click', () => finish(false));
      accept.addEventListener('click', () => finish(true));
      dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
      dialog.addEventListener('close', () => finish(false));
      try { dialog.showModal(); cancel.focus({preventScroll: true}); }
      catch (_) { finish(false); }
    });
  }
  window.RizSimSessionConfirmation = Object.freeze({ask});
})();
