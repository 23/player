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
    showBigPlay: false,
    bigPlaySource: ''
  },
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.showAnimation = [{opacity:'show'}, 300];

    $this.bigPlayShown = false;
    $this.possiblyRender = function(){
      if(Player.get("showBigPlay")&&!Player.get("playing")&&Player.get("video_playable")&&!Player.get("actionsShown")){
        if(!$this.bigPlayShown){
          $this.render(_resize);
          $this.bigPlayShown = true;
        }
      }else{
        if($this.bigPlayShown){
          $this.container.html("");
          $this.bigPlayShown = false;
        }
      }
    };

    // Get relevant settings
    Player.bind('player:settings', function(e,settings){
        PlayerUtilities.mergeSettings($this, ['showBigPlay', 'bigPlaySource']);
        if($this.bigPlaySource.length>0 && !/\/\//.test($this.bigPlaySource)){
            $this.bigPlaySource = Player.get('url')+$this.bigPlaySource;
        }
        $this.possiblyRender();
      });

    // Update element on play, pause and more
    Player.bind('player:video:loaded player:video:play player:video:seeked player:video:pause player:video:ended player:action:loaded player:action:dispatched', function(e){
      $this.possiblyRender();
    });

    /* GETTERS */
    Player.getter('showBigPlay', function(){
        return $this.showBigPlay;
      });
    Player.getter('bigPlaySource', function(){
        return $this.bigPlaySource;
    });
    /* SETTERS */
    Player.setter('showBigPlay', function(sbp){
        $this.showBigPlay = sbp;
        $this.possiblyRender();
      });

    var _resize = function(){
      var ww = $(window).width();
      var wh = $(window).height();
      var isTouch = $("body").hasClass("touch");
      var left = ww / 2 - (isTouch?175:140) / 2;
      var top = wh / 2 - (isTouch?100:80) / 2;
      $this.container.find(".big-play-container").css({
        top: top,
        left: left
      });
    };
    $(window).resize(_resize);
    _resize();
      
    return $this;
  }

);
