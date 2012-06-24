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

Glue.provide('logo', 
  {},
  function(Glue,$,opts){
      var $this = this;
      $.extend($this, opts);
      
      // Bind to events
      Glue.bind('player:settings', function(e,settings){
          // Load in settings from API if they haven't been overwritten by liquid "with ..."
          $(['logoSource', 'showLogo', 'logoPosition', 'logoAlpha', 'logoWidth', 'logoHeight']).each(function(ignore,i){
              if(typeof($this[i])=='undefined'&&typeof(settings[i])!='undefined') $this[i]=settings[i];
            });

          if(!/\/\//.test($this.logoSource)) $this.logoSource = Glue.get('url')+$this.logoSource;
          $this.render();
        });
      Glue.bind('player:sharing', function(){
          $this.render();
        });
    

      /* GETTERS */
      Glue.getter('showLogo', function(){
          return (typeof($this.showLogo)=='undefined'||($this.showLogo&&$this.showLogo!='0'));
        });
      Glue.getter('logoSource', function(){return $this.logoSource||'';});
      Glue.getter('logoPosition', function(){return $this.logoPosition||'';});
      Glue.getter('logoAlpha', function(){return $this.logoAlpha||'';});
      Glue.getter('logoWidth', function(){return $this.logoWidth||'';});
      Glue.getter('logoHeight', function(){return $this.logoHeight||'';});
     
      /* SETTERS */
      Glue.setter('showLogo', function(sl){
          $this.showLogo = sl;
          $this.render();
        });

      return $this;
  }
);
