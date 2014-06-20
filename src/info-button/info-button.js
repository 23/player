/* 
 MODULE: INFO BUTTON
 Show an info button
 
 Listens for:
 - player:infoengaged
*/

Player.provide('info-button', 
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();
    
    Player.bind('player:infoengaged', function(e){
        $this.render();
      });
      
    return $this;
  }
          
);

/* Translations for this module */
Player.translate("video_information",{
    en: "Video information"
});
