/*
  INTEGRATION: CONSENT STATUS
  Handle cookie consent status for players.

  PLEASE NOTE: This module will be overwritten by a
  server-side hosted version to allow for consistent
  updates.

  Answers properties:
  - consentStatus [set/get]
*/

Player.provide('consent-status', {}, function (Player, $, opts) {
  var $this = this;
  $.extend($this, opts);
  delete $this.container;

  Player.getter('consentStatus', function () {
    return ConsentStatus.get();
  });
  Player.setter('consentStatus', function (cs) {
    ConsentStatus.set(cs);
  });

  return $this;
});

// Consent management
var ConsentStatus = {
  key: 'player_consent_status',
  hasDefaultConsent: function () {
    return !!window.DEFAULT_CONSENT_MODE && window.DEFAULT_CONSENT_MODE === 'given'
  },
  hasConsent: function () {
    return ConsentStatus.get() ? ConsentStatus.get(ConsentStatus.key) === 'given' : ConsentStatus.hasDefaultConsent()
  },
  get: function () {
    return LocalStorage.get(ConsentStatus.key)
  },
  set: function (consent) {
    if (consent !== 'given') {
      consent = 'denied';
    }

    LocalStorage.set(ConsentStatus.key, consent);

    if (consent === 'denied') {
      Persist.erase('uuid');
      Persist.erase('session_referer');
      Persist.erase('_visual_swf_referer');
      if (typeof (aud) === 'function') {
        aud('clear');
      }
    }

    if (consent === 'given') {
      var uuid = Player.get('uuid');
      if (!!uuid) {
        Persist.set('uuid', uuid, 120);
      }
    }

    // Only reload the page if consent has been changed
    if (consent !== ConsentStatus.get()) {
      location.reload()
    }
  }
}
