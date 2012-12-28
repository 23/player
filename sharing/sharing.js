/* 
   MODULE: SHARINGS
   Core module to handle sharing options, include enable sharing, 
   links to social services, embeds, and backlinks.

   This core module is designed without UI, since multiple buttons,
   panes etc may want to use the links and codes.
   
   Listens for:
   - player:settings: The app was loaded, time to show the logo
   - player:video:loaded: A new video was loaded.

   Fires:
   - player:sharing: Whenever the sharing options are updated
   
   Answers properties:
   - socialSharing [get]: Is social sharing even supported by the video site? And is is enabled in settings?
   - showShare [get/set]: Show and hide the share pane.
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
    showShare: false
  },
  function(Player,$,opts){
      var $this = this;
      $.extend($this, opts);

      // Helper function
      var absolutize = function(u){
        if(!/\/\//.test(u)) u = Player.get('url')+u;
        return u;
      }

      // Bind to events
      Player.bind('player:settings', function(e,settings){
          PlayerUtilities.mergeSettings($this, ['socialSharing', 'showShare', 'rssLink', 'podcastLink', 'embedCode']);
          $this.socialSharing = ($this.socialSharing ? true : false);
          $this.showShare = ($this.showShare ? true : false);
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
          return (typeof($this.socialSharing)!='undefined'&&$this.socialSharing&&$this.socialSharing!='0');
        });
      Player.getter('showShare', function(){
          if(!Player.get('socialSharing')) return(false);
          return (typeof($this.showShare)=='undefined'||($this.showShare&&$this.showShare!='0'));
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
      Player.setter('showShare', function(ss){
          if(!Player.get('socialSharing')) return;
          $this.showShare = ss;
          if(ss) Player.fire('player:sharing:shareengaged', {});
          Player.fire('player:sharing', {});
        });
      Player.setter('shareTo', function(service){
          Player.fire('player:sharing:shareengaged', {});
          window.open(Player.get(service + 'Link'));
        });

      return $this;
  }
);
