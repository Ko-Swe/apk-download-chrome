'use strict';

(function() {

  var clearData = function(callback) {
    BrowserStorage.remove(['account', 'sim'], callback);
  };

  var renderSdkList = function(currentSdk) {
    var sltSdk = document.getElementById('slt-android-versions');
    if (sltSdk.hasAttribute('rendered')) {
      return;
    }

    for (var key in Utils.SDK_LIST) {
      var option = document.createElement('option');
      option.value = key;
      option.textContent = Utils.SDK_LIST[key] + ' (SDK ' + key + ')';
      if (currentSdk && currentSdk === key) {
        option.selected = 'selected';
      }

      sltSdk.appendChild(option);
    }
    sltSdk.setAttribute('rendered', 1);
  };

  var renderDeviceList = function(codename) {
    var sltDevice = document.getElementById('slt-android-devices');
    if (sltDevice.hasAttribute('rendered')) {
      sltDevice.dispatchEvent(new Event('change', {'bubbles': true}));
      return;
    }

    var selected = false;
    for (var key in Utils.DEVICE_LIST) {
      var option = document.createElement('option');
      option.value = key;
      option.textContent = Utils.DEVICE_LIST[key] + ' (' + key + ')';
      if (codename && codename === key) {
        option.selected = 'selected';
        selected = true;
      }

      sltDevice.appendChild(option);
    }

    var rowCodename = document.getElementById('row-device-codename');
    var txtCodename = document.getElementById('inp-device-codename');
    var customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom';
    if (!selected) {
      customOption.selected = 'selected';
      txtCodename.value = codename;
    }
    sltDevice.appendChild(customOption);

    sltDevice.addEventListener('change', function(e) {
      var value = e.target.value;
      if (value === 'custom') {
        rowCodename.classList.remove('hidden');
      } else {
        txtCodename.value = value;
        rowCodename.classList.add('hidden');
      }
    });
    sltDevice.setAttribute('rendered', 1);
    sltDevice.dispatchEvent(new Event('change', {'bubbles': true}));
  };

  var initForm = function(items) {
    var txtAuthEmail = document.getElementById('txt-email');
    var txtGsfId = document.getElementById('txt-gsf-id');

    var btnLogout = document.getElementById('btn-logout');
    btnLogout.addEventListener('click', function(e) {
      e.preventDefault();

      if (confirm('Change to another email?')) {
        clearData(function() {
          window.location.reload();
        });
      }
    });

    var btnSave = document.getElementById('btn-save');
    btnSave.addEventListener('click', function(e) {
      e.preventDefault();

      var sdkVersion = document.getElementById('slt-android-versions').value;

      var txtCodename = document.getElementById('inp-device-codename');
      var codename = txtCodename.value.trim();
      if (codename.length === 0) {
        alert('Please enter device codename');
        txtCodename.focus();
        return;
      }

      Utils.getAccountSettings(function(items) {
        if (!items.account) {
          items.account = {};
        }
        items.account.deviceSdk = '' + sdkVersion;
        items.account.deviceCodename = codename;

        Utils.saveAccount(items.account, function() {
          window.location.reload();
        });
      });
    });

    document.getElementById('btn-advanced').addEventListener('click', function(e) {
      e.preventDefault();

      this.style.display = 'none';
      document.querySelector('.section-advanced').classList.remove('hidden');
    });

    Tooltips.setup();

    if (!items.account.deviceCodename) {
      items.account.deviceCodename = Utils.DEFAULT_DEVICE.codename;
    }

    if (!items.account.deviceSdk) {
      items.account.deviceSdk = Utils.DEFAULT_DEVICE.sdk;
    }

    txtAuthEmail.textContent = items.account.email;
    txtGsfId.textContent = items.account.deviceId.toUpperCase();

    renderSdkList('' + items.account.deviceSdk);
    renderDeviceList(items.account.deviceCodename);
  };

  var init = function() {
    Utils.getAccountSettings(function(items) {
      if (!items || !items.account) {
        window.location = 'login.html';
      } else {
        initForm(items);
      }
    });
  };

  init();
})();