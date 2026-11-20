// Forgot password (forgot-password.html): step 1 sends the email (POST /api/auth/forgot-password),
// step 2 sends the code from the email and the new password (POST /api/auth/reset-password).
// The server answers the same way whether the email has an account or not, so the page does too.
(function () {
  'use strict';

  const emailStep = document.querySelector('[data-reset-step="email"]');
  const codeStep = document.querySelector('[data-reset-step="code"]');
  if (!emailStep || !codeStep) return;

  const emailForm = emailStep.querySelector('[data-reset-email-form]');
  const emailError = emailStep.querySelector('[data-reset-error]');
  const sendButton = emailStep.querySelector('[data-reset-send]');
  const form = codeStep.querySelector('[data-reset-form]');
  const status = codeStep.querySelector('[data-reset-status]');
  const saveButton = codeStep.querySelector('[data-reset-save]');
  const resendButton = codeStep.querySelector('[data-reset-resend]');
  const terminalNote = codeStep.querySelector('[data-reset-terminal]');

  const CONNECTION_PROBLEM = "We can't reach the server right now. Please try again.";
  let resendTimer = null;

  function homeFor(user) {
    return user.role === 'admin' ? 'admin.html' : 'account.html';
  }

  // Sends JSON and returns { response, result }, or null when the server can't be reached.
  async function call(url, body) {
    try {
      const response = await fetch(url, {
        method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      return { response: response, result: await response.json() };
    } catch (err) {
      return null;
    }
  }

  // The message under one field of a form.
  function setError(formElement, name, message) {
    const field = formElement.elements[name];
    const text = formElement.querySelector('[data-error-for="' + name + '"]');
    text.textContent = message;
    text.hidden = !message;
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }

  function clearErrors(formElement) {
    formElement.querySelectorAll('[data-error-for]').forEach(function (text) {
      setError(formElement, text.dataset.errorFor, '');
    });
  }

  // Shows the server's messages under their fields. Returns the first wrong field.
  function showFieldErrors(formElement, fields) {
    let first = null;
    Object.keys(fields || {}).forEach(function (name) {
      if (!formElement.elements[name]) return;
      setError(formElement, name, fields[name]);
      if (!first) first = formElement.elements[name];
    });
    return first;
  }

  function showStatus(message, kind) {
    status.textContent = message;
    status.className = 'auth-status' + (kind ? ' auth-status--' + kind : '');
    status.hidden = !message;
  }

  // "Send a new code" waits a minute between two codes. The button counts the seconds down.
  function startResendWait(seconds) {
    clearInterval(resendTimer);
    let left = seconds;
    function draw() {
      resendButton.disabled = left > 0;
      resendButton.textContent = left > 0 ? 'Send a new code (in ' + left + ' s)' : 'Send a new code';
    }
    draw();
    if (left <= 0) return;
    resendTimer = setInterval(function () {
      left -= 1;
      draw();
      if (left <= 0) clearInterval(resendTimer);
    }, 1000);
  }

  // step is the server's answer: { email, sentByEmail, resendIn }.
  function showCodeStep(step) {
    codeStep.querySelector('[data-reset-masked]').textContent = step.email;
    terminalNote.hidden = step.sentByEmail;
    showStatus('');
    form.reset();
    clearErrors(form);
    startResendWait(step.resendIn);
    emailStep.hidden = true;
    codeStep.hidden = false;
    // The address remembers the step, so reloading the page keeps the code form.
    window.history.replaceState(null, '', 'forgot-password.html?step=code');
    form.elements.code.focus();
  }

  function showEmailStep(message) {
    clearInterval(resendTimer);
    codeStep.hidden = true;
    emailStep.hidden = false;
    window.history.replaceState(null, '', 'forgot-password.html');
    emailError.textContent = message || '';
    emailError.hidden = !message;
    if (message) emailError.focus();
    else emailForm.elements.email.focus();
  }

  // ---------- Step 1: the email ----------

  emailForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    emailError.hidden = true;
    clearErrors(emailForm);
    const email = emailForm.elements.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(emailForm, 'email', email ? 'Enter an email address in the format name@example.com.' : 'Enter your email address.');
      emailForm.elements.email.focus();
      return;
    }

    sendButton.disabled = true;
    sendButton.textContent = 'Please wait...';
    const answer = await call('/api/auth/forgot-password', { email: email });
    sendButton.disabled = false;
    sendButton.textContent = 'Send me a code';

    if (!answer) {
      emailError.textContent = CONNECTION_PROBLEM;
      emailError.hidden = false;
      emailError.focus();
      return;
    }
    if (answer.response.ok) {
      showCodeStep(answer.result);
      return;
    }
    const first = showFieldErrors(emailForm, answer.result.fields);
    if (first) {
      first.focus();
      return;
    }
    emailError.textContent = answer.result.error || 'The code could not be sent. Please try again.';
    emailError.hidden = false;
    emailError.focus();
  });

  // ---------- Step 2: the code and the new password ----------

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    showStatus('');
    clearErrors(form);

    // The same checks as the server, so the most common mistakes show at once.
    const code = form.elements.code.value.replace(/\s/g, '');
    const password = form.elements.password.value;
    const wrong = [];
    if (!/^[0-9]{6}$/.test(code)) wrong.push(['code', 'Enter the 6-digit code from the email.']);
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      wrong.push(['password', 'Use at least 8 characters, with a letter and a number.']);
    }
    if (form.elements.confirmPassword.value !== password) {
      wrong.push(['confirmPassword', 'The two passwords do not match.']);
    }
    if (wrong.length > 0) {
      wrong.forEach(function (item) { setError(form, item[0], item[1]); });
      form.elements[wrong[0][0]].focus();
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Please wait...';
    const answer = await call('/api/auth/reset-password', { code: code, password: password });
    saveButton.disabled = false;
    saveButton.textContent = 'Save my new password';

    if (!answer) {
      showStatus(CONNECTION_PROBLEM, 'error');
      status.focus();
      return;
    }
    if (answer.response.ok) {
      // The new password is saved and the user is logged in.
      window.location.href = homeFor(answer.result.user);
      return;
    }
    if (answer.result.restart) {
      showEmailStep(answer.result.error);
      return;
    }
    const first = showFieldErrors(form, answer.result.fields);
    if (first) {
      first.focus();
      return;
    }
    showStatus(answer.result.error || 'The new password could not be saved. Please try again.', 'error');
    status.focus();
  });

  resendButton.addEventListener('click', async function () {
    resendButton.disabled = true;
    const answer = await call('/api/auth/forgot-password/resend', {});
    if (!answer) {
      resendButton.disabled = false;
      showStatus(CONNECTION_PROBLEM, 'error');
      status.focus();
      return;
    }
    if (answer.result.restart) {
      showEmailStep(answer.result.error);
      return;
    }
    if (answer.response.ok) {
      form.elements.code.value = '';
      showStatus(answer.result.message + ' The old code no longer works.', 'success');
      startResendWait(answer.result.resendIn);
      form.elements.code.focus();
      return;
    }
    showStatus(answer.result.error || 'A new code could not be sent. Please try again.', 'error');
    startResendWait(answer.result.resendIn || 0);
    status.focus();
  });

  codeStep.querySelector('[data-reset-restart]').addEventListener('click', function () {
    showEmailStep('');
  });

  // After a reload during step 2, the server still knows the reset.
  async function init() {
    if (new URLSearchParams(window.location.search).get('step') !== 'code') return;
    const answer = await call('/api/auth/forgot-password');
    if (answer && answer.response.ok && answer.result.pending) showCodeStep(answer.result.pending);
    else window.history.replaceState(null, '', 'forgot-password.html');
  }

  init();
})();
