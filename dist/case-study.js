(() => {
  const triggers = [...document.querySelectorAll('[data-case-study-url]')];
  if (!triggers.length || typeof HTMLDialogElement === 'undefined') return;

  const dialog = document.createElement('dialog');
  dialog.className = 'case-study-dialog';
  dialog.setAttribute('aria-labelledby', 'case-study-dialog-title');
  dialog.innerHTML = `
    <div class="case-study-dialog-inner">
      <div class="case-study-dialog-top">
        <div>
          <p class="case-study-eyebrow">Case study access</p>
          <h2 id="case-study-dialog-title">Enter your email to continue</h2>
        </div>
        <button class="case-study-dialog-close" type="button" aria-label="Close">×</button>
      </div>
      <p class="case-study-dialog-copy">Share your work email to open <strong data-case-study-name></strong>.</p>
      <form class="case-study-form">
        <label for="case-study-email">Work email</label>
        <input id="case-study-email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="254" required>
        <p class="case-study-privacy">Demo only — this email is validated in your browser and is not submitted or stored.</p>
        <button class="case-study-download case-study-submit" type="submit">Open case study <span aria-hidden="true">→</span></button>
      </form>
    </div>`;
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const email = dialog.querySelector('[name="email"]');
  const name = dialog.querySelector('[data-case-study-name]');
  const close = dialog.querySelector('.case-study-dialog-close');
  let activeTrigger = null;

  const closeDialog = () => dialog.close();

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      activeTrigger = trigger;
      name.textContent = trigger.dataset.caseStudyTitle || 'the case study';
      form.reset();
      dialog.showModal();
      document.body.classList.add('case-study-modal-open');
      window.setTimeout(() => email.focus(), 0);
    });
  });

  close.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('case-study-modal-open');
    activeTrigger?.focus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!activeTrigger || !form.reportValidity()) return;
    const pdfUrl = activeTrigger.dataset.caseStudyUrl;
    dialog.close();
    window.location.assign(pdfUrl);
  });
})();
