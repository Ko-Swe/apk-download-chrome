'use strict';

var Utils = { // jshint ignore:line
  SDK_LIST: {
    '4':  'Donut 1.6',
    '5':  'Eclair 2.0',
    '6':  'Eclair 2.0.1',
    '7':  'Eclair 2.1',
    '8':  'Froyo 2.2-2.2.3',
    '9':  'Gingerbread 2.3-2.3.2',
    '10': 'Gingerbread 2.3.3-2.3.7',
    '11': 'Honeycomb 3.0',
    '12': 'Honeycomb 3.1',
    '13': 'Honeycomb 3.2',
    '14': 'Ice Cream Sandwich 4.0-4.0.2',
    '15': 'Ice Cream Sandwich 4.0.3-4.0.4',
    '16': 'Jelly Bean 4.1',
    '17': 'Jelly Bean 4.2',
    '18': 'Jelly Bean 4.3',
    '19': 'KitKat 4.4',
    '20': 'KitKat (wearable extensions) 4.4',
    '21': 'Lollipop 5.0',
    '22': 'Lolipop 5.1',
    '23': 'Marshmallow 6.0'
  },

  DEVICE_LIST: {
    'tilapia':      'Asus Nexus 7',
    'enrc2b':       'HTC One X+',
    'blackbay':     'Intel Xolo (x86)',
    'g3':           'LG G3',
    'cosmo':        'LG Google TV',
    'mako':         'LG Nexus 4',
    'hammerhead':   'LG Nexus 5',
    'ghost':        'Motorola Moto X',
    'roth':         'Nvidia Shield',
    'm0':           'Samsung Galaxy S3',
    'ja3g':         'Samsung Galaxy S4',
    'k3g':          'Samsung Galaxy S5',
    'cross77_3776': 'Sony Xperia Fusion',
    'togari':       'Sony Xperia Z'
  },

  DEFAULT_SIM_SETTINGS: {
    country: 'USA',
    operator: 'T-Mobile',
    operatorCode: '31020'
  },

  DEFAULT_DEVICE: {
    sdk: '19',
    codename: 'hammerhead'
  },

  saveAccount: function(data, callback) {
    BrowserStorage.set({
      account: data
    }, callback);
  },

  getAccountSettings: function(callback) {
    BrowserStorage.get(['sim', 'account'], function(items) {
      if (!items) {
        items = {};
      }

      if (!items.sims) {
        Utils.setSimSettings(Utils.DEFAULT_SIM_SETTINGS);
        items.sim = Utils.DEFAULT_SIM_SETTINGS;
      }

      callback.call(null, items);
    });
  },

  setSimSettings: function(sim, callback) {
    BrowserStorage.set({
      sim: sim
    }, callback);
  }
};

var Tooltips = {
  hideCurrentTooltip: function() {
    var curTooltip = document.querySelector('.help-msg:not(.hidden)');
    if (curTooltip) {
      curTooltip.classList.add('hidden');
    }
  },

  setup: function() {
    var helps = document.querySelectorAll('.btn-help');
    for (var i = 0, size = helps.length; i < size; i++) {
      var help = helps[i];
      help.addEventListener('click', function(e) {
        Tooltips.hideCurrentTooltip();
        this.nextElementSibling.classList.toggle('hidden');
      });
    }

    document.addEventListener('mousedown', function(e) {
      var insideTooltip = false;
      var parent = e.target;
      while (parent) {
        if (parent.classList && parent.classList.contains('help-msg')) {
          insideTooltip = true;
          break;
        }
        parent = parent.parentNode;
      }

      if (!insideTooltip) {
        Tooltips.hideCurrentTooltip();
      }
    });

    var tooltips = document.querySelectorAll('.help-msg');
    for (var i = 0, size = tooltips.length; i < size; i++) {
      tooltips[i].addEventListener('mousedown', function(e) {
        if (e.target.nodeName === 'A') {
          e.target.click();
        }
      });
    }
  }
};