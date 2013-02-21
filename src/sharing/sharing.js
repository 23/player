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
    showSharing: false
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);
      $this.showAnimation = [{opacity:'show'}, 400];

      // Helper function
      var absolutize = function(u){
        if(!/\/\//.test(u)) u = Player.get('url')+u;
        return u;
      }

      // Bind to events
      Player.bind('player:settings', function(e,settings){
          PlayerUtilities.mergeSettings($this, ['socialSharing', 'showSharing', 'rssLink', 'podcastLink', 'embedCode']);
          $this.rssLink = absolutize($this.rssLink||Player.get('url') + '/rss');
          $this.podcastLink = absolutize($this.podcastLink||Player.get('url') + '/podcast');
          $this.embedCode = $this.embedCode||'';
          Player.fire('player:sharing', {});
        });
      $this.videoLink = '';
      Player.bind('player:video:loaded', function(){
          $this.videoLink = absolutize(Player.get('video_one'));
          Player.fire('player:sharing', {});
        });

      // Render on sharing update
      Player.bind('player:sharing', function(){
          $this.render();
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
          return Player.get('url');
        });

      var socialLink = function(service){
        if(!Player.get('socialSharing')) return('');
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
      Player.setter('showSharing', function(ss){
          if(!Player.get('socialSharing')) return;
          $this.showSharing = ss;
          if(ss) {
              $('.activebutton').removeClass('activebutton');
              Player.set('browseMode', false);
          }
          $(window).resize();
          if(ss) Player.fire('player:sharing:shareengaged', {});
          Player.fire('player:sharing', {});
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

      return $this;
  }
);
