/* 
   MODULE: PROTECTION
   Utility module to manage protection and verification with the 23 Video backend. 
   Specifically, this allows protected content to be accessed through a lookup of 
   `protection_token` via /api/protection/verify. The method covers different schemes,
   for example geoblocking, password protection, cleeng paywalls and more.

  Listens for:
  - player:video:loaded (to figure out if the video in question is protected or not)

  Answers properties:
  - protectionStatus [get] (can be unknown, unprotected, verified, verifying, denied)
  - protectionMethod [get] (can be unknown, none, cleeng, password, geoblocking and more) 
  - videoProtected [get] (true or false depending on whether the clip is protected or not)

  Fires:
  - player:protection:statusupdate (whenever status updates)
  - player:protection:verified (whenever a video is ready to play)
  - player:protection:denied (whenever a video is denied playback)
*/

Player.provide('protection', 
  {
  },
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.showAnimation = [{opacity:'show'}, 500];

    // Internal methods for handling status
    $this.status = 'unknown';
    $this.method = 'unknown';
    $this.maxRetries = 1;
    $this.retryNumber = 0;
    $this.errorMessage = "Unfortunately, you don't have access to watch this video.";
    var updateState = function(video, status, method) {
      $this.status = status;
      $this.method = method;
      if(status=='verified' || status=='unprotected') Player.fire('player:protection:verified', video);
      if(status=='denied') Player.fire('player:protection:denied', video);
      Player.fire('player:protection:statusupdate', video);
    }

    // Handle different kinds of protection methods
    var getVerificationData = function(method, video, callback) {
      switch(method) {
      case 'cleeng':
        var cl = document.createElement('script'); cl.type = 'text/javascript'; cl.async = true;
        cl.src = '//cdn.cleeng.com/js-api/3.0/api.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(cl, s);
        $this.maxRetries = 1;
        window.setTimeout(function(){
          callback(CleengApi.getToken());
        }, 1000);
        break;
      case 'password':
        Player.set('autoPlay', true);
        $this.maxRetries = 3;
        $this.verifyCallback = callback;
        $this.render(function(){
          $this.container.find('form').submit(function(e){
            callback($this.container.find('input[type=password]').val());
            return false;
          });
        });
        break;
      case 'geoblocking':
        $this.maxRetries = 1;
        callback('');
        break;
      }
    }
  
    /*
      When a new video or live stream is loaded, we want to
      a) Check is the ressource is protected at all?
      b) If so, detect the necessary information to verify access (for example password or a cookie)
         This is done through the `getVerificationData()` method which is written to handle this process
         asynchronously. For example, you can prompt for a password -- and run `callback(password)` when 
         the user has provided the password.
      c) With the verification data in place, we call /api/protection/verify to check the data. This will 
         hopefully result in a protection_token being return.
      d) The protection_token is used to reload the video or live ressource. After this has been done, the 
         a new `PlayerVideo` object is created with the new data and replaced into the list of clips.
      e) If everything went according to plan, we now `.switchTo()` to newly resolved and verified clip.
    */
    var verifyAccess = function(e,v,retryNumber){
      $this.retryNumber = retryNumber||1;      

      // (a)
      // Check if protection verification is needed
      if(!Player.get('videoProtected')) {
        updateState(v, 'unprotected', 'none');
      } else {
        updateState(v, 'verifying', v.protection_method);

        // (b)
        // Get the necessary context information to verify access
        getVerificationData($this.method, v, function(verificationData){
          $this.container.html('');
          // (c)
          // Verify access
          var data = {
            protection_method:$this.method, 
            object_id:(v.type=='clip' ? v.photo_id : v.live_id),
            object_type:(v.type=='clip' ? 'photo' : 'live'),
            verification_data:verificationData
          };
          Player.get('api').call('/api/protection/verify', data, function(r){
            if(!r || !r.protectedtoken) {
              console.debug('Protection error', 'Could not resolve protection token for the ressource', r);
              updateState(v, 'denied', v.protection_method);
              return;
            }
            // (d)
            // We got a protected token for the resource, reload it using that information
            v.token = r.protectedtoken.protected_token;
            v.reload(function(){
              // (e)
              // We got the actual video, ready to play. 
              // Switch in the object
              updateState(v, 'verified', v.protection_method);
              v.switchTo();
              Player.set('playing', Player.get('autoPlay'));
            }, function(data){
              console.debug('Protection error', 'Received error for ressource when using using protected_token', data);
              updateState(v, 'denied', v.protection_method);
            });
          }, function(errorMessage){
            if(errorMessage.length>0) $this.errorMessage = errorMessage;
            console.debug('Protection error', 'Received error while verifying and looking up protected token', errorMessage);
            updateState(v, 'denied', v.protection_method);
          });
        });
      }
    }
    
    // Listen to loaded event and run the verification mechanism
    var _previousLoadedVideo = null;
    Player.bind('player:video:loaded', function(event, video){
      if(video===_previousLoadedVideo) return;
      _previousLoadedVideo = video;
      verifyAccess(event, video, 1);
    });
    // Handle error message and possible retries
    Player.bind('player:protection:denied', function(event, video){
      if($this.retryNumber<$this.maxRetries) {
        verifyAccess(event, video, ++$this.retryNumber);
      } else {
        Player.set('error', $this.errorMessage);
      }
    });

    /* GETTERS */
    // Is the video currently protected?
    Player.getter('videoProtected', function(){
      var v = Player.get('video');
      return (v ? v.protected_p=="1" : false);
    });
    // What is the current status of verification. Desired state is "unprotected".
    Player.getter('protectionStatus', function(){
      return $this.status;
    });
    // Which protection method is being used for verification.
    // When protection has been unlocked for a video, this will be "none".
    Player.getter('protectionMethod', function(){
      return $this.method;
    });

    return $this;
  }
);