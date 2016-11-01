var ThreeSixtyController = (function(){
  var loadInited = false,
      built = false,
      active = false,
      callback = function() {},
      onThreeLoaded = function() {};   
  
  var container, media, image, video;
  var scene, camera, renderer, stereoRenderer, activeRenderer, controls;
  var canvasCtx, texture;
  var screen;

  var maxTries = 100,
      tries = 0;

  function performCallback(success) {
    callback(success);
    callback = function() {};
    if (screen) {
      screen.fadeOut();
    }
  }
  
  function loadThree(onSuccess, onFail) {
    if (window.THREE) {
      registerCameraControls();
      onSuccess();
    } else {
      if (!loadInited) {
        loadInited = true;
        $.ajax({
          url: "/resources/um/script/threejs/three-r81-custom.min.js",
          dataType: "script"
        });
      }
      if (++tries < maxTries) {
        window.setTimeout(function() {
          loadThree(onSuccess, onFail);
        }, 200);
      } else {
        onFail();
      }
    }
  }
  
  function init(c, cb) {
    performCallback(false);

    container = c;
    callback = cb;

    if (!screen) {
      screen = $("<div class='screen-360'></div>");
      container.append(screen);
    }

    onThreeLoaded = function() {
      try {
        build();
      } catch(e) {
        performCallback(false);
      }
      performCallback(true);
    };

    if (window.THREE) {
      onThreeLoaded();
    } else if (!loadInited) {
      screen.show();
      loadThree(onThreeLoaded, function() {
        performCallback(false);
      });
    }
  }

  function build() {
    if (built) return;
    built = true;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0,0,0);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.addEventListener('mousedown', function() {
      $(renderer.domElement).addClass("mouse-dragging");
    });
    container.append(renderer.domElement);

    activeRenderer = renderer;
    stereoRenderer = new THREE.StereoEffect(renderer);

    var canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    canvasCtx = canvas.getContext("2d");

    var geometry = new THREE.SphereGeometry(2, 32, 32);
    texture = new THREE.Texture(canvas);
    var material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.FrontSide
    });
    window.sphere = new THREE.Mesh(geometry, material);
    sphere.scale.set(-1, 1, 1);
    sphere.rotation.set(0, (-90 * THREE.Math.DEG2RAD), 0);
    scene.add(sphere);

    buildButtonControls();

    controls = new THREE.CameraControls(camera, renderer.domElement, scene);

    function onFirstMouseMove(e) {
      window.removeEventListener("mousemove", onFirstMouseMove);
      var movement = 10;
      if (e.pageX / window.innerWidth < 0.5) {
        movement = -10;
      }

      var ControlsRotation = controls.getRotation();
      
      ControlsRotation.yaw -= (movement * THREE.Math.DEG2RAD);
      controls.setRotation(ControlsRotation);
      window.setTimeout(function() {
        ControlsRotation.yaw += (movement * THREE.Math.DEG2RAD);
        controls.setRotation(ControlsRotation);
      }, 500);
      
    }
    window.addEventListener("mousemove", onFirstMouseMove);

    function setOrientationControls(e) {
      window.removeEventListener('deviceorientation', setOrientationControls, true);
      if (!e.alpha) {
        return;
      }
      
      window.removeEventListener("mousemove", onFirstMouseMove);

      controls.dispose();
      container.find(".controls-360").remove();
      
      controls = new THREE.DeviceOrientationControls(controls.getObject(), true);
      controls.connect();
      controls.update();
    }

    window.addEventListener('deviceorientation', setOrientationControls, true);
  }

  function buildButtonControls() {
    var rotationControls = $(
      "<div class='controls-360'>" +
        "<div class='controls-360-up arrow' data-dimension='x' data-delta='2'></div>" +
        "<div class='controls-360-down arrow' data-dimension='x' data-delta='-2'></div>" +
        "<div class='controls-360-left arrow' data-dimension='y' data-delta='2'></div>" +
        "<div class='controls-360-right arrow' data-dimension='y' data-delta='-2'></div>" +
        "<div class='controls-360-center' data-dimension='y' data-delta='-2'>&#9679;</div>" +
      "</div>"
    );
    rotationControls.on("mousedown", ".arrow", function(){
      var $this = $(this);
      var rotationDelta = {};
      rotationDelta[$this.data("dimension")] = $this.data("delta");
      setRotationDiff(rotationDelta);
    }).on("mouseup mouseleave", function(){
      setRotationDiff();
    }).on("click", ".controls-360-center", function(){
      setRotation({ x: 0, y: 0 });
    });
    container.append(rotationControls);
  }

  function toggleVR() {
    if (activeRenderer === renderer) {
      activeRenderer = stereoRenderer;
      if (document.body.requestFullscreen) {
        document.body.requestFullscreen();
      } else if (document.body.webkitRequestFullscreen) {
        document.body.webkitRequestFullscreen();
      }
    } else {
      activeRenderer = renderer;
    }
    onResize();
  }

  var rotationInterval = 0;
  function setRotationDiff(rotation) {
    window.clearInterval(rotationInterval);
    if (rotation) {
      rotationInterval = window.setInterval(function() {
        var ControlsRotation = controls.getRotation();
        if (typeof rotation.y !== "undefined") {
          ControlsRotation.yaw += (rotation.y * THREE.Math.DEG2RAD);
        }
        if (typeof rotation.x !== "undefined") {
          ControlsRotation.pitch += (rotation.x * THREE.Math.DEG2RAD);
        }
        controls.setRotation(ControlsRotation);
      }, 40);
    }
  }
  function setRotation(rotation) {
    controls.setRotation({
      yaw: 0,
      pitch: 0
    });
  };

  function onResize() {
    if (built) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderOnce();
    }
  }
  $(window).resize(onResize);

  function onMouseup() {
    if (built) {
      $(renderer.domElement).removeClass("mouse-dragging");
    }
  }
  $(window).mouseup(onMouseup);

  function isSupported() {
    try {
        var canvas = document.createElement("canvas");
        return !!
            window.WebGLRenderingContext && 
            (canvas.getContext("webgl") || 
                canvas.getContext("experimental-webgl"));
    } catch(e) { 
        return false;
    }
  }

  function resetVars() {
    built = active = false;
    callback = function() {};
    onThreeLoaded = function() {};
    container = video = null;
    scene, camera, renderer, stereoRenderer, activeRenderer, controls = null;
    canvasCtx, texture = null;
  }

  function destroy() {
    performCallback(false);
    pause();
    if (built && renderer && renderer.domElement) {
      $(renderer.domElement).remove();
    }
    resetVars();
  }

  function start() {
    if (!active) {
      active = true;
      render();
    }
  }
  
  function pause() {
    active = false;
  }

  function renderImage(imgSrc) {
    var image = document.createElement("img");
    image.src = imgSrc;
    media = image;
    start();
  }

  function renderVideo(v) {
    media = v[0];
    start();
  }

  function renderOnce() {
    if (built) {
      canvasCtx.drawImage(media, 0, 0, canvasCtx.canvas.width, canvasCtx.canvas.height);
      texture.needsUpdate = true;

      controls.update();
      
      activeRenderer.render(scene, camera);
    }
  }

  function render() {
    if (active) {
      requestAnimationFrame(render);
      renderOnce();
    }
  }

  return {
    init: init,
    destroy: destroy,
    renderImage: renderImage,
    renderVideo: renderVideo,
    toggleVR: toggleVR,
    isSupported: isSupported
  };
})();

function registerCameraControls() {
  THREE.CameraControls = function(camera, domElement, scene) {

    var scope = this;

    camera.rotation.set( 0, 0, 0 );
    
    var active = false;
    var mouse = new THREE.Vector2();

    var pitchObject = new THREE.Object3D();
    pitchObject.add(camera);

    var yawObject = new THREE.Object3D();
    yawObject.add(pitchObject);

    scene.add(yawObject);

    var initialPitch = 0, initialYaw = 0;
    var goalPitch = 0, goalYaw = 0;
    
    function onMouseDown(e) {
      active = true;
      
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = e.clientY / window.innerHeight;

      initialPitch = pitchObject.rotation.x;
      initialYaw = yawObject.rotation.y;
    }
    
    function onMouseUp(e) {
      active = false;
    }
    
    function onMouseMove(e) {
      if (active) {
        var diffX = (e.clientX / window.innerWidth) - mouse.x;
        var diffY = (e.clientY / window.innerHeight) - mouse.y;

        var yaw = initialYaw + (diffX * 180 * THREE.Math.DEG2RAD);
        var pitch = initialPitch + (diffY * 180 * THREE.Math.DEG2RAD);

        scope.setRotation({
          yaw: yaw,
          pitch: pitch
        });
      }
    }
    
    domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    scope.dispose = function() {
      active = false;
      pitchObject.rotation.x = 0;
      yawObject.rotation.y = 0;
      
      domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };

    scope.reset = function() {
      pitchObject.rotation.x = 0;
      yawObject.rotation.y = 0;
    };

    scope.getObject = function() {
      return yawObject;
    };

    scope.getRotation = function() {
      return {
        yaw: goalYaw,
        pitch: goalPitch
      };
    };

    scope.setRotation = function(rotation) {
      rotation.pitch = Math.max(-90 * THREE.Math.DEG2RAD, rotation.pitch);
      rotation.pitch = Math.min(90 * THREE.Math.DEG2RAD, rotation.pitch);

      goalYaw = rotation.yaw;
      goalPitch = rotation.pitch;
    };

    scope.update = function() {
      yawObject.rotation.y += (goalYaw - yawObject.rotation.y) * 0.2;
      pitchObject.rotation.x += (goalPitch - pitchObject.rotation.x) * 0.2;
    };

    return scope;
    
  };
}
