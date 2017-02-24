'use strict';

var DOWNLOAD_BUTTON;

var ERROR_MESSAGES = {
  '-1': 'Cannot download this app.\n' +
          'Login session has expired or your email and device ID are incorrect/not activated on Google Play app.',
  '-2': 'Cannot download this app.\n' +
        'You can\'t download apps that aren\'t compatible with your device' +
          ' or not available in your country.\n' +
          'Try to change your device config in the Options page.\n' +
          'If you think this is a mistake, please report it to me via email. Thanks.',
  '-3': 'Sorry, APK Downloader cannot download paid apps (even when you already bought them).'
};

var DownloadButton = function(packageName, isFree) {
  var button;

  var create = function() {
    button = document.createElement('span');
    button.className = 'large play-button download-apk-button';
    button.classList.add(isFree ? 'apps' : 'neutral');
      var btn = document.createElement('button');
      btn.style.cursor = 'pointer';
        var span = document.createElement('span');
        span.appendChild(document.createTextNode('Download APK'));
      btn.appendChild(span);
    button.appendChild(btn);

    if (isFree) {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        if (this.classList.contains('disabled')) {
          return;
        }
        disable();

        var elmLatestVersion = document.querySelector('div.id-review-version-filter div.dropdown-menu-children div:nth-child(2)');
        var versionCode = elmLatestVersion ? elmLatestVersion.getAttribute('data-dropdown-value') : 0;

        var data = {
          packageName: packageName,
          versionCode: versionCode
        };

        BrowserMessage.sendMessage({
          cmd: 'download',
          data: data
        }, function(resp) {});
      });
    } else {
      button.addEventListener('click', function(e) {
        alert(ERROR_MESSAGES['-3']);
      });
    }
  };

  var get = function() {
    return button;
  };

  var enable = function() {
    if (button) {
      button.textContent = 'Download APK';
      button.classList.remove('disabled');
    }
  };

  var disable = function() {
    if (button) {
      button.textContent = 'Downloading...';
      button.classList.add('disabled');
    }
  };

  create();

  return {
    get: get,
    enable: enable,
    disable: disable
  };
};

var addDownloadButton = function(container, packageName, isFree) {
  DOWNLOAD_BUTTON = new DownloadButton(packageName, isFree);
  container.appendChild(DOWNLOAD_BUTTON.get());
};

var findInstallButton = function(node) {
  if (document.querySelector('.download-apk-button')) {
    return;
  }

  if (!node) {
    return false;
  }

  var buttonContainer = node.querySelector('span.buy-button-container.apps');
  if (!buttonContainer) {
    return false;
  }

  var metaPrice = buttonContainer.querySelector('meta[itemprop="price"]');
  var isFree = (metaPrice && metaPrice.getAttribute('content') === '0');

  var packageName = buttonContainer.getAttribute('data-docid');
  addDownloadButton(buttonContainer.parentNode, packageName, isFree);
};

var observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.addedNodes.length === 0) {
      return;
    }
    for (var i = 0, size = mutation.addedNodes.length; i < size; i++) {
      var node = mutation.addedNodes[i];
      // find reviews section
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'DIV' && node.classList && node.hasAttribute('data-docid')) {
        var classList = node.classList;
        if (classList.contains('details-wrapper') && classList.contains('apps') && !classList.contains('square-cover')) {
          findInstallButton(document.querySelector('div.details-actions'));
          break;
        }
      }
    }
  });
});

BrowserMessage.addMessageListener(function(message, sender, sendResponse) {
  if (message.cmd === 'downloadResponse') {
    DOWNLOAD_BUTTON.enable();
    if (message.error < 0) {
      alert(ERROR_MESSAGES[message.error.toString()]);
    }
  }
});

observer.observe(document.getElementById('wrapper'), {
  attributes: false,
  childList: true,
  characterData: false,
  subtree: true
});
findInstallButton(document.querySelector('div.details-actions'));