/* 
  MODULE: PLAYFLOW 

  Fires for:
  - player:playflow:video:start
  - player:playflow:video:complete
  - player:playflow:video:click
  - player:playflow:video:close
  - player:playflow:overlay:start
  - player:playflow:overlay:complete
  - player:playflow:overlay:click

  Answers properties:
  - closeIdentity [set]
  - playflowActive [get]
  - playflowState [get]
  - playflowBeforeDownloadType [get]
  - playflowBeforeDownloadURL [get]
  - playflowBeforeLink [get]
  - playflowAfterDownloadType [get]
  - playflowAfterDownloadURL [get]
  - playflowAfterLink [get]
  - playflowAfterText [get]
  - identityCountdown [get]
  - identityAllowClose [get]
  - playflowAdPosition [get]
  - identityCountdownText [get]
*/

Player.provide('playflow', 
  {
    identityCountdown: false,
    identityAllowClose: true,
    identityCountdownTextSingular: "This advertisement will end in % second",
    identityCountdownTextPlural: "This advertisement will end in % seconds"
  }, 
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);
      $this.playflowState = 'before'; // before, preroll, during, postroll, aftertext, ended
      $this.playflowClip = '';
      $this.playflowLink = '';

      // Merge in player settings and update the display if needed
      Player.bind('player:settings', function(){
          PlayerUtilities.mergeSettings($this, ['identityCountdown', 'identityAllowClose', 'identityCountdownTextSingular', 'identityCountdownTextPlural']);
      });

      // Create containers
      $this.clicks = $(document.createElement('div')).addClass('playflow-click-container');
      $this.container.append($this.clicks);
      $this.clicks.click(function(){
        // Handle clicks on Playflow video
        if($this.playflowLink.length>0) {
          $this.endClip();
          Player.fire('player:playflow:video:click');
          window.open($this.playflowLink);
        }
      });
      $this.content = $(document.createElement('div')).addClass('playflow-content');
      $this.container.append($this.content);



      // Play either preroll or postroll clips
      $this.beginClip = function(){
        if($this.playflowClip.length==0) return;
        $this.stealEingebaut();
        $this.eingebaut.setSource($this.playflowClip);
        $this.eingebaut.setPlaying(true);
        Player.fire('player:playflow:video:start');
        $($this.container).show();
        $($this.clicks).show();
        $this.updateCountdown();
      }
      // Finalize playback of either a preroll or a postroll
      $this.endClip = function(){
        $($this.container).hide();
        $($this.clicks).hide();
        if($this.eingebaut) $this.eingebaut.setPlaying(false);
        $this.restoreEingebaut();

        if($this.playflowState=='before'||$this.playflowState=='preroll') {
          $this.playflowState = 'during'
          Player.set('playing', true);
        } else if($this.playflowState=='during'||$this.playflowState=='postroll') {
          $this.beginAfterText();
        }
        $this.updateCountdown();
      }
      // Update the countdown display, if applicable
      $this.updateCountdown = function(){
        if($this.playflowState=='preroll'||$this.playflowState=='postroll') {
          $this.render(function(){}, 'playflow/playflow-countdown.liquid', $this.content);
        } else if($this.playflowState!='aftertext') {
          $this.content.html('');
        }
      }
      // Show the Playflow after text
      $this.beginAfterText = function(){
          $this.playflowState = 'aftertext';
          if(Player.get('playflowAfterText').length>0) {
              $($this.container).show();
              Player.fire('player:playflow:overlay:start');
              $this.render(function(){
                // fire a click event when someone clicks an <a> element in the playflow after text
                $this.content.find('table a').click(function(){
                  Player.fire('player:playflow:overlay:click');
                });
              }, 'playflow/playflow-after-text.liquid', $this.content);
          } else {
              $this.endAfterText();
          }
      }
      // Finalize the Playflow after text
      $this.endAfterText = function(){
          $($this.container).hide();
          Player.fire('player:playflow:overlay:complete');
          $this.content.html('');
          $this.playflowState = 'ended';
      }
    
      // Logic to load the display device with Eingebaut
      $this.eingebaut = null;
      $this.originalEingebaut = {
        callback: null,
        source: null
      }
      $this.playflowEingebautCallback = function(e){
        // Error if no display device is available
        if(e=='loaded'&&$this.eingebaut.displayDevice=='none') {
          $this.cancelPlayflow();
        }
        // If this loads after the content (i.e. if we're switching display device, fire an event that we're ready)
        if(e=='ready') {
          $this.beginClip();
        } else if(e=='ended' || (e=='pause'&&!$this.eingebaut.allowHiddenControls())) {
          Player.fire('player:playflow:video:complete');
          $this.endClip();
        } else if(e=='progress'||e=='timeupdate') {
          $this.updateCountdown();
        }
      };
      // This method takes over the `video-display` version of eingebaut and uses it for video playback
      // It also overwrites with its own callback function, makes sure that other elements do not receive
      // any callbacks while playflow is in progress.
      $this.stealEingebaut = function(){
        if(!$this.eingebaut) {
          $this.eingebaut = Player.get('videoElement');
          $this.originalEingebaut.callback = $this.eingebaut.callback;
        }
        $this.originalEingebaut.source = $this.eingebaut.getSource();
        $this.eingebaut.callback = $this.playflowEingebautCallback;        
        $this.eingebaut.container.parent().css({zIndex:200});
      };
      // Restore the eingebaut object from `video-display` back to it original state.
      $this.restoreEingebaut = function(){
        $this.eingebaut.callback = $this.originalEingebaut.callback;        
        $this.eingebaut.container.parent().css({zIndex:''});
        Player.fire('player:video:pause');
        if($this.originalEingebaut.source) $this.eingebaut.setSource($this.originalEingebaut.source);
      }


      // Initiate the playback of a preroll/postroll if defined for this clip
      $this.initiateClip = function(type) {
          $this.playflowClip = '';
          $this.playflowLink = '';
          var playflow_type = Player.get(type=='preroll' ? 'playflowBeforeDownloadType' : 'playflowAfterDownloadType');
          var url = Player.get(type=='preroll' ? 'playflowBeforeDownloadURL' : 'playflowAfterDownloadURL');
          if(playflow_type=='video' && url.length>0) {
            $this.playflowClip = Player.get('url') + url;
            $this.playflowLink = Player.get(type=='preroll' ? 'playflowBeforeLink' : 'playflowAfterLink')
            $this.beginClip();
            return false;
          } else {
            return true;
          }
      }

      // When a video is loaded, reset the state of the Playflow
      Player.bind('player:video:loaded', function(){
          $this.playflowState = 'before';
      });
      // Prerolls before the clip begins
      Player.bind('player:video:beforeplay', function(){
          if($this.playflowState!='before') return true;
          $this.playflowState = 'preroll';
          return($this.initiateClip($this.playflowState));
      });
      // Postrolls after the clip has ended
      Player.bind('player:video:ended', function(){
          $this.playflowState = 'postroll';
          return($this.initiateClip($this.playflowState));
      });

      // Close clip
      Player.setter('closeIdentity', function(){
          if($this.playflowState=='aftertext') {
              $this.endAfterText();
          } else if(Player.get('identityAllowClose')) {
              Player.fire('player:playflow:video:close');
              $this.endClip();
          }
      });

      // Expose properties
      Player.getter('playflowBeforeDownloadType', function(){var v = Player.get('video'); return (v&&v.before_download_type ? v.before_download_type||'' : '');});
      Player.getter('playflowBeforeDownloadURL', function(){var v = Player.get('video'); return (v&&v.before_download_url ? v.before_download_url||'' : '');});
      Player.getter('playflowBeforeLink', function(){var v = Player.get('video'); return (v&&v.before_link ? v.before_link||'' : '');});

      Player.getter('playflowAfterDownloadType', function(){var v = Player.get('video'); return (v&&v.after_download_type ? v.after_download_type||'' : '');});
      Player.getter('playflowAfterDownloadURL', function(){var v = Player.get('video'); return (v&&v.after_download_url ? v.after_download_url||'' : '');});
      Player.getter('playflowAfterLink', function(){var v = Player.get('video'); return (v&&v.after_link ? v.after_link||'' : '');});

      Player.getter('playflowAfterText', function(){var v = Player.get('video'); return (v&&v.after_text ? v.after_text||'' : '');});

      Player.getter('playflowActive', function(){return $this.playflowState=='preroll'||$this.playflowState=='postroll'||$this.playflowState=='aftertext';});
      Player.getter('playflowState', function(){return $this.playflowState;});
      Player.getter('identityCountdown', function(){return $this.identityCountdown;});
      Player.getter('identityAllowClose', function(){return $this.identityAllowClose;});
      Player.getter('playflowAdPosition', function(){
        if($this.playflowState=='before'||$this.playflowState=='preroll'||$this.playflowState=='during') {
          return 'preroll';
        } else {
          return 'postroll';
        }
      });

      // Format countdown
      Player.getter('identityCountdownText', function(){
        try {
          var duration = $this.eingebaut.getDuration();
          var currentTime = $this.eingebaut.getCurrentTime();
          var timeLeft = Math.round(duration-currentTime);
          if(isNaN(timeLeft)) return '';
          var s = (timeLeft==1 ? $this.identityCountdownTextSingular : $this.identityCountdownTextPlural);
          return s.replace(/\%/img, timeLeft);
        }catch(e){
          return '';
        }
      });
      
      return $this;
  }
);
