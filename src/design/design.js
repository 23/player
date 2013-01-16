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
              $(div).click(function(){
                  $(div).toggleClass('activebutton');
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
                  $this.trayTimeoutId = window.setTimeout(function(){$('#tray').hide()}, $this.trayTimeout);
              }
              $(window).mousemove(triggerTrayTimeout);
              triggerTrayTimeout();
          }
      });
      
      
      // Return a reference
      return $this;
  }
);
