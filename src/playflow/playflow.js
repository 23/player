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

  Todo:
  - mix and match: aftertext anden gang
  - fire events / check analytics
  - ie7
*/

Player.provide('playflow', 
  {
    identityCountdown: true,
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

      // Play either preroll or postroll clips
      $this.beginClip = function(){
        $this.stealEingebaut();
        if($this.playflowClip.length==0) return;
        $this.eingebaut.setSource($this.playflowClip);
        $this.eingebaut.setPlaying(true);
        $($this.container).show();
        $($this.clicks).show();
        $this.updateCountdown();
      }
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
      $this.updateCountdown = function(){
        if($this.playflowState=='preroll'||$this.playflowState=='postroll') {
          $this.render(function(){}, 'playflow/playflow-countdown.liquid', $this.content);
        } else {
          $this.content.html('');
        }
      }

      // Handle after text
      $this.beginAfterText = function(){
          $this.playflowState = 'aftertext';
          if(Player.get('playflowAfterText').length>0) {
              $($this.container).show();
              $this.render(function(){}, 'playflow/playflow-after-text.liquid', $this.content);
          } else {
              $this.endAfterText();
          }
      }
      $this.endAfterText = function(){
          $($this.container).hide();
          $this.content.html('');
          $this.playflowState = 'ended';
      }

      // Create containers
      $this.clicks = $(document.createElement('div')).addClass('playflow-click-container');
      $this.container.append($this.clicks);
      $this.clicks.click(function(){
          if($this.playflowLink.length>0) {
            $this.endClip();
            window.open($this.playflowLink);
          }
      });
      $this.content = $(document.createElement('div')).addClass('playflow-content');
      $this.container.append($this.content);
    
      // Logic to load the display device with Eingebaut
      $this.eingebaut = null;
      $this.originalEingebaut ={
        callback: null,
        source: null
      }
      $this.eingebautCallback = function(e){
        // Error if no display device is available
        if(e=='loaded'&&$this.eingebaut.displayDevice=='none') {
          $this.cancelPlayflow();
        }
        // If this loads after the content (i.e. if we're switching display device, fire an event that we're ready)
        if(e=='ready') {
          $this.beginClip();
        } else if(e=='ended'||e=='pause') {
          Player.fire('player:playflow:video:complete');
          $this.endClip();
        } else if(e=='progress'||e=='timeupdate') {
          $this.updateCountdown();
        }
      };
      $this.stealEingebaut = function(){
        if(!$this.eingebaut) {
          $this.eingebaut = Player.get('videoElement');
          $this.originalEingebaut.callback = $this.eingebaut.callback;
        }
        $this.originalEingebaut.source = $this.eingebaut.getSource();
        $this.eingebaut.callback = $this.eingebautCallback;        
        $this.eingebaut.container.parent().css({zIndex:200});
      };
      $this.restoreEingebaut = function(){
        $this.eingebaut.callback = $this.originalEingebaut.callback;        
        if($this.originalEingebaut.source) $this.eingebaut.setSource($this.originalEingebaut.source);
        $this.eingebaut.container.parent().css({zIndex:''});
      }

      // Merge in player settings and update the display if needed
      Player.bind('player:settings', function(){
          PlayerUtilities.mergeSettings($this, ['identityCountdown', 'identityAllowClose', 'identityCountdownTextSingular', 'identityCountdownTextPlural']);
      });

      // Play advertising on play, if any
      $this.initiateClip = function(type) {
          $this.playflowClip = '';
          $this.playflowLink = '';
          var playflow_type = Player.get(type=='preroll' ? 'playflowBeforeDownloadType' : 'playflowAfterDownloadType');
          var url = Player.get(type=='preroll' ? 'playflowBeforeDownloadURL' : 'playflowAfterDownloadURL');
          if(playflow_type=='video' && url.length>0) {
            $this.playflowState = type;
            $this.playflowClip = Player.get('url') + url;
            $this.playflowLink = Player.get(type=='preroll' ? 'playflowBeforeLink' : 'playflowAfterLink')
            $this.beginClip();
            return false;
          } else {
            $this.endClip();
            return true;
          }
      }
      Player.bind('player:video:beforeplay', function(){
          if($this.playflowState!='before') return true;
          return($this.initiateClip('preroll'));
      });
      Player.bind('player:video:ended', function(){
          return($this.initiateClip('postroll'));
      });
      Player.bind('player:video:loaded', function(){
          $this.playflowState = 'before';
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
      Player.getter('playflowAdPosition', function(){return ($this.playflowState=='preroll'||$this.playflowState=='postroll'||$this.playflowState=='aftertext' ? $this.playflowState : 'none');});

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
