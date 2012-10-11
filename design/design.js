/* 
  DESIGN THEME FOR THE PLAYER
*/

Player.provide('design', 
  {}, 
  function(Player,$,opts){
    // This is required to add the template to the page
    var $this = this;
    $.extend($this, opts);
    $('body').append($this.container);
    $this.render();


    // Show and hide top
    Player.bind('player:video:play player:video:seeked player:video:pause player:video:ended  player:video:qualitychange', function(e){
        if(Player.get('playing')) {
          $('#top').show();
        } else {
          $('#top').hide();
        }
      });


    $(window).mouseleave(function(){
        $('#top').hide();
      });
    $(window).mouseenter(function(){
          if(Player.get('playing')){
            $('#top').show();
          }
      });


    // Return a reference
    return $this;
  }
);
