/* 
 MODULE: DOWNLOAD BUTTON
 Show a button for downloading content
*/

Player.provide('download-button', 
  {
    showDownload:false
  }, 
  function(Player,$,opts){
    var $this = this;
    $.extend($this, opts);
    $this.downloadQualities = [];

    Player.bind('player:settings', function(e,settings){
      PlayerUtilities.mergeSettings($this, ['showDownload']);
      $this.render();
    });

    Player.getter('showDownload', function(){
      return $this.showDownload;
    });
    Player.getter('downloadQualities', function(){
      return $this.downloadQualities;
    });

    Player.bind('player:video:loaded', function(e,v){
      $this.downloadQualities = [];
      if(v&&v.type=="clip"){
        if (typeof(v.video_1080p_download)!='undefined' && v.video_1080p_download.length>0 && v.video_1080p_size>0) {
          $this.downloadQualities.push({displayName:'Full HD', link:Player.get('url') + '/attachment' + v.video_1080p_download});
        }
        if (typeof(v.video_hd_download)!='undefined' && v.video_hd_download.length>0) {
          $this.downloadQualities.push({displayName:'HD', link:Player.get('url') + '/attachment' + v.video_hd_download});
        }
        if (typeof(v.video_medium_download)!='undefined' && v.video_medium_download.length>0) {
          $this.downloadQualities.push({displayName:'Standard', link:Player.get('url') + '/attachment' + v.video_medium_download});
        }
      }
      $this.render();
    });

    return $this;
  }
          
);

/* Translations for this module */
Player.translate("download_video",{
    en: "Download video"
});
Player.translate("download",{
    en: "Download"
});
