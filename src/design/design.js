/*
  DESIGN THEME FOR THE PLAYER
*/

Player.provide('design',
  {
    showTray: true,
    trayTimeout: 5000,
    verticalPadding:0,
    horizontalPadding:0,
    trayAlpha:0.8,
    trayBackgroundColor:'#000000',
    trayTextColor:'#ffffff',
    trayFont:'Helvetica',
    trayTitleFontSize:14,
    trayTitleFontWeight:'bold',
    trayContentFontSize:12,
    trayContentFontWeight:'normal',
    scrubberColor:'#eeeeee'
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
                          right: $(button).offsetParent().innerWidth()-$(button).position().left-$(button).width()-3
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

      // Set classes on body to indicate video type
      Player.bind("player:video:loaded",function(e,v){
          if(typeof v == "undefined") return;
          $("body").removeClass("video-clip").removeClass("video-stream").removeClass("stream-dvr");
          if(v.type == "clip"){
              $("body").addClass("video-clip");
          }else{
              $("body").addClass("video-stream");
              if(Player.get("stream_has_dvr")){
                  $("body").addClass("stream-dvr");
              }
          }
      });


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
      });

      // Show tray and time it out
      var _trayTimeoutId = null;
      var _trayAnimatingOut = false;
      var _showTray = function(){
          window.clearTimeout(_trayTimeoutId);
          if(_trayAnimatingOut){
              $("#tray").stop();
              _trayAnimatingOut = false;
          }
          $("#tray").fadeIn(0);
          $('body').addClass("tray-shown");
          if($this.trayTimeout > 0){
              _trayTimeoutId = window.setTimeout(_requestHideTray, $this.trayTimeout);
          }
      };
      var _requestShowTray = function(){
          if($this.showTray && Player.get("video_playable")){
              _showTray();
          }else{
              _hideTray();
          }
      };
      var _hideTray = function(){
          window.clearTimeout(_trayTimeoutId);
          if(!_trayAnimatingOut){
              _trayAnimatingOut = true;
              $("#tray").stop().fadeOut(function(){
                  $('body').removeClass("tray-shown");
                  _trayAnimatingOut = false;
              });
          }
      };
      var _requestHideTray = function(){
          if( !Player.get('showSharing')
              && !Player.get('browseMode')
              && !Player.get('slideOverviewShown')
              && !$("#tray").find(".activebutton").length ){
              _hideTray();
          }
      };
      $(document).mousemove(_requestShowTray);
      $(document).mouseleave(_requestHideTray);
      Player.setter("showTray", function(st){
          $this.showTray = st;
          _requestShowTray();
      });
      Player.setter("trayTimeout", function(tt){
          $this.trayTimeout = tt;
      });
      Player.bind('player:browse:updated player:sharing:shareengaged player:video:loaded player:settings', _requestShowTray);

      $this.dummyElement = $(document.createElement('div')).css({backgroundColor:'rgba(0,0,0,.666)'});
      $this.applyDesignPreferences = function(){
          // Tray title font, size, weight
          $('h1').css({fontFamily:$this.trayFont, fontSize:$this.trayTitleFontSize+'px', fontWeight:$this.trayTitleFontWeight});
          // Tray content font, size, weight
          $('p').css({fontFamily:$this.trayFont, fontSize:$this.trayContentFontSize+'px', fontWeight:$this.trayContentFontWeight});
          // Text color
          $('body,button').css({color:$this.trayTextColor});
          // Background color and opacity
          //$('div.button ul').css({backgroundColor:$this.trayBackgroundColor});
          $('a.button').css({backgroundColor:$this.trayBackgroundColor, opacity:$this.trayAlpha});
          $('.scrubber-play').css({backgroundColor:$this.scrubberColor});
          $this.rgbaSupport = /^rgba/.test($this.dummyElement.css('backgroundColor'));
          if($this.rgbaSupport) {
              $('.big-play-button, ul.button-list, .tray-left .button, .tray-right-container, .info-pane, .sharing-container, .player-browse #browse').css({backgroundColor:$this.trayBackgroundColorRGBA});
          } else {
              // (fall back to background color + opacity if RGBa is not supported
              $('.big-play-button, ul.button-list, .tray-left .button, .tray-right-container, .info-pane, .sharing-container, .player-browse #browse').css({backgroundColor:$this.trayBackgroundColor, opacity:$this.trayAlpha});
          }
          // Vertical and horisontal padding
          $('.video-display').css({bottom:$this.verticalPadding+'px', left:$this.horizontalPadding+'px'})
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
          var r = $('.tray-right div.tray-button:visible').length * 28;
          var rc = $('.tray-right-container').width();
          if(r>0) {
	      $('.tray-right').css({width: r});
          }
          $('.player-info:visible').css({width: (rc-r-30)});

          // This is a pretty fancy fix for an IE7 bug:
          // Empty elements are given layout, causing all kinds of buttons the .tray-right
          // and tray-left to go flying. Very litterally: Hide empty stuff, show other.
          $('.tray-right>div:empty, .tray-left>div:empty').hide();
          $('.tray-right>div:parent, .tray-left>div:parent').show();
      }
      $(window).load(_resize);
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

      // Return a reference
      return $this;
  }
);
