/* 
  DESIGN THEME FOR THE PLAYER
*/

Player.provide('design', 
  {
    showTray: true,
    trayTimeout: 0,
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

      $this.applyDesignPreferences = function(){
          // Tray title font, size, weight
          $('h1').css({fontFamily:$this.trayFont, fontSize:$this.trayTitleFontSize+'px', fontWeight:$this.trayTitleFontWeight});
          // Tray content font, size, weight
          $('p').css({fontFamily:$this.trayFont, fontSize:$this.trayContentFontSize+'px', fontWeight:$this.trayContentFontWeight});
          // Text color
          $('body,button').css({color:$this.trayTextColor});
          // Background color and opacity
          //$('div.button ul').css({backgroundColor:$this.trayBackgroundColor});
          $('.tray-left div.button, .big-play-button, a.button').css({backgroundColor:$this.trayBackgroundColor, opacity:$this.trayAlpha});
          $('.scrubber-play').css({backgroundColor:$this.scrubberColor});
          $('.tray-right-container, .info-pane, .sharing-container, .player-browse #browse').css({backgroundColor:$this.trayBackgroundColorRGBA});
          if(!/^rgba/.test($('.tray-right-container').css('backgroundColor'))) {
              // (fall back to background color + opacity if RGBa is not supported
              $('.tray-right-container, .info-pane, .sharing-container, .player-browse #browse').css({backgroundColor:$this.trayBackgroundColor, opacity:$this.trayAlpha});
          }
          //$('div.button, a.button').css({backgroundColor:$this.trayBackgroundColor, opacity:$this.trayAlpha});
          // Vertical and horisontal padding
          $('video-display').css({bottom:$this.verticalPadding+'px', left:$this.horizontalPadding+'px'})
      }


      // RESIZE HANDLING
      var _resize = function(){
          var r = $('.tray-right div.tray-button:visible').length * 33;
          if(r>0) {
            $('.player-info').css({marginRight:r+'px'});
            $('.tray-right').css({width: r});
          }
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
