// Login page, step 2: the 6-digit code that the server emails after the password (or Google)
// was accepted. It uses POST /api/auth/verify-code, POST /api/auth/resend-code and
// GET /api/auth/pending-code. The server counts the wrong codes and decides when a code expires.
(function () {
  'use strict';

  const passwordStep = document.querySelector('[data-login-step="password"]');
  const codeStep = document.querySelector('[data-login-step="code"]');
  if (!passwordStep || !codeStep) return;

  const q = function (sel) { return codeStep.querySelector(sel); };
  const emailText = q('[data-code-email]');
  const terminalNote = q('[data-code-terminal]');
  const status = q('[data-code-status]');
  const form = q('[data-code-form]');
  const input = form.elements.code;
  const inputError = document.getElementById('login-code-error');
  const submit = q('[data-code-submit]');
  const resendButton = q('[data-code-resend]');
  const restartButton = q('[data-code-restart]');
  const loginError = passwordStep.querySelector('[data-auth-error]');
  const loginSuccess = passwordStep.querySelector('[data-auth-success]');

  // Why "Continue with Google" sent the browser back here (login.html?google=reason).
  const GOOGLE_PROBLEMS = {
    'not-set-up': "Google sign-in isn't set up on this server yet. Log in with your email and password.",
    'cancelled': 'You left the Google page before finishing. Try again, or use your email and password.',
    'unverified': "Google hasn't verified that email address, so it can't be used to log in here.",
    'code-not-sent': "Google accepted your account, but we couldn't email your code. Please try again in a moment.",
    'failed': "The Google sign-in didn't finish. Please try again."
  };

  let resendTimer = null;

  function homeFor(user) {
    return user.role === 'admin' ? 'admin.html' : 'account.html';
  }

  function showStatus(message, kind) {
    status.textContent = message;
    status.className = 'auth-status auth-status--' + kind;
    status.hidden = false;
  }

  function setInputError(message) {
    inputError.textContent = message;
    inputError.hidden = !message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
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
    emailText.textContent = step.email;
    terminalNote.hidden = step.sentByEmail;
    status.hidden = true;
    setInputError('');
    form.reset();
    startResendWait(step.resendIn);
    passwordStep.hidden = true;
    codeStep.hidden = false;
    // The address remembers the step, so reloading the page keeps the code form.
    window.history.replaceState(null, '', 'login.html?step=code');
    input.focus();
  }

  function showPasswordStep(message) {
    clearInterval(resendTimer);
    codeStep.hidden = true;
    passwordStep.hidden = false;
    loginSuccess.hidden = true;
    window.history.replaceState(null, '', 'login.html');
    if (message) {
      loginError.textContent = message;
      loginError.hidden = false;
      loginError.focus();
    } else {
      loginError.hidden = true;
      document.getElementById('login-email').focus();
    }
  }

  // Sends a request and returns { response, result }, or null when the server can't be reached.
  async function call(url, body) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
      });
      return { response: response, result: await response.json() };
    } catch (err) {
      return null;
    }
  }

  const CONNECTION_PROBLEM = "We can't reach the server right now. Please try again.";

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    status.hidden = true;

    const code = input.value.replace(/\s/g, '');
    if (!/^[0-9]{6}$/.test(code)) {
      setInputError('Enter the 6-digit code from the email.');
      input.focus();
      return;
    }
    setInputError('');

    submit.disabled = true;
    submit.textContent = 'Please wait...';
    const answer = await call('/api/auth/verify-code', { code: code });
    submit.disabled = false;
    submit.textContent = 'Confirm and log in';

    if (!answer) {
      showStatus(CONNECTION_PROBLEM, 'error');
      status.focus();
      return;
    }
    if (answer.response.ok) {
      window.location.href = homeFor(answer.result.user);
      return;
    }
    // Too many wrong codes, or the login was started too long ago: back to step 1.
    if (answer.result.restart) {
      showPasswordStep(answer.result.error);
      return;
    }
    if (answer.result.fields && answer.result.fields.code) {
      setInputError(answer.result.fields.code);
      input.select();
      input.focus();
      return;
    }
    showStatus(answer.result.error || 'The code could not be checked. Please try again.', 'error');
    status.focus();
  });

  input.addEventListener('input', function () {
    if (input.getAttribute('aria-invalid') === 'true') setInputError('');
  });

  resendButton.addEventListener('click', async function () {
    resendButton.disabled = true;
    const answer = await call('/api/auth/resend-code');
    if (!answer) {
      resendButton.disabled = false;
      showStatus(CONNECTION_PROBLEM, 'error');
      status.focus();
      return;
    }
    if (answer.result.restart) {
      showPasswordStep(answer.result.error);
      return;
    }
    if (answer.response.ok) {
      setInputError('');
      form.reset();
      showStatus(answer.result.message + ' The old code no longer works.', 'success');
      startResendWait(answer.result.resendIn);
      input.focus();
      return;
    }
    showStatus(answer.result.error || 'A new code could not be sent. Please try again.', 'error');
    startResendWait(answer.result.resendIn || 0);
    status.focus();
  });

  // "Use a different account": ends the unfinished login on the server too.
  restartButton.addEventListener('click', async function () {
    await call('/api/auth/logout');
    showPasswordStep('');
  });

  // The password was accepted (js/auth.js sends this event with the server's answer).
  document.addEventListener('easytrip:code-step', function (event) {
    showCodeStep(event.detail);
  });

  // When the page opens: a message from the Google sign-in, or a login that waits for its code
  // (Google sent the browser back, or the page was reloaded during step 2).
  async function init() {
    const params = new URLSearchParams(window.location.search);
    const googleProblem = GOOGLE_PROBLEMS[params.get('google')];
    if (googleProblem) {
      showPasswordStep(googleProblem);
      return;
    }
    if (params.get('step') !== 'code') return;
    try {
      const response = await fetch('/api/auth/pending-code');
      const result = await response.json();
      if (result.pending) showCodeStep(result.pending);
      else window.history.replaceState(null, '', 'login.html');
    } catch (err) {
      // No server: the password form stays, and explains the problem when it is sent.
    }
  }

  init();
})();
