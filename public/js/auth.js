// Login and register forms: checks each field in the browser, then sends the form to the server.
// The server checks everything again (server/validators/auth.js).
(function () {
  'use strict';

  const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Where each role goes after logging in.
  function homeFor(user) {
    return user.role === 'admin' ? 'admin.html' : 'account.html';
  }

  function connectionProblem() {
    if (window.location.protocol === 'file:') {
      return 'Logging in needs the server. Run npm start, then open http://localhost:3000.';
    }
    return "We can't reach the server right now. Please try again.";
  }

  function initForm(form) {
    const type = form.dataset.authForm;
    const submit = form.querySelector('[type="submit"]');
    const errorBox = document.querySelector('[data-auth-error]');
    const fields = {};
    form.querySelectorAll('[data-field]').forEach(function (input) {
      fields[input.dataset.field] = input;
    });
    form.noValidate = true;

    // Passwords are not trimmed, because a space can be part of a password.
    function valueOf(name) {
      const value = fields[name].value;
      return name === 'password' || name === 'confirmPassword' ? value : value.trim();
    }

    const rules = {
      firstName: function (value) {
        return value ? '' : 'Enter your first name.';
      },
      lastName: function (value) {
        return value ? '' : 'Enter your last name.';
      },
      email: function (value) {
        if (!value) return 'Enter your email address.';
        return EMAIL_FORMAT.test(value) ? '' : 'Enter an email address in the format name@example.com.';
      },
      password: function (value) {
        if (!value) return type === 'login' ? 'Enter your password.' : 'Enter a password.';
        if (type === 'login') return '';
        if (value.length < 8 || !/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
          return 'Use at least 8 characters, with a letter and a number.';
        }
        return '';
      },
      confirmPassword: function (value) {
        if (!value) return 'Enter your password again.';
        return value === valueOf('password') ? '' : 'The two passwords do not match.';
      }
    };

    function setError(name, message) {
      const input = fields[name];
      const error = document.getElementById(input.id + '-error');
      error.textContent = message;
      error.hidden = !message;
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }

    function validate(name) {
      const message = rules[name](valueOf(name));
      setError(name, message);
      return message;
    }

    function showError(message) {
      errorBox.textContent = message;
      errorBox.hidden = false;
      errorBox.focus();
    }

    // The error under a field appears when leaving it, and goes away while it is being fixed.
    Object.keys(fields).forEach(function (name) {
      const input = fields[name];
      input.addEventListener('input', function () {
        input.dataset.edited = 'true';
        if (input.getAttribute('aria-invalid') === 'true') validate(name);
      });
      input.addEventListener('blur', function () {
        if (input.dataset.edited) validate(name);
      });
    });

    function dataToSend() {
      if (type === 'login') {
        return { email: valueOf('email'), password: valueOf('password') };
      }
      return {
        firstName: valueOf('firstName'),
        lastName: valueOf('lastName'),
        email: valueOf('email'),
        password: valueOf('password')
      };
    }

    function setBusy(busy) {
      submit.disabled = busy;
      submit.textContent = busy ? 'Please wait...' : submit.dataset.label;
    }
    submit.dataset.label = submit.textContent;

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      errorBox.hidden = true;

      const wrong = Object.keys(fields).filter(function (name) { return validate(name); });
      if (wrong.length > 0) {
        fields[wrong[0]].focus();
        return;
      }

      setBusy(true);
      let response;
      let result;
      try {
        response = await fetch('/api/auth/' + type, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend())
        });
        result = await response.json();
      } catch (err) {
        setBusy(false);
        showError(connectionProblem());
        return;
      }

      if (response.ok) {
        window.location.href = type === 'login' ? homeFor(result.user) : 'login.html?registered=1';
        return;
      }

      setBusy(false);
      if (result.fields) {
        const serverWrong = Object.keys(result.fields).filter(function (name) { return fields[name]; });
        serverWrong.forEach(function (name) { setError(name, result.fields[name]); });
        if (serverWrong.length > 0) {
          fields[serverWrong[0]].focus();
          return;
        }
      }
      showError(result.error);
      if (type === 'login') {
        fields.password.value = '';
      }
    });
  }

  // Someone who is already logged in doesn't need these forms.
  async function goHomeIfLoggedIn() {
    if (window.location.protocol === 'file:') return;
    try {
      const response = await fetch('/api/auth/me');
      const result = await response.json();
      if (result.user) window.location.replace(homeFor(result.user));
    } catch (err) {
      // No server: stay on the page. The form explains the problem when it is sent.
    }
  }

  function init() {
    const form = document.querySelector('[data-auth-form]');
    if (!form) return;
    initForm(form);
    goHomeIfLoggedIn();

    const success = document.querySelector('[data-auth-success]');
    if (success && new URLSearchParams(window.location.search).get('registered')) {
      success.hidden = false;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
