/*
  DESIGN THEME FOR THE PLAYER
*/

Player.provide('design',
  {
    showTray: true,
    trayTimeout: 5000,
    verticalPadding:0,
    horizontalPadding:0,
    trayAlpha:0.75,
    trayBackgroundColor:'#ffffff',
    trayTextColor:'#013622',
    trayFont:'TT, NBInternationalPro, Helvetica',
    trayTitleFontSize:16,
    trayTitleFontWeight:'normal',
    trayContentFontSize:12,
    trayContentFontWeight:'normal',
    scrubberColor:'#E6E6E6'
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
                  if(e&&e.target&& ($(e.target).hasClass('volume-track') || $(e.target).hasClass('volume-filled'))) return;
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
          if(e&&e.target&& ($(e.target).hasClass('volume-track') || $(e.target).hasClass('volume-filled'))) return;
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
      return;
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

          var l = $('.tray-left .tray-button:visible').length * 43;
          var r = $('.tray-right .tray-button:visible').length * 39;
          if(l>0) {
            $('.tray-scrubber').css({marginLeft:l+'px', marginRight:r+'px'});
            if(_resizeInterval) {
              window.clearInterval(_resizeInterval);
              _resizeInterval = null;
            }
          }
      }
      var _resizeInterval = window.setInterval(_resize,50);
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
