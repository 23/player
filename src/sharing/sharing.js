/* 
   MODULE: SHARINGS
   Core module to handle sharing options, include enable sharing, 
   links to social services, embeds, and backlinks.

   Listens for:
   - player:settings: The app was loaded, time to show the logo
   - player:video:loaded: A new video was loaded.

   Fires:
   - player:sharing: Whenever the sharing options are updated
   - player:sharing:shareengaged: Fires when sharing options are engaged (used by analytics)
   - player:sharing:embedengaged: Fires when embed is engaged (used by analytics)
   
   Answers properties:
   - socialSharing [get]: Is social sharing even supported by the video site? And is is enabled in settings?
   - showSharing [get/set]: Show and hide the share pane.
   - rssLink [get]
   - podcastLink [get]
   - embedCode [get]
   - videoLink [get]
   - siteLink [get]
   - facebookLink [get]
   - twitterLink [get]
   - tumblrLink [get]
   - googleLink [get]
   - linkedinLink [get]
   - diggLink [get]
   - mailLink [get]
*/

Player.provide('sharing', 
  {
    socialSharing: true,
    showSharing: false,
    showDownload: false
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

      var _shareCurrentTime = false;

      var _onRender = function(){
          $this.sharingLink = $this.container.find(".sharing-link");
          $this.currentTimeSelect = $this.container.find(".current-time-select");
          $this.checkbox = $this.container.find(".checkbox");
          $this.currentTimeSelect.click(_currentTimeClick);
          var _show = $this.showSharing;
          Player.set('showSharing', false);
          Player.set('showSharing', _show);
      };
      var _currentTimeClick = function(){
          $this.checkbox.toggleClass("checked");
          _shareCurrentTime = $this.checkbox.hasClass("checked");
          if(_shareCurrentTime){
              Player.set("playing", false);
              var url = Player.get("videoLink") + "/" + formatTime(parseInt(Player.get("currentTime")));
              $this.sharingLink.text(url);
              $this.sharingLink.attr("href", url);
          }else{
              $this.sharingLink.text( Player.get("videoLink") );
          }
      };

      // Helper function
      var absolutize = function(u){
        if(!/\/\//.test(u)) u = Player.get('mainUrl')+u;
        return u;
      };

      // Bind to events
      Player.bind('player:settings', function(e,settings){
          PlayerUtilities.mergeSettings($this, ['socialSharing', 'showSharing', 'rssLink', 'podcastLink', 'embedCode', 'showDownload']);
          $this.rssLink = absolutize($this.rssLink||Player.get('url') + '/rss');
          $this.podcastLink = absolutize($this.podcastLink||Player.get('url') + '/podcast');
          $this.embedCode = $this.embedCode||'';
          $this.render(_onRender);
          Player.fire('player:sharing', {});
        });
      $this.videoLink = '';
      Player.bind('player:video:loaded', function(){
          $this.videoLink = absolutize(Player.get('video_one'));
          $this.render(_onRender);
      });

      /* GETTERS */
      Player.getter('socialSharing', function(){
          return (typeof($this.socialSharing)!='undefined'&&$this.socialSharing&&$this.socialSharing!='0') && Player.get('video_sharable');
        });
      Player.getter('showSharing', function(){
          if(!Player.get('socialSharing')) return(false);
          return (typeof($this.showSharing)=='undefined'||($this.showSharing&&$this.showSharing!='0'));
        });
      Player.getter('rssLink', function(){
          if(!Player.get('socialSharing')) return('');
          return $this.rssLink;
        });
      Player.getter('podcastLink', function(){
          if(!Player.get('socialSharing')) return('');
          return $this.podcastLink;
        });
      Player.getter('embedCode', function(){
          if(!Player.get('socialSharing')) return('');
          return $this.embedCode;
        });
      Player.getter('videoLink', function(){
          if(!Player.get('socialSharing')) return('');
          return $this.videoLink;
        });
      Player.getter('siteLink', function(){
          return Player.get('mainUrl');
      });
      Player.getter('showDownload', function(){
          return ($this.showDownload && Player.get("video_type") == "clip" && !Player.get("isTouchDevice"));
      });
      Player.getter('downloadUrl', function(){
          var v = Player.get("video");
          if (typeof(v.video_1080p_download)!='undefined' && v.video_1080p_download.length>0 && v.video_1080p_size>0) {
              return Player.get('url') + '/attachment' + v.video_1080p_download;
          } else if (typeof(v.video_hd_download)!='undefined' && v.video_hd_download.length>0) {
              return Player.get('url') + '/attachment' + v.video_hd_download;
          } else if (typeof(v.video_medium_download)!='undefined' && v.video_medium_download.length>0) {
              return Player.get('url') + '/attachment' + v.video_medium_download;
          }
          return "";
      });

      var socialLink = function(service){
          if(!Player.get('socialSharing')) return('');
          if(_shareCurrentTime){
              return Player.get('videoLink') + '/' + formatTime(Player.get("currentTime")) + '/' + service;
          }
          return Player.get('videoLink') + '/' + service;
      };
      Player.getter('facebookLink', function(){return socialLink('facebook');});
      Player.getter('twitterLink', function(){return socialLink('twitter');});
      Player.getter('tumblrLink', function(){return socialLink('tumblr');});
      Player.getter('googleLink', function(){return socialLink('google');});
      Player.getter('linkedinLink', function(){return socialLink('linkedin');});
      Player.getter('diggLink', function(){return socialLink('digg');});
      Player.getter('mailLink', function(){return socialLink('mail');});
     
      /* SETTERS */
      var _sharingTimeouts = [];
      var _prevShow = false;
      Player.setter('showSharing', function(ss){
          $this.showSharing = ss && Player.get("socialSharing");
          if($this.showSharing){
              $this.showSharing = !Player.fire("player:module:overlayactivated", {name: "sharing", prevented: false}).prevented;
          }
          if($this.showSharing) Player.fire('player:sharing:shareengaged', {});
          if($this.showSharing != _prevShow){
              while(_sharingTimeouts.length > 0){
                  clearTimeout(_sharingTimeouts.pop());
              }

              $("body").toggleClass("overlay-shown", true);

              if(_shareCurrentTime){
                  _currentTimeClick();
              }

              // Block a few other modules
              Player.set("forcer", {type: "block", element: "tray big-play info", from: "sharing", active: $this.showSharing});
              
              // Animate the container in/out
              $this.container.find(".sharing-container").show();
              _sharingTimeouts.push(setTimeout(function(){
                  $this.container.find(".sharing-container").toggleClass("sharing-container-active", $this.showSharing);
              }, 10));
              _sharingTimeouts.push(setTimeout(function(){
                  $this.container.find(".sharing-container").css({display: ""});
                  $("body").toggleClass("overlay-shown", $this.showSharing);
              }, 210));
              _prevShow = $this.showSharing;
          }
      });
      Player.setter('shareTo', function(service){
          Player.fire('player:sharing:shareengaged', {});
          if(service=='site') {
              Player.set('playing', false);
              window.open(Player.get('siteLink')+Player.get('video_one'));
          } else {
              window.open(Player.get(service + 'Link'));
          }
      });

      Player.bind("player:module:overlayactivated", function(e, info){
          if(info.name != "sharing"){
              Player.set("showSharing", false);
          }
          return info;
      });

      $this.render(_onRender);

      return $this;
  }
);

/* Translations for this module */
Player.translate("embed",{
    en: "Embed"
});
Player.translate("copy_embed",{
    en: "Copy embed code for video"
});
Player.translate("see_on_site",{
    en: "See on site"
});
Player.translate("share_on_facebook",{
    en: "Share on Facebook"
});
Player.translate("tweet_this_video",{
    en: "Tweet this video"
});
Player.translate("plus_one_google",{
    en: "+1 on Google"
});
Player.translate("mail_video",{
    en: "Mail video"
});
