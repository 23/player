/*
  DESIGN THEME FOR THE PLAYER
*/

Player.provide('design',
  {
    showTray: true,
    trayTimeout: 0,
    verticalPadding:0,
    horizontalPadding:0,
    trayAlpha:0.85,
    trayBackgroundColor:'#FFFFFF',
    trayTextColor:'#ffffff',
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
          $(container).find('div.button:has(ul)').each(function(i,div){
              $(div).click(function(e){
                  if($(div).hasClass('activebutton')) {
                      $(div).removeClass('activebutton')
                  } else {
                      $('.activebutton').each(function(i,el){
                          $(el).removeClass('activebutton');
                      });
                      $(div).addClass('activebutton');
                      e.stopPropagation();
                  }
              });
          });
      });
      // Destroy menus when applicable
      $('body').click(function(e){
          $('.activebutton').each(function(i,el){
              el = $(el);
              if(!el.is(e.target)) el.removeClass('activebutton');
          });
      });


      // SHOW TRAY AND TIME IT OUT
      // Handle settings
      $this.trayTimeoutId = null;
      Player.bind('player:settings', function(e){
          PlayerUtilities.mergeSettings($this, ['showTray', 'trayTimeout', 'verticalPadding', 'horizontalPadding', 'trayAlpha','trayBackgroundColor','trayTextColor','trayFont','trayTitleFontSize','trayTitleFontWeight','trayContentFontSize','trayContentFontWeight', 'scrubberColor']);

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
          if($this.showTray&&$this.trayTimeout>0) {
              var triggerTrayTimeout = function(){
                  window.clearTimeout($this.trayTimeoutId);
                  $('#tray').show();
                  $this.trayTimeoutId = window.setTimeout(function(){
                      if(!Player.get('showSharing')&&!Player.get('browseMode')) {
                          $('#tray').hide();
                      }
                  }, $this.trayTimeout);
              }
              $(document).mousemove(triggerTrayTimeout);
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
              $('.big-play-button, .tray-navigation, .scrubber-container, .sharing-container, div.button ul').css({backgroundColor:$this.trayBackgroundColorRGBA});
          } else {
              // (fall back to background color + opacity if RGBa is not supported
              $('.big-play-button, .tray-navigation, .scrubber-container, .sharing-container, div.button ul').css({backgroundColor:$this.trayBackgroundColor, opacity:$this.trayAlpha});
          }
          // Vertical and horisontal padding
          $('video-display').css({bottom:$this.verticalPadding+'px', left:$this.horizontalPadding+'px'})
      }


      // RESIZE HANDLING
      var _resize = function(){

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

      // Return a reference
      return $this;
  }
);
