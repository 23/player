/*
   MODULE: LOGO
   Show a logo in the player

   Listens for:
   - player:settings: The app was loaded, time to show the logo

   Answers properties:
   - showLogo [get/set]
   - logoSource [get]
*/

Player.provide('logo',
  {
    logoSource:'',
    showLogo:true
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

      var _onImageLoaded = function(){
          var img = $this.logo.get(0);
          var ratio = img.naturalWidth / img.naturalHeight;
          var style = {"display": "block"};
          if(ratio > 1.2){
              style["max-width"] = "80px";
          }else if(ratio < 0.8){
              style["max-height"] = "80px";
          }else{
              style["max-width"] = "60px";
          }
          $this.logo.css(style);
      };

      var _onRender = function(){
          $this.logo = $this.container.find("img");
          if($this.logo.size() > 0){
              if($this.logo.get(0).complete){
                  _onImageLoaded();
              }else{
                  $this.logo.load(_onImageLoaded);
              }
          }
      };

      // Bind to events
      Player.bind('player:settings', function(e,settings){
          // Load in settings from API if they haven't been overwritten by liquid "with ..."
          PlayerUtilities.mergeSettings($this, ['logoSource', 'showLogo', 'logoPosition', 'logoAlpha', 'logoWidth', 'logoHeight']);
          if(!$this.logoSource.length) $this.showLogo = false;
          if($this.logoSource.length>0 && !/\/\//.test($this.logoSource)) $this.logoSource = Player.get('url')+$this.logoSource;
          $this.render(_onRender);
      });

      Player.bind('player:video:loaded', function() {
          $this.render(_onRender);
      });

      /* GETTERS */
      Player.getter('showLogo', function(){return $this.showLogo||false;});
      Player.getter('logoSource', function(){return $this.logoSource||'';});

      return $this;
  }
);

Player.translate("logo-link",{
    en: "You are on a link press enter to open the company website",
});
