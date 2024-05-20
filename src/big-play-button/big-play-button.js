/*
   MODULE: BIG PLAY BUTTON
   Show a play/pause button
 */

Player.provide('big-play-button',
  {
    hideBigPlay: false,
    bigPlaySource: '',
    bigPlayPosition: 'center',
    bigPlayStyle: 'traditional',
    bigPlayForPause: false
  },
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    // Get relevant settings
    Player.bind('player:settings', function(e,settings){
      PlayerUtilities.mergeSettings($this, ['hideBigPlay', 'bigPlaySource', 'bigPlayPosition', 'bigPlayStyle', 'bigPlayForPause']);
      if($this.bigPlaySource.length>0 && !/\/\//.test($this.bigPlaySource)){
        $this.bigPlaySource = Player.get('url')+$this.bigPlaySource;
        $this.bigPlayStyle = 'traditional';
      }
      $this.render();
    });

    // Update element on play, pause and more
    Player.bind('player:video:loaded player:video:loadstart player:video:play player:video:seeked player:video:pause player:video:ended player:action:loaded player:action:dispatched', function (e) {
      _updateBigPlay();
    });
    Player.bind('player:video:play player:video:seeked player:video:pause player:video:ended', function(e) {
      $this.container.find('.big-play-button').toggleClass((Player.get('isStream') ? 'stop' : 'pause'), Player.get("playing") || Player.get("seeking"))
    });
    Player.bind('player:video:progress player:video:timeupdate player:video:seeked player:video:ended', function() {
      var ct = Player.get('currentTime')
      var display = (ct > 0 ? ct : Player.get('duration'))
      $this.container.find('.current-time').text(formatTime(display))
    })

    /* GETTERS */
    Player.getter('bigPlaySource', function(){
      return $this.bigPlaySource;
    });
    Player.getter('hideBigPlay', function(){
      return $this.hideBigPlay;
    });
    Player.getter('bigPlayPosition', function(){
      return $this.bigPlayPosition;
    });
    Player.getter('bigPlayStyle', function(){
      return $this.bigPlayStyle;
    });
    Player.getter('bigPlayForPause', function(){
      return $this.bigPlayForPause;
    });
    /* SETTERS */
    Player.setter('bigPlaySource', function(bps){
      $this.bigPlaySource = bps;
      $this.render();
    });
    Player.setter('hideBigPlay', function(hbp){
      $this.hideBigPlay = hbp;
      _updateBigPlay();
    });

    var _prevShow = false;
    var _bigPlayTimeouts = [];
    var _updateBigPlay = function(){
      var show = (
        !$this.hideBigPlay &&
        ($this.bigPlayPosition=='center' || !Player.get('showTray') || Player.get('currentTime')==0) &&
        ((!Player.get("playing") && !Player.get("seeking")) || Player.get('bigPlayForPause')) &&
        Player.get("video_playable") &&
        !Player.get("actionsShown")
      );
      if (show != _prevShow) {
        while(_bigPlayTimeouts.length > 0){
          clearTimeout(_bigPlayTimeouts.pop());
        }
        $this.container.show();
        _bigPlayTimeouts.push(setTimeout(function(){
          $this.container.toggleClass("big-play-shown", show);
        }, 10));
        _bigPlayTimeouts.push(setTimeout(function(){
          $this.container.css({display: ""});
        }, 210));
        _prevShow = show;
      }
    };

    return $this;
  }

);
