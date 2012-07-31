/* 
   MODULE: LOGO
   Show a logo in the player
   
   Listens for:
   - player:settings: The app was loaded, time to show the logo
   
   Answers properties:
   - showLogo [get/set]
   - logoSource [get]
   - logoPosition [get]
   - logoAlpha [get]
   - logoWidth [get]
   - logoHeight [get]
*/

Player.provide('logo', 
  {},
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);
      
      // Bind to events
      Player.bind('player:settings', function(e,settings){
          // Load in settings from API if they haven't been overwritten by liquid "with ..."
          $(['logoSource', 'showLogo', 'logoPosition', 'logoAlpha', 'logoWidth', 'logoHeight']).each(function(ignore,i){
              if(typeof($this[i])=='undefined'&&typeof(settings[i])!='undefined') $this[i]=settings[i];
            });

          if(!/\/\//.test($this.logoSource)) $this.logoSource = Player.get('url')+$this.logoSource;
          $this.render();
        });
      Player.bind('player:sharing', function(){
          $this.render();
        });
    

      /* GETTERS */
      Player.getter('showLogo', function(){
          return (typeof($this.showLogo)=='undefined'||($this.showLogo&&$this.showLogo!='0'));
        });
      Player.getter('logoSource', function(){return $this.logoSource||'';});
      Player.getter('logoPosition', function(){return $this.logoPosition||'';});
      Player.getter('logoAlpha', function(){return $this.logoAlpha||'';});
      Player.getter('logoWidth', function(){return $this.logoWidth||'';});
      Player.getter('logoHeight', function(){return $this.logoHeight||'';});
     
      /* SETTERS */
      Player.setter('showLogo', function(sl){
          $this.showLogo = sl;
          $this.render();
        });

      return $this;
  }
);
