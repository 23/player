## Actions

"player:action:click", action
"player:action:dispatched"
"player:action:loaded"

"player:action:"+event


'player:browse:loaded'
'player:browse:updated'


./core/core.js:73:    $v = Player.fire('player:video:init', $v);
./core/core.js:80:        $v = Player.fire('player:video:populate', $v);
./core/core.js:102:              Player.fire('player:video:loaded', $v);
./core/core.js:121:        Player.fire('player:video:loaded', $v);
./core/core.js:184:              Player.fire('player:settings', $this.settings);
./core/core.js:254:          Player.fire('player:settings', $this.settings)
./core/core.js:383:          Player.fire('player:loaded');
./core/core.js:422:          Player.fire('player:init');
./core/core.js:438:                          Player.fire("player:data:loaded");
./core/core.js:445:                  Player.fire("player:data:loaded");

./info/info.js:47:          Player.fire('player:infoengaged');
./info/info.js:68:          Player.fire('player:infoengaged');

./protection/protection.js:39:      if(status=='verified' || status=='unprotected') Player.fire('player:protection:verified', video);
./protection/protection.js:40:      if(status=='denied') Player.fire('player:protection:denied', video);
./protection/protection.js:41:      Player.fire('player:protection:statusupdate', video);

./sections/sections.js:32:                  Player.fire('player:sectionschange');
./sections/sections.js:51:          Player.fire('player:sectionschange');

./sharing/sharing.js:54:          Player.fire('player:sharing', {});
./sharing/sharing.js:59:          Player.fire('player:sharing', {});
./sharing/sharing.js:118:          if(ss) Player.fire('player:sharing:shareengaged', {});
./sharing/sharing.js:119:          Player.fire('player:sharing', {});
./sharing/sharing.js:122:          Player.fire('player:sharing:shareengaged', {});
./sharing/sharing.liquid:5:      <input name="embed-code" type="text" value="{{embedCode|escape}}" onclick="$(this).select();" click="$fire:player:sharing:embedengaged" aria-label="{{"copy_embed"|translate}}" label="{{"copy_embed"|translate}}" tabindex="1301"/>

./slides/slides.js:90:        Player.fire("player:slides:modechange", $this.slideMode);
./slides/slides.js:128:        Player.fire("player:slides:overviewchange");
./slides/slides.js:157:        Player.fire("player:slides:init");
./slides/slides.js:173:            Player.fire("player:slides:loaded");
./slides/slides.js:176:            Player.fire("player:slides:loaded");
./slides/slides.js:180:          Player.fire("player:slides:loaded");

./subtitles/subtitles.js:44:        Player.fire('player:subtitlechange');
./subtitles/subtitles.js:65:          Player.fire('player:subtitlechange');
./subtitles/subtitles.js:72:              Player.fire("player:subtitlesactivated");
./subtitles/subtitles.js:78:          Player.fire('player:subtitlechange');
./subtitles/subtitles.js:89:          Player.fire('player:subtitlechange');
./subtitles/subtitles.js:101:          Player.fire('player:subtitlechange');

./vast/vast.js:214:      Player.fire("player:vast:"+e);
./vast/vast.js:237:      Player.fire('player:video:pause');

./video-display/video-display.js:102:              if(_v) Player.fire('player:video:loaded', _v);
./video-display/video-display.js:115:            Player.fire('player:video:' + e);
./video-display/video-display.js:252:        Player.fire('player:video:qualitychange');
./video-display/video-display.js:284:          // Otherwise fire a non-event
./video-display/video-display.js:285:          Player.fire('player:video:pause', $this.video);
./video-display/video-display.js:289:        Player.fire('player:video:ready', $this.video);
./video-display/video-display.js:349:            Player.fire('player:video:sourcechange');
./video-display/video-display.js:350:            Player.fire('player:video:qualitychange');
./video-display/video-display.js:367:                  if(playing && !Player.get('playing') && !Player.fire('player:video:beforeplay')) return false;./playflow/playflow.js:226:              Player.fire('player:playflow:video:close');
./protection/protection.js:39:      if(status=='verified' || status=='unprotected') Player.fire('player:protection:verified', video);
./protection/protection.js:40:      if(status=='denied') Player.fire('player:protection:denied', video);
./protection/protection.js:41:      Player.fire('player:protection:statusupdate', video);
./sections/sections.js:32:                  Player.fire('player:sectionschange');
./sections/sections.js:51:          Player.fire('player:sectionschange');
./sharing/sharing.js:54:          Player.fire('player:sharing', {});
./sharing/sharing.js:59:          Player.fire('player:sharing', {});
./sharing/sharing.js:118:          if(ss) Player.fire('player:sharing:shareengaged', {});
./sharing/sharing.js:119:          Player.fire('player:sharing', {});
./sharing/sharing.js:122:          Player.fire('player:sharing:shareengaged', {});
./sharing/sharing.liquid:5:      <input name="embed-code" type="text" value="{{embedCode|escape}}" onclick="$(this).select();" click="$fire:player:sharing:embedengaged" aria-label="{{"copy_embed"|translate}}" label="{{"copy_embed"|translate}}" tabindex="1301"/>
./slides/slides.js:90:        Player.fire("player:slides:modechange", $this.slideMode);
./slides/slides.js:128:        Player.fire("player:slides:overviewchange");
./slides/slides.js:157:        Player.fire("player:slides:init");
./slides/slides.js:173:            Player.fire("player:slides:loaded");
./slides/slides.js:176:            Player.fire("player:slides:loaded");
./slides/slides.js:180:          Player.fire("player:slides:loaded");
./subtitles/subtitles.js:44:        Player.fire('player:subtitlechange');
./subtitles/subtitles.js:65:          Player.fire('player:subtitlechange');
./subtitles/subtitles.js:72:              Player.fire("player:subtitlesactivated");
./subtitles/subtitles.js:78:          Player.fire('player:subtitlechange');
./subtitles/subtitles.js:89:          Player.fire('player:subtitlechange');
./subtitles/subtitles.js:101:          Player.fire('player:subtitlechange');
./vast/vast.js:214:      Player.fire("player:vast:"+e);
./vast/vast.js:237:      Player.fire('player:video:pause');
./video-display/video-display.js:102:              if(_v) Player.fire('player:video:loaded', _v);
./video-display/video-display.js:115:            Player.fire('player:video:' + e);
./video-display/video-display.js:252:        Player.fire('player:video:qualitychange');
./video-display/video-display.js:284:          // Otherwise fire a non-event
./video-display/video-display.js:285:          Player.fire('player:video:pause', $this.video);
./video-display/video-display.js:289:        Player.fire('player:video:ready', $this.video);
./video-display/video-display.js:349:            Player.fire('player:video:sourcechange');
./video-display/video-display.js:350:            Player.fire('player:video:qualitychange');
./video-display/video-display.js:367:                  if(playing && !Player.get('playing') && !Player.fire('player:video:beforeplay')) return false;
