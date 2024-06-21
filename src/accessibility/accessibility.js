/*
   MODULE: ACCESSIBILITY
   Utility module to handle accessibility interaction with the player.

  Answers properties:
  - moduleFocus [set]
  - focus [set]
*/

Player.provide(
  "accessibility",
  {
    showTray: true,
  },
  function (Player, $, opts) {
    var $this = this;
    $.extend($this, opts);

    $this.shortcutsDisabled = false;

    /* EVENT HANDLERS */
    var _togglePlayback = function () {};
    $this.loadShortcuts = function () {
      // Handle keyboard events
      $(document).keypress(function (e) {
        if (Player.get("shortcutsDisabled")) return;
        if (
          !document.activeElement ||
          $(document.activeElement).parent("form").length
        )
          return;
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          var matched = false;

          // Click action element
          if (e.keyCode == 13 || e.keyCode == 32) {
            if (
              $(document.activeElement).is("body") ||
              $(document.activeElement).is("video")
            ) {
              // No explicit focus is set, toggle playback.
              Player.set("playing", !Player.get("playing"));
            } else if (
              $(document.activeElement).hasClass("muted-auto-play-button")
            ) {
              $(document.activeElement).click();
            } else {
              if (Player.get("shortcutsDisabled") || !$this.showTray) return;
              // We assume that the Glue item will be r-erendered after click.
              // To accomocate for this, we remember the glue container for the item
              // and reestablish focus afterwards.
              var glueParent = $(document.activeElement).parents(".glue-element:first");
              if (
                !document.activeElement.tagName == "BUTTON" ||
                e.keyCode == 13
              ) {
                // Handle button menus
                var active = $(".button-container-active").removeClass(
                  "button-container-active"
                );
                active.children("button.menu-trigger-button").attr("aria-expanded", false)
              
                var parent = $(document.activeElement).parent();
                // Opening a menu
                if (
                  parent.hasClass("button-menu-container") &&
                  parent.get(0) != active.get(0)
                ) {
                  parent.addClass("button-container-active");
                  if($(document.activeElement).hasClass("menu-trigger-button")) $(document.activeElement).attr("aria-expanded", "true");
                  $(document.activeElement).mouseover();
                  var menu = parent.find(".button-menu");
                  if (menu.length > 0) {
                    menu.children().first().children().focus();
                    matched = true;
                  }                   
                } else {
                  // Clicking a menu item or a button without a menu
                  $(document.activeElement).click();
                  matched = true;
                  window.setTimeout(function () {
                    if (glueParent.length > 0) {
                      glueParent.find("button.menu-trigger-button").focus();
                    }
                  }, 200);
                }
              }
            }
            matched = true;
          }

          // Mute on 0 press
          if (e.keyCode == 48) {
            Player.set("volume", 0);
            matched = true;
          }
          // Full volume on 1 press
          if (e.keyCode == 49) {
            Player.set("volume", 1);
            matched = true;
          }
          if (matched) e.preventDefault();
        }
      });
      $(document).keydown(function (e) {
        if (Player.get("shortcutsDisabled") || !$this.showTray) return;
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          var matched = false;
          // Increase volume
          // 38  up arrow
          if (e.keyCode == 38) {
            if($(document.activeElement).hasClass("button-menu-item")) {
              $(document.activeElement).parent('li').prev().children(".button-menu-item").focus();
            }
            else Player.set("volume", Player.get("volume") + 0.2);
            matched = true;
          }
          // Decrease volume
          // 40  down arrow
          if (e.keyCode == 40) {
            if($(document.activeElement).hasClass("button-menu-item")) {
              $(document.activeElement).parent('li').next().children(".button-menu-item").focus();
            }
            else Player.set("volume", Player.get("volume") - 0.2);
            matched = true;
          }
          // Scrub on right arrow
          if (e.keyCode == 39) {
            Player.set("currentTime", Player.get("currentTime") + 10);
            matched = true;
          }
          // Scrub on left arrow
          if (e.keyCode == 37) {
            Player.set("currentTime", Player.get("currentTime") - 5);
            matched = true;
          }
          // Disable tray timeout on tab
          if (e.keyCode == 9) {
            if(Player.get('trayAvailable')) Player.set("alwaysShowTray", true);
          }
          if (e.keyCode == 27) {
            // Destroy menus
            var active = $(".button-container-active");
            if (active.length > 0) {
              active.removeClass("button-container-active");
              matched = true;
              var trigger = active.children("button.menu-trigger-button");
              trigger.focus();
              trigger.attr("aria-expanded", false);
            }
          }

          if (matched) e.preventDefault();
        }
      });
    };

    /* SETTERS: Handle element focus */
    Player.setter("focus", function (el) {
      if ($(el).is("[tabindex]")) {
        $(el).focus();
      } else {
        $(el).children("*[tabindex]").focus();
      }
    });

    Player.setter("moduleFocus", function (module) {
      // If module is passed in by string, find the correct container;
      if (typeof module.container == "undefined") {
        $.each(Player.modules, function (i, m) {
          if (m.moduleName == module) {
            module = m;
            return false;
          }
        });
      }
      if (typeof module.container != "undefined") {
        Player.set("focus", module.container);
      }
    });
    Player.setter("shortcutsDisabled", function (disabled) {
      $this.shortcutsDisabled = disabled;
    });

    /* GETTERS */
    Player.getter("shortcutsDisabled", function () {
      try {
        if (Player.get("videoActionPlaying")) {
          return true;
        }
      } catch (e) {}
      return $this.shortcutsDisabled;
    });

    var updateTabIndex = function () {
      $(".button-menu").each(function (i, el) {
        if ($(el).height() == 0) {
          $(el).find(".button-menu-item").each(function(j, item){
            $(item).attr("tabindex", "-1");
          });
        }
        else {
          $(el).find(".button-menu-item").each(function(j, item){
            $(item).attr("tabindex", "0");
          });
        }
      });
    };
    updateTabIndex();
    window.setInterval(updateTabIndex, 300);

    $this.loadShortcuts();
    return $this;
  }
);
