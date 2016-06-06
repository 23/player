/* 
   MODULE: BIG PLAY BUTTON
   Show a play/pause button
   
   Listens for:
   - player:video:play
   - player:video:playing 
   - player:video:pause 
   - player:video:ended
   
   Answers properties:
   - showBigPlay [get/set]
*/

Player.provide('big-play-button', 
  {
    bigPlaySource: ''
  },
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    // Get relevant settings
    Player.bind('player:settings', function(e,settings){
        PlayerUtilities.mergeSettings($this, ['showBigPlay', 'bigPlaySource']);
        if($this.bigPlaySource.length>0 && !/\/\//.test($this.bigPlaySource)){
            $this.bigPlaySource = Player.get('url')+$this.bigPlaySource;
        }
        $this.render(_onRender);
    });

    // Update element on play, pause and more
    Player.bind('player:video:loaded player:video:play player:video:seeked player:video:pause player:video:ended player:action:loaded player:action:dispatched', function(e){
        _updateBigPlay();
    });

    /* GETTERS */
    Player.getter('bigPlaySource', function(){
        return $this.bigPlaySource;
    });

    var _prevShow = false;
    var _bigPlayTimeouts = [];
    var _updateBigPlay = function(){
        var show = (!Player.get("playing") && Player.get("video_playable") && !Player.get("actionsShown"));
        if(show != _prevShow){
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

    var _onRender = function(){
      if($this.bigPlaySource != ""){
        $this.bigPlayWidth = 100;
        $this.bigPlayHeight = 100;
      }else{
        $this.bigPlayWidth = 91;
        $this.bigPlayHeight = 51;
      }
      $this.button = $this.container.find("button");
      _resize();
    };
    var _resize = function(){
      var ww = $(window).width();
      var wh = $(window).height();
      var left = ww / 2 - $this.bigPlayWidth / 2;
      var top = wh / 2 - $this.bigPlayHeight / 2;
      $this.container.find(".big-play-container").css({
        top: top,
        left: left
      });
    };
    $(window).resize(_resize);
      
    return $this;
  }
          
);
