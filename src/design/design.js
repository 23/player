/*
  DESIGN THEME FOR THE PLAYER
*/

Player.provide('design',
  {
    showTray: true,
    trayTimeout: 5000,
    verticalPadding:0,
    horizontalPadding:0,
    trayAlpha:0.85,
    trayBackgroundColor:'#FFFFFF',
    trayTextColor:'#333',
    trayFont:'Open Sans',
    trayTitleFontSize:28,
    trayTitleFontWeight:'normal',
    trayContentFontSize:12,
    trayContentFontWeight:'normal',
    scrubberColor:'#89D5CE',
    browseBackgroundColor: '#333333'
  },
  function(Player,$,opts){
      // This is required to add the template to the page
      var $this = this;
      $.extend($this, opts);
      $('body').append($this.container);
      $this.render();



      // This is the heavy lifting for the design
      // (and what you will want to change in order to
      //  modify the behaviour of the design.)

      // BUTTON MENUS
      // Handle button clicks
      Player.bind('glue:render', function(e, container){
          $(container).find('button.has-list').each(function(i,button){
              $(button).off("click.button-menu").on("click.button-menu", function(e){
                  if($(button).hasClass('activebutton')) {
                      $(button).removeClass('activebutton').attr("aria-expanded", "false").parent().removeClass('activebutton-container');
                  } else {
                      $('.activebutton').removeClass('activebutton').attr("aria-expanded", "false");
                      $('.activebutton-container').removeClass("activebutton-container");
                      Player.set('browseMode', false);
                      Player.set('showSharing', false);
                      $(button).addClass('activebutton').attr("aria-expanded", "true").parent().addClass("activebutton-container").find(".button-list").css({
                          right: $(button).offsetParent().innerWidth()-$(button).position().left-$(button).width()-6
                      });
                      e.stopPropagation();
                  }
              });
          });
      });
      // Destroy menus when applicable
      $('body').click(function(e){
          $('.activebutton').each(function(i,el){
              el = $(el);
              if(!el.is(e.target)){
                  el.removeClass('activebutton').attr("aria-expanded", "false");
                  el.parent().removeClass('activebutton-container');
              }
          });
      });

      // Set .touch-class on body, if we're on iDevice or Android
      if(/iPad|iPhone|Android/.test(navigator.userAgent)){
          $("body").addClass("touch");
      }

      // SHOW TRAY AND TIME IT OUT
      // Handle settings
      $this.trayTimeoutId = null;
      Player.bind('player:settings', function(e){
          PlayerUtilities.mergeSettings($this, ['showTray', 'trayTimeout', 'verticalPadding', 'horizontalPadding', 'trayAlpha','trayBackgroundColor','trayTextColor','trayFont','trayTitleFontSize','trayTitleFontWeight','trayContentFontSize','trayContentFontWeight', 'scrubberColor']);
          $this.trayTitleFontSize = $this.trayContentFontSize * 1.3;

          // Allow for background color transparency
          var colorTest = $this.trayBackgroundColor.match(/^\#(..)(..)(..)$/);
          if(colorTest && colorTest.length==4) {
              var r = parseInt(colorTest[1], 16);
              var g = parseInt(colorTest[2], 16);
              var b = parseInt(colorTest[3], 16);
              $this.trayBackgroundColorRGB = 'rgb('+r+','+g+','+b+')';
              $this.trayBackgroundColorRGBA = 'rgba('+r+','+g+','+b+','+$this.trayAlpha+')';
          } else {
              $this.trayBackgroundColorRGB = $this.trayBackgroundColor;
              $this.trayBackgroundColorRGBA = $this.trayBackgroundColor;
          }
          $this.applyDesignPreferences();

          // Honour `showTray`
          $('#tray').toggle($this.showTray ? true : false);
          // Honour `trayTimeout`
          $this._minimized = false;
          if($this.showTray&&$this.trayTimeout>0) {
              var trayAnimatingIn = false;
              var triggerTrayTimeout = function(e){
                  if($this.trayTimeout<=0) return;
                  window.clearTimeout($this.trayTimeoutId);
                  if(e&&e.hideNow){
                    if(!Player.get('showSharing')&&!Player.get('browseMode')&&$("#tray").find(".activebutton").length==0) {
                      trayAnimatingIn = false;
                      $('.tray-navigation').stop().animate({opacity:0}, 300, function(){
                        $('#tray').addClass('minimized');
                        $this._minimized = true;
                        $('.tray-navigation').css({opacity:1});
                      });
                      $('body').addClass("hide-cursor");
                    }
                    return;
                  }
                  $('body').removeClass("hide-cursor");
                  if(!trayAnimatingIn&&$this._minimized){
                    $('.tray-navigation').css({opacity:0});
                    $('#tray').removeClass('minimized');
                    $('.tray-navigation').animate({opacity:1}, 800, function(){trayAnimatingIn=false;});
                    $this._minimized = false;
                    trayAnimatingIn = true;
                  }
                  $this.trayTimeoutId = window.setTimeout(function(){
                    triggerTrayTimeout({hideNow:true});
                  }, $this.trayTimeout);
              }
              $(document).mousemove(triggerTrayTimeout);
              $(document).mouseleave(function(){triggerTrayTimeout({hideNow:true});});
              Player.bind('player:browse:updated player:sharing:shareengaged', triggerTrayTimeout);
              triggerTrayTimeout();
          }
      });


      $this.dummyElement = $(document.createElement('div')).css({backgroundColor:'rgba(0,0,0,.666)'});
      $this.applyDesignPreferences = function(){
          // Tray title font, size, weight
          $('h1').css({fontFamily:$this.trayFont, fontSize:$this.trayTitleFontSize+'px', fontWeight:$this.trayTitleFontWeight});
          // Tray content font, size, weight
          $('p').css({fontFamily:$this.trayFont, fontSize:$this.trayContentFontSize+'px', fontWeight:$this.trayContentFontWeight});
          // Text color
          $('body').css({color:$this.trayTextColor});
          // Background color and opacity
          $('.scrubber-play').css({backgroundColor:$this.scrubberColor});

          $this.rgbaSupport = /^rgba/.test($this.dummyElement.css('backgroundColor'));
          if($this.rgbaSupport) {
              $('.big-play-button, .tray-navigation, .scrubber-container, .sharing-container, ul.button-list, .player-browse #browse').css({backgroundColor:$this.trayBackgroundColorRGBA});
          } else {
              // (fall back to background color + opacity if RGBa is not supported
              $('.big-play-button, .tray-navigation, .scrubber-container, .sharing-container, ul.button-list, .player-browse #browse').css({backgroundColor:$this.trayBackgroundColor, opacity:$this.trayAlpha});
          }
          // Vertical and horisontal padding
          $('video-display').css({bottom:$this.verticalPadding+'px', left:$this.horizontalPadding+'px'})
      }

      if (!/Android/.test(navigator.userAgent) && 'ontouchstart' in document.documentElement) {
          // Fullscreen on pinch to zoom
          $(document).on("gesturechange", function(e){
              if (e.originalEvent.scale > 1) {
                  Player.set("fullscreen", true);
              }
          });
          // Quicker response on tap
          $(document).on("touchstart", function(e){
              if (e.originalEvent.touches.length == 1) {
                  if( $(e.target).prop("tagName")!="A" && $(e.target).prop("tagName")!="INPUT" ){
                    $this.touchResponse = true;
                    $this.touchEvent = e.originalEvent;
                  }
              }
          });
          $(document).on("touchmove", function(e){
              if (e.originalEvent.touches.length == 1) {
                $this.touchResponse = false;
              }
          });
          $(document).on("touchend", function(e){
              if ($this.touchResponse) {
                try {$(e.target).mousemove();}catch(e){}
                $(e.target).trigger("click", $this.touchEvent);
                $this.touchEvent.preventDefault();
                e.preventDefault();
              }
              $this.touchResponse = false;
          });
      }

      // RESIZE HANDLING
      var _resize = function(){
          // This is a pretty fancy fix for an IE7 bug:
          // Empty elements are given layout, causing all kinds of buttons the .tray-right
          // and tray-left to go flying. Very litterally: Hide empty stuff, show other.
          $('.tray-right>div:empty, .tray-left>div:empty').hide();
          $('.tray-right>div:parent, .tray-left>div:parent').show();
      }
      $(window).resize(_resize);
      Player.bind('glue:render', function(){
          _resize();
          $this.applyDesignPreferences();
      });
      // Force IE 7,8,9 to constantly check for window resize
      // Needed when iframe is not visible when it loads
      if(/IE (7|8|9)/.test(navigator.userAgent)){
          $this.windowWidth = -1;
          window.setInterval(function(){
              if($this.windowWidth != $(window).width()){
                  $this.windowWidth = $(window).width();
                  $(window).resize();
              }
          },1000);
      }

      // Simple setters to help control the tray and its timeout
      Player.setter('showTray', function(st){
        $this.showTray = st;
        $('#tray').toggle($this.showTray).removeClass("minimized");
        $('body').removeClass("hide-cursor");
      });
      Player.setter('trayTimeout', function(tt){
        $this.trayTimeout = tt;
        if($this.trayTimeout<=0) window.clearTimeout($this.trayTimeoutId);
      });

      // Return a reference
      return $this;
  }
);
