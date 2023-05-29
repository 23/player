/*
   MODULE: ACCESSIBILITY
   Utility module to handle accessibility interaction with the player.

  Answers properties:
  - moduleFocus [set]
  - focus [set]
*/

Player.provide('accessibility',
  {
    showTray: true,
    scrubberColor:'#aaa'
  },
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);

    $this.shortcutsDisabled = false;

    /* EVENT HANDLERS */
    var _togglePlayback = function(){};
    $this.loadShortcuts = function(){
      // Handle keyboard events
      $(document).keypress(function(e){
        if(Player.get('shortcutsDisabled')) return;
        if(!document.activeElement||$(document.activeElement).parent('form').length) return;
        if(!e.ctrlKey && !e.altKey && !e.metaKey) {
          var matched = false;

          // Click action element
          if(e.charCode==32 || e.keyCode==13 || e.keyCode==32) {
            if($(document.activeElement).is('body') || $(document.activeElement).is('video')) {
              // No explicit focus is set, toggle playback.
              Player.set('playing', !Player.get('playing'));
            } else if ($(document.activeElement).hasClass('muted-auto-play-button')) {
              $(document.activeElement).click();
            } else {
              if(Player.get('shortcutsDisabled') ||  !$this.showTray) return;
              // We assume that the Glue item will be r-erendered after click.
              // To accomocate for this, we remember the glue container for the item
              // and reestablish focus afterwards.
              var glueParent = $(document.activeElement).parent('.glue-element');
              if(!document.activeElement.tagName=="BUTTON"||e.keyCode==13||e.charCode==13){
                // Handle button menus
                var active = $('.button-container-active').removeClass('button-container-active');
                if($(document.activeElement).hasClass('playback-rate-button')){
                  Player.set('playbackRateMenuExpanded', false)
                  $(document.activeElement).attr("aria-label", Player.translate("collapsed_playback"))
                }
                if($(document.activeElement).hasClass('quality-button')){
                  Player.set('qualityMenuExpanded', false)
                  $(document.activeElement).attr("aria-label", Player.translate("collapsed_quality"))
                }
                if($(document.activeElement).hasClass('subtitle-button')){
                  Player.set('subtitleMenuExpanded', false)
                  var subtitleOn = Player.get('subtitleLocale') != "";
                  if(subtitleOn) $(document.activeElement).attr("aria-label", Player.translate("subtitle_on_collapsed"))
                  else $(document.activeElement).attr("aria-label", Player.translate("subtitle_off_collapsed"))
                }
                var parent = $(document.activeElement).parent();
                if(parent.hasClass('button-container') && parent.get(0)!=active.get(0)) {
                  parent.addClass('button-container-active');
                  $(document.activeElement).mouseenter();
                  if($(document.activeElement).hasClass('playback-rate-button')){
                    Player.set('playbackRateMenuExpanded', true)
                    $(document.activeElement).attr("aria-label", Player.translate("expanded_playback"))
                  }
                  if($(document.activeElement).hasClass('quality-button')){
                    Player.set('qualityMenuExpanded', true)
                    $(document.activeElement).attr("aria-label", Player.translate("expanded_quality"))
                  }
                  if($(document.activeElement).hasClass('subtitle-button')){
                    Player.set('subtitleMenuExpanded', true)
                    $(document.activeElement).attr("aria-label", Player.translate( Player.get('subtitleLocale') != "" ? "subtitle_on_expanded" : "subtitle_off_expanded"))
                  }
                }
                // Emulate click
                $(document.activeElement).click();
              }
              window.setTimeout(function(){
                Player.set('focus', glueParent);
              }, 200);
            }
            matched = true;
          }

          // Mute on 0 press
          if(e.charCode==48 || e.keyCode==48) {
            Player.set('volume', 0);
            matched = true;
          }
          // Full volume on 1 press
          if(e.charCode==49 || e.keyCode==49) {
            Player.set('volume', 1);
            matched = true;
          }
          if (matched) e.preventDefault();
        }
      });
      $(document).keydown(function(e){
        if(Player.get('shortcutsDisabled') || !$this.showTray) return;
        if(!e.ctrlKey && !e.altKey && !e.metaKey) {
          var matched = false;
          // Increase volume
          // 38  up arrow
          // 187 equal sign
          if(e.keyCode==38 || e.keyCode==187) {
            arrowVolumeChangeHandler();
            Player.set('volume', Player.get('volume')+0.2);
            matched = true;
          }
          // Decrease volume
          // 40  down arrow
          // 189 dash
          if(e.keyCode==40 || e.keyCode==189) {
            arrowVolumeChangeHandler();
            Player.set('volume', Player.get('volume')-0.2);
            matched = true;
          }
          // Scrub on right arrow
          if(e.keyCode==39) {
            arrowScrubHandler();
            Player.set('currentTime', Player.get('currentTime')+10);
            matched = true;
          }
          // Scrub on left arrow
          if(e.keyCode==37) {
            arrowScrubHandler();
            Player.set('currentTime', Player.get('currentTime')-5);
            matched = true;
          }
          // Disable tray timeout on tab
          if(e.keyCode==9) {
            $('body').addClass('tabbed');
            Player.set("forcer", {
              type: "persist",
              element: "tray",
              from: "accessibility",
              active: true
            });

            if(document.activeElement.tabIndex == 1100 && !e.shiftKey){
              e.preventDefault();
              showVolumeSlider();
            }else if(document.activeElement.tabIndex == 1398 && e.shiftKey){
              e.preventDefault();
              showVolumeSlider();
            }else if(document.activeElement.tabIndex == 1110){
              hideVolumeSlider();
            }

          }
          if(e.keyCode==27) {
            // Destroy menus
            $('.activebutton').removeClass('activebutton').parent().removeClass('activebutton-container');
          }

          if(matched) e.preventDefault();
        }
      });
    };


    /* SETTERS: Handle element focus */
    Player.setter('focus', function(el){
      if($(el).is('[tabindex]')) {
        $(el).focus();
      } else {
        $(el).children('*[tabindex]').focus();
      }
    });

    Player.setter('moduleFocus', function(module){
      // If module is passed in by string, find the correct container;
      if(typeof module.container == 'undefined') {
        $.each(Player.modules, function(i,m){
          if(m.moduleName == module) {
            module = m;
            return false;
          }
        });
      }
      if(typeof module.container != 'undefined') {
        Player.set('focus', module.container);
      }
    });
    Player.setter("shortcutsDisabled", function(disabled){
      $this.shortcutsDisabled = disabled;
    });

    /* GETTERS */
    Player.getter("shortcutsDisabled", function() {
      try {
        if (Player.get('videoActionPlaying')) {
          return true;
        }
      } catch(e) {}
      return $this.shortcutsDisabled;
    });


    // Modify highlight color to match the player scrubber
    Player.bind('player:settings', function(e){
      PlayerUtilities.mergeSettings($this, ['showTray', 'scrubberColor']);
      if($this.scrubberColor.length>0) {
        $('head').append('<style>body.tabbed [tabindex]:focus {outline: 3px solid '+$this.scrubberColor+' !important;}</style>');
      }
    });

    var arrowScrubHandler = function(){
      $('body').addClass('tray-shown');
      $('.scrubber-track').focus();
      if(!$('body').hasClass('tabbed')){
        if(this.timeoutId != undefined){
          clearTimeout(this.timeoutId);
        }
        this.timeoutId = setTimeout(function(){$('body').removeClass('tray-shown');}, 5000)
      }
    }

    var arrowVolumeChangeHandler = function(){
      showVolumeSlider();
      if(!$('body').hasClass('tabbed')){
        if(this.timeoutId != undefined){
          clearTimeout(this.timeoutId);
        }
        this.timeoutId = setTimeout(hideVolumeSlider, 5000)
      }
    }

    var showVolumeSlider = function(){
      $('body').addClass('tray-shown');
      $('.player-volume-button').children('.button-container').addClass('button-container-active');
      $('.volume-slider').focus();
    }

    var hideVolumeSlider = function(){
      $('body').removeClass('tray-shown');
      $('.player-volume-button').children('.button-container').removeClass('button-container-active');
    }

    //
    var updateTabIndex = function(){
      // Store tab index
      $('[tabindex]').each(function(i,el){
        if(!$(el).attr('data-tabindex')) $(el).attr('data-tabindex', $(el).attr('tabindex'));
      });
      $('[data-tabindex]').each(function(i,el){
        var visible = $(el).is(':visible') && $(el).width()>0 && $(el).height()>0;
        if($(el).parents('.button-menu') && $(el).parents('.button-menu').height()==0) visible = false;
        if(visible) {
          $(el).attr('tabindex', $(el).attr('data-tabindex'));
        } else {
          $(el).attr('tabindex', '-1');
        }
      });
    }
    updateTabIndex();
    window.setInterval(updateTabIndex,300);

    $this.loadShortcuts();
    return $this;
  }
);
