'use strict';

/**
 * Protocol-related functions. For a PHP implementation, see
 * http://thomascannon.net/blog/2011/06/downloading-apks-from-android-market/
 *
 * Authors:
 *    redphx <http://codekiem.com/>
 *    Stephan Schmitz <eyecatchup@gmail.com>
 *    Peter Wu <lekensteyn@gmail.com>
 */

/**
 * Serialize Javascript types in a special format used by MarketSession.
 */
var Utils = {
  parseParams: function(url) {
    var params = {};
    url.split('?')[1].split('&').forEach(function(el) {
      el = el.split('=');
      params[el[0]] = el[1];
    });
    return params;
  },

  stringToByteArray: function(str) {
    var b = [];
    for (var pos = 0, size = str.length; pos < size; ++pos) {
      b.push(str.charCodeAt(pos));
    }
    return b;
  },

  serializeInt32: function(num) {
    var data = [];
    for (var times = 0; times < 5; times++) {
      var elm = num % 128;
      if ((num >>>= 7)) { // jshint ignore:line
        elm += 128;
      }
      data.push(elm);
      if (num === 0) {
        break;
      }
    }
    return data;
  },

  serializeData: function(arr, value) {
    var newData = [];
    var dataType = typeof value;
    switch (dataType) {
      case 'string':
        newData = newData.concat(this.serializeInt32(value.length))
                         .concat(this.stringToByteArray(value));
        break;
      case 'number':
        newData = newData.concat(this.serializeInt32(value));
        break;
      case 'boolean':
        newData.push(value ? 1 : 0);
        break;
    }
    return arr.concat(newData);
  },

  formatData: function(def) {
    var data = [];
    for (var i = 0, size = def.length; i < size; i++) {
      var val = def[i];
      if (val instanceof Array) {
        data = data.concat(val);
        continue;
      }

      data = this.serializeData(data, val);
    }

    var arr = [];
    arr = arr.concat(this.serializeInt32(data.length));
    arr = arr.concat(data);
    return arr;
  },

  unpackGzip: function(content) {
    var chars = new Uint8Array(content);
    /* gzipped content, try to unpack */
    return BrowserGzip.uncompress(chars);
  }
};

/* Starts an APK download attempt */
var MarketSession = {
  /**
   * Called when pressing the APK Downloader icon in the location bar.
   */
  download: function(packageName, versionCode, tabId) {
    BrowserStorage.get(['account', 'sim'], function(items) {
      if (!items.account || !items.sim) {
        BrowserTabs.create({
          url: 'options.html'
        });
        return;
      }

      if (!items.account.deviceCodename) {
        items.account.deviceCodename = 'hammerhead';
      }

      if (!items.account.deviceSdk) {
        items.account.deviceSdk = 19;
      }

      var options = {
        authToken: items.account.authToken,
        isSecure: true,
        sdkVersion: 2009011,
        deviceId: items.account.deviceId,
        deviceAndSdkVersion: items.account.deviceCodename + ':' + items.account.deviceSdk,
        locale: 'en',
        country: 'US',
        operatorAlpha: items.sim.operator,
        simOperatorAlpha: items.sim.operator,
        operatorNumeric: '' + items.sim.operatorCode,
        simOperatorNumeric: '' + items.sim.operatorCode,
        packageName: packageName,
        versionCode: versionCode,
        nonce: 123456
      };

      if (!versionCode) {
        MarketSession.getVersionCode(options, function() {
          if (options.versionCode > 0) {
            MarketSession.download(options.packageName, options.versionCode, tabId);
          } else {
            BrowserTabs.sendMessage(tabId, {
              cmd: 'downloadResponse',
              error: -2
            });
          }
        });
        return;
      }

      var assetQueryBase64 = MarketSession.generateAssetRequest('apk', options);

      var API_URL = 'https://android.clients.google.com/market/licensing/LicenseRequest';
      BrowserCookie.set({
          url: API_URL,
          name: 'ANDROIDSECURE',
          value: items.account.authToken,
        }, function() {
          var postData = {
            version: 2,
            request: assetQueryBase64
          };

          BrowserApi.post(postData, function(xhr) {
            if (xhr.status !== 200) {
              BrowserTabs.sendMessage(tabId, {
                cmd: 'downloadResponse',
                error: -1
              });
              return;
            }

            var data = Utils.unpackGzip(xhr.response);
            var appUrl, marketDA;

            var urls = data.match(/https?:\/\/.*?cpn=[_\-\w]{16}/ig);
            if (urls && urls.length > 0) {
              /* not sure if decoding is even necessary */
              appUrl = decodeURIComponent(urls[0]);
              console.log(appUrl);

              /* format: 'MarketDA', 0x72 ('r'), length of data, data */
              if ((marketDA = /MarketDA..(\d+)/.exec(data))) {
                marketDA = marketDA[1];
                var name = packageName + (versionCode ? '-' + versionCode : '');
                var filename = name + '.apk';

                BrowserCookie.set({
                  url: appUrl,
                  name: 'MarketDA',
                  value: marketDA
                }, function() {
                  MarketSession.getRedirectUrl(appUrl, function(redirectUrl) {
                    BrowserCookie.set({
                      url: redirectUrl,
                      name: 'MarketDA',
                      value: marketDA
                    }, function() {
                      BrowserDownloads.download(redirectUrl, filename, 'apk-downloader');
                      MarketSession.downloadObbs(options);
                      BrowserTabs.sendMessage(tabId, {
                        cmd: 'downloadResponse',
                        error: 1
                      });
                    });
                  });
                });
                return;
              }
            } else {
              BrowserTabs.sendMessage(tabId, {
                cmd: 'downloadResponse',
                error: -2
              });
            }
          });
      });
    });
  },

  getRedirectUrl: function(url, callback) {
    var client = new XMLHttpRequest();
    client.open('GET', url);
    client.onreadystatechange = function() {
      if (this.readyState === this.HEADERS_RECEIVED) {
        callback(this.responseURL);
      }
    };
    client.send();
  },

  downloadObbs: function(options) {
    var assetQueryBase64 = MarketSession.generateAssetRequest('obb', options);

    var postData = {
      version: 2,
      request: assetQueryBase64
    };

    BrowserApi.post(postData, function(xhr) {
      var data = Utils.unpackGzip(xhr.response);
      var fileUrls, fileNames;
      var regexFileUrls = /FILE\_URL[0-9]+=([^&]+)/g;
      var regexFileNames = /FILE\_NAME[0-9]+=([^&]+)/g;
      while ((fileUrls = regexFileUrls.exec(data)) !== null) {
        fileNames = regexFileNames.exec(data);
        var saveLocation = 'apk-downloader/' + options.packageName + (options.versionCode ? '-' + options.versionCode : '') + '-obbs';
        BrowserDownloads.download(decodeURIComponent(fileUrls[1]), fileNames[1], saveLocation);
      }
    });
  },

  getVersionCode: function(options, callback) {
    var assetQueryBase64 = MarketSession.generateAssetRequest('info', options);

    var postData = {
      version: 2,
      request: assetQueryBase64
    };

    BrowserApi.post(postData, function(xhr) {
      var data = Utils.unpackGzip(xhr.response);
      var match = data.match(/v2:[\w\.]+:1:([0-9]+)/);

      options.versionCode = match ? parseInt(match[1]) : -1;
      callback && callback();
    });
  },

  /**
   * @returns base64 encoded binary data that can be passed to Google Play API.
   */
  generateAssetRequest: function(type, options) {
    /* describes format of request, numbers will be filled in, arrays of
     * numbers will be appended as-is */

    var requestContextDef = [
      [0x0A], options.authToken,
      [0x10], options.isSecure,
      [0x18], options.sdkVersion,
      [0x22], options.deviceId,
      [0x2A], options.deviceAndSdkVersion,
      [0x32], options.locale,
      [0x3A], options.country,
      [0x42], options.operatorAlpha,
      [0x4A], options.simOperatorAlpha,
      [0x52], options.operatorNumeric,
      [0x5A], options.simOperatorNumeric
    ];

    var protoData = [];
    protoData.push(0x0A);
    protoData = protoData.concat(Utils.formatData(requestContextDef));
    protoData.push(0x13);

    var assetContextDef = [];
    if (type === 'apk') {
      protoData.push(0x52);
      var pkg = options.versionCode ? 'v2:' + options.packageName + ':1:' + options.versionCode : options.packageName;
      assetContextDef = [
        [0x0A], pkg
      ];
    } else if (type === 'obb') {
      protoData.push(0x92, 0x01);
      assetContextDef = [
        [0x0A], options.packageName,
        [0x10], options.versionCode,
        [0x18], options.nonce
      ];
    } else if (type === 'info') {
      protoData.push(0x22);
      assetContextDef = [
        [0x22], options.packageName,
        [0x30, 0x01]
      ];
    }
    protoData = protoData.concat(Utils.formatData(assetContextDef));

    protoData.push(0x14);
    var binary = protoData.map(function (c) {
      return String.fromCharCode(c);
    }).join('');

    var base64 = btoa(binary);
    // makes it url safe
    base64 = base64.replace(/\//g, '_').replace(/\+/g, '-').replace(/\=+$/, '');
    return base64;
  }
};
