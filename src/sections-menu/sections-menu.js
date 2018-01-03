/* 
   MODULE: SECTIONS-MENU
   Show a menu with clickable sections

   Listens for:
   - player:sectionschange 
   - player:video:loaded
   - player:video:timeupdate

   Answers properties:
   - showSectionsMenu [set/get]
   - sectionsMenuLabel [set/get]
   - toggleSectionMenu [set]
*/

Player.provide('sections-menu', {
  showSectionsMenu:0,
  sectionsMenuLabel: ''
}, function(Player,$,opts){
  var $this = this;
  $.extend($this, opts);
  $this.showInProgress = false;
  $this.currentSectionIndex = null;

  Player.bind('player:settings', function(e){
    PlayerUtilities.mergeSettings($this, ['sectionsMenuLabel','showSectionsMenu']);
    $this.render();
  });

  
  /* SETTERS */
  Player.setter('toggleSectionsMenu', function(show) {
    $(".sections-menu-open").scrollTop(0);
    $(".player-sections-menu").toggleClass("sections-menu-open", show);
    $(window).trigger('resize');
  });
  Player.setter('showSectionsMenu', function(ssm){
    $this.showSectionsMenu = ssm;
    $this.render();
  });
  Player.setter('sectionsMenuLabel', function(sml){
    $this.sectionsMenuLabel = sml;
    $this.render();
  });

  /* GETTERS */
  Player.getter('sectionsMenuLabel', function(){
    return $this.sectionsMenuLabel || Player.translate('sections');
  });
  Player.getter('showSectionsMenu', function(){
    return $this.showSectionsMenu;
  });

  
  /* LISTEN TO EVENTS */
  Player.bind('player:sectionschange player:video:loaded', function(){
    $this.render();
  });
  
  Player.bind("player:video:timeupdate", function() {    
    var currentTime = Player.get('currentTime');
    var sections = Player.get('sections');
    var currentSectionIndex = null;
    
    for(i = 0; i < sections.length; i++) {
      if(currentTime >= sections[i].start_time) {
        currentSectionIndex = i;
      }
    }
    
    if(currentSectionIndex != $this.currentSectionIndex) {
      $this.currentSectionIndex = currentSectionIndex;
      $(".section-item").removeClass("active");
      $(".section-item").eq(currentSectionIndex).addClass("active");
    }
  });

  Player.bind('player:loaded', function() {
    var userAgent = window.navigator.userAgent.toLowerCase();
    //iOS Safari compatability
    if (userAgent.match(/ipad/i) || userAgent.match(/iphone/i)) {
      $(".player-sections-menu").addClass("iphone-compat");
    }
    //IE 7 & 8 compatabilty
    var isIE = (userAgent.indexOf('msie') != -1) ? parseInt(userAgent.split('msie')[1]) : false;
    if(isIE && isIE <= 8) {
      $(".player-sections-menu").addClass("ie-compat");
    }
  });
  
  $(window).resize(function() {
    if($(window).outerHeight()-40 <= $(".sections-menu-container").outerHeight()) {
      $(".player-sections-menu").addClass("fixed-to-top");
    } else {
      $(".player-sections-menu").removeClass("fixed-to-top");
    }
  });

  return $this;
});


Player.translate("sections",{
    en: "Sections"
});











