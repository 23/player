/* 
   MODULE: SOCIAL BUTTON
   Show a button for sharing to a socical service
   
   Listens for:
   - player:sharing: Whenever the sharing options are updated
*/

Player.provide('social-button', 
  {}, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.render();

    Player.bind('player:sharing', function(e){
        $this.render();
      });

    return $this;
  }
);
