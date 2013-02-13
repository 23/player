/* 
  MODULE: VAST 
  A wrapper for Google's IMA HTML5 SDK, with a flavour 
  for using Eingebaut for video playback rather than a 
  straight <video> element.

  We use Google's library to increase the likelyhood of
  general support by advertising servers. The library 
  also support a few ad technologies other than VAST.
  Also, it means that we won't need to worry about 
  event tracking and analytics. Google really ought to
  do advertising well ;-)

  This module is used both to handle VAST 2.0 in players.

  This module caries a performance penalty as we need
  to load dependencies from Google to display. For that 
  reason the underlying libraries are only loaded when 
  needed. 

  To add VAST content to the player:

    Player.set('vastURL', '...');

  Due to the performance implications of loading the module, 
  the code is designed to be pretty stand-alone. The module 
  will show and hide content, pause and play it and so forth
  without requiring much other code. The only exception is 
  that `analytics` listens for events and reports 23 Video-
  specific tracking events back.

  Listen for:
  - player:vast:video:start
  - player:vast:video:complete
  - player:vast:video:click
  - player:vast:video:close
  - player:vast:overlay:start
  - player:vast:overlay:complete
  - player:vast:overlay:click

  Answers properties:
  - vastURL [set]
  - closeIdentity [set]
  - vastActive [set]
  - vastAdPosition [get]

  ****

  IMMEDIATE TODO:
  - Bootstrap using settings
  - State control for play begin/end with pre and postroll. 
    This should also use the same ads for all videos.
  - Show postroll text as overlay.
  - return `vastAdPosition` correctly

  GENERAL TODO:
  - Support and test general overlays.
  - Support for Flash playback using Eingebaut.js rather than <video>.
  - Handle multiple simutaneous ad managers
*/

Player.provide('vast', 
  {
    active:false,
    urls:[]
  }, 
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);
      
      // Load Google IMA HTML5 SDK
      $this.adsLoader = null;
      $this.playable = false;
      window._onVASTLoaded = function(){
          $this.adsLoader = new google.ima.AdsLoader();
          $this.adsLoader.addEventListener(google.ima.AdsLoadedEvent.Type.ADS_LOADED, $this.onAdsLoaded, false);
          $this.adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, $this.onAdError, false);
          $this.syncUrls();
          $this.render();
      }
      $this.loadSDK = function(){
          if(!$this.active || $this.adsLoader) return;
          
          // This loads IMA through Google's JS API. It uses the auto-load feature 
          // and locks the browser while doing so with $.ajax having async:false.
          // Is specifies _onVASTLoaded() as a callback once loaded.
          $.ajax({
              url: 'https://www.google.com/jsapi?autoload=%7B%22modules%22%3A%5B%7B%22name%22%3A%22ima%22%2C%22version%22%3A%221%22%2C%22callback%22%3A%22_onVASTLoaded%22%7D%5D%7D',
              dataType: "script",
              async:false
          });
      };
      // Sync the IMA library ($this.adsLoader) with URLs ($this.urls)
      $this.syncUrls = function(){
          if(!$this.adsLoader) {
              $this.loadSDK();
          } else {
              $.each($this.urls, function(i,o){
                  if(!o.loaded) {
                      $this.adsLoader.requestAds({adTagUrl:o.url, adType:'video'});
                      $this.urls[i].loaded = true;
                  }
              });
          }
      }

      // Events to interact with the ad manager
      $this.currentAdsManager = null;
      $this.onAdsLoaded = function(loaded){
          if($this.currentAdsManager) $this.destroyAd();

          // Get the ads manager
          $this.currentAdsManager = loaded.getAdsManager();
          $this.currentAdsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, $this.onAdError);

          // Listen and respond to events which require you to pause/resume content
          $this.currentAdsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, function(){
              // Pause the real video and show the vast container
              Player.set('playing', false);
              $this.container.show();
              $('#player').hide();
              // Notify about the ad being displayed
              Player.fire('player:vast:'+$this.currentAdsManager.getType()+':start');
          });
          $this.currentAdsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, function(){
              // Start the real video again along with the relevant interface stuff
              $this.container.hide();
              $('#player').show();
              Player.set('playing', true);
              // Notify about the ad being displayed
              Player.fire('player:vast:'+$this.currentAdsManager.getType()+':complete');
          });
          $this.currentAdsManager.addEventListener(google.ima.AdEvent.Type.CLICK, function(){
              Player.fire('player:vast:'+$this.currentAdsManager.getType()+':click');
              $this.destroyAd(false);
          });
          $this.currentAdsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, function(){$this.destroyAd(true);});

          // Set a visual element on which clicks should be tracked for video ads
          $this.currentAdsManager.setClickTrackingElement($this.container.find('.vast-click-container')[0]);
          $this.playable = true;
      }
      $this.onAdError = function(error){
          console.log('Google IMA error', error);
          $this.destroyAd(true);
      }
      $this.destroyAd = function(playVideo){
          if(typeof(playVideo)=='undefined') playVideo = true;
          try {
              $this.currentAdsManager.unload();
          } catch(e){};
          $this.currentAdsManager = null;
          Player.set('playing', playVideo);
      }
      
      // Merge in player settings and update the display if needed
      Player.bind('player:settings', function(){
          if($this.active) $this.render();
      });
      // Play advertising on play, if any
      Player.bind('player:video:play', function(){
          if($this.active&&$this.playable) {
              Player.set('playing', false);
              $this.playable = false;
              $this.currentAdsManager.play($this.container.find('.vast-video')[0]);
          }
      });

      // Receive VAST information
      Player.setter('vastURL', function(url){
          $this.active = true;
          $this.urls.push({url:url, loaded:false});
          $this.syncUrls();
      });

      // Expose properties
      Player.getter('vastActive', function(){
          return $this.active;
      });
      Player.getter('vastAdPosition', function(){
          return 'preroll';
      });

      
      return $this;
  }
);
