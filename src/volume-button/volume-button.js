/* 
 MODULE: VOLUME/MUTE BUTTON
 Show a mute/sound button
 
 Listens for:
 - player:video:volumechange
*/

Player.provide('volume-button', 
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();

    Player.bind('player:video:volumechange player:video:play player:video:pause player:video:loaded', function(e){
        $this.render();
    });

    /* GETTERS */
    Player.getter('volumeMuted', function(){return (Player.get('volume')==0);});
    /* SETTERS */
    Player.setter('volumeMuted', function(vm){
        Player.set('volume', (vm ? 0 : 1));
      });
      
    return $this;
  }
          
);

/* Translations for this module */
Player.translate("toggle_volume",{
    en: "Toogle volume"
});
