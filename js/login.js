'use strict';

(function() {
  /**
   * ClientLogin errors, taken from
   * https://developers.google.com/accounts/docs/AuthForInstalledApps
   */
  var clientLoginErrors = {
    'BadAuthentication': 'Incorrect username or password.\nIf you entered correct email and password, please read the tooltip to know how to enable "Access for less secure apps".',
    'NotVerified': 'The account email address has not been verified. You need to access your Google account directly to resolve the issue before logging in here.',
    'TermsNotAgreed': 'You have not yet agreed to Google\'s terms, acccess your Google account directly to resolve the issue before logging in using here.',
    'CaptchaRequired': 'A CAPTCHA is required. (not supported, try logging in another tab)',
    'Unknown': 'Unknown or unspecified error; the request contained invalid input or was malformed.',
    'AccountDeleted': 'The user account has been deleted.',
    'AccountDisabled': 'The user account has been disabled.',
    'ServiceDisabled': 'Your access to the specified service has been disabled. (The user account may still be valid.)',
    'ServiceUnavailable': 'The service is not available; try again later.'
  };

  var login = function(email, password, deviceId) {
    var ACCOUNT_TYPE_HOSTED_OR_GOOGLE = 'HOSTED_OR_GOOGLE';
    var URL_LOGIN = 'https://android.clients.google.com/auth';
    var LOGIN_SERVICE = 'androidsecure';

    var params = {
      'Email': email,
      'Passwd': password,
      'service': LOGIN_SERVICE,
      'accountType': ACCOUNT_TYPE_HOSTED_OR_GOOGLE
    };

    var xhr = new XMLHttpRequest();
    xhr.open('POST', URL_LOGIN, true);

    var paramsStr = '';
    for (var key in params) {
      paramsStr += '&' + key + '=' + encodeURIComponent(params[key]);
    }

    xhr.onload = function() {
      var AUTH_TOKEN = '';
      var response = xhr.responseText;

      var error = response.match(/Error=(\w+)/);
      if (error) {
        var msg = clientLoginErrors[error[1]] || error[1];
        alert('ERROR: authentication failed.\n' + msg);
        return;
      }

      var match = response.match(/Auth=([a-z0-9=_\-\.]+)/i);
      if (match) {
        AUTH_TOKEN = match[1];
      }

      if (!AUTH_TOKEN) {
        // should never happen...
        alert('ERROR: Authentication token not available, cannot login.');
        return;
      }

      Utils.saveAccount({
        email: email,
        authToken: AUTH_TOKEN,
        deviceId: deviceId,
        deviceSdk: Utils.DEFAULT_DEVICE.sdk,
        deviceCodename: Utils.DEFAULT_DEVICE.codename
      }, function() {
        window.location = 'options.html';
      });
    };

    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.send(paramsStr);
  };

  var initForm = function() {
    var inpEmail = document.getElementById('inp-email');
    inpEmail.focus();
    inpEmail.addEventListener('blur', function(e) {
      var email = inpEmail.value;
      if (email.length > 0 && email.indexOf('@') === -1) {
        inpEmail.value = email + '@gmail.com';
      }
    });
    var inpPassword = document.getElementById('inp-password');
    var inpDeviceId = document.getElementById('inp-gsf-id');

    var btnLogin = document.getElementById('btn-login');
    btnLogin.addEventListener('click', function(e) {
      e.preventDefault();

      var email = inpEmail.value;
      var password = inpPassword.value;
      var deviceId = inpDeviceId.value;

      var match = /^(([^<>()[\]\\.,;:\s@\']+(\.[^<>()[\]\\.,;:\s@\']+)*)|(\'.+\'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.exec(email);
      if (!match) {
        alert('ERROR: Please enter a valid email!');
        inpEmail.focus();
        return;
      }

      if (password.length === 0) {
        alert('ERROR: Please enter a password!');
        inpPassword.focus();
        return;
      }

      if (!/^[0-9a-f]{16}$/i.test(deviceId)) {
        alert('ERROR: Android Device ID must be 16 characters long and only contains characters from 0-9, A-F');
        inpDeviceId.focus();
        return;
      }

      login(email, password, deviceId);
    });

    Tooltips.setup();
  };

  var init = function() {
    Utils.getAccountSettings(function(items) {
      if (items.account) {
        window.location = 'options.html';
      } else {
        initForm();
      }
    });
  };

  init();
})();