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
   - socialSharing [get] (is social sharing even supported by the video site? this will overwrite showShare.)
   - showShare [get/set]
   - rssLink [get]
   - podcastLink [get]
   - embedCode [get]
   - videoLink [get]
   - siteLink [get]
   - facebookLink [get]
   - twitterLink [get]
   - tumblrLink [get]
   - googleLink [get]
   - mailLink [get]
*/

Glue.provide('sharing', 
  {},
  function(Glue,$,opts){
      var $this = this;
      $.extend($this, opts);

      // Helper function
      var absolutize = function(u){
        if(!/\/\//.test(u)) u = Glue.get('url')+u;
        return u;
      }

      // Bind to events
      Glue.bind('player:settings', function(e,settings){
          $(['socialSharing', 'showShare', 'rssLink', 'podcastLink', 'embedCode']).each(function(ignore,i){
              if(typeof($this[i])=='undefined'&&typeof(settings[i])!='undefined') $this[i]=settings[i];
            });
          $this.socialSharing = ($this.socialSharing||false ? true : false);
          $this.showShare = ($this.showShare||true ? true : false);;
          $this.rssLink = absolutize($this.rssLink||Glue.get('url') + '/rss');
          $this.podcastLink = absolutize($this.podcastLink||Glue.get('url') + '/podcast');
          $this.embedCode = $this.embedCode||'';

          Glue.fire('player:sharing', {});
        });
      $this.videoLink = '';
      Glue.bind('player:video:loaded', function(){
          $this.videoLink = absolutize(Glue.get('video_one'));
          Glue.fire('player:sharing', {});
        });

      /* GETTERS */
      Glue.getter('socialSharing', function(){
          return (typeof($this.socialSharing)!='undefined'&&$this.socialSharing&&$this.socialSharing!='0');
        });
      Glue.getter('showShare', function(){
          if(!Glue.get('socialSharing')) return(false);
          return (typeof($this.showShare)=='undefined'||($this.showShare&&$this.showShare!='0'));
        });
      Glue.getter('rssLink', function(){
          if(!Glue.get('socialSharing')) return('');
          return $this.rssLink;
        });
      Glue.getter('podcastLink', function(){
          if(!Glue.get('socialSharing')) return('');
          return $this.podcastLink;
        });
      Glue.getter('embedCode', function(){
          if(!Glue.get('socialSharing')) return('');
          return $this.embedCode;
        });
      Glue.getter('videoLink', function(){
          if(!Glue.get('socialSharing')) return('');
          return $this.videoLink;
        });
      Glue.getter('siteLink', function(){
          return Glue.get('url');
        });

      var socialLink = function(service){
        if(!Glue.get('socialSharing')) return('');
        return Glue.get('videoLink') + '/' + service;
      };
      Glue.getter('facebookLink', function(){return socialLink('facebook');});
      Glue.getter('twitterLink', function(){return socialLink('twitter');});
      Glue.getter('tumblrLink', function(){return socialLink('tumblr');});
      Glue.getter('googleLink', function(){return socialLink('google');});
      Glue.getter('linkedinLink', function(){return socialLink('linkedin');});
      Glue.getter('mailLink', function(){return socialLink('mail');});
     
      /* SETTERS */
      Glue.setter('showShare', function(ss){
          $this.showShare = ss;
          Glue.fire('player:sharing', {});
        });

      return $this;
  }
);
