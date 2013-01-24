/* 
  DESIGN THEME FOR THE PLAYER
*/

Player.provide('design', 
  {
    showTray: true,
    trayTimeout: 0
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
                  $(div).toggleClass('activebutton');
                  e.stopPropagation();
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
          PlayerUtilities.mergeSettings($this, ['showTray', 'trayTimeout']);
          
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


      // RESIZE HANDLING
      var _resize = function(){
          var l = $('.tray-left div.tray-button').length * 33;
          var r = $('.tray-right div.tray-button').length * 33;
          if(l>0) $('.tray-scrubber').css({marginLeft:l+'px', marginRight:r+'px'});
      }
      $(window).load(_resize);
      $(window).resize(_resize);
      Player.bind('glue:render', _resize);
      
      // Return a reference
      return $this;
  }
);
