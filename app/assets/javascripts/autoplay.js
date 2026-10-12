/* Chart-based autoplay. The reference clip is analysed in the browser for the Launchpad's orange pressed-pad glow. */
(function ($) {
  "use strict";

  var videoUrl = "https://raw.githubusercontent.com/ryan4202009/Launchpad/master/videoplayback.mp4";
  var state = { chart: [], timer: null, playing: false, startedAt: 0, index: 0, speed: 1, duration: 0, scanToken: 0 };
  var keyCodes = [49,50,51,52,53,54,55,56,57,48,189,187,81,87,69,82,84,89,85,73,79,80,219,221,65,83,68,70,71,72,74,75,76,186,222,13,90,88,67,86,66,78,77,188,190,191,16,-1];

  function buildUI() {
    if ($("#autoplay_panel").length) return;
    var css = '<style id="autoplay_styles">' +
      '#autoplay_panel{margin:18px auto;padding:14px;max-width:760px;background:#181818;color:#f4f4f4;border:1px solid #444;border-radius:10px;font:14px Arial,sans-serif;box-sizing:border-box}' +
      '#autoplay_panel h3{margin:0 0 10px;font-size:18px}#autoplay_panel .ap-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:9px 0}' +
      '#autoplay_panel button,#autoplay_panel select{border:0;border-radius:5px;padding:8px 12px;cursor:pointer;font-weight:600}' +
      '#autoplay_panel button{background:#ff9d00;color:#171717}#autoplay_panel button:disabled{opacity:.5;cursor:not-allowed}' +
      '#autoplay_panel input[type=range]{width:150px}#autoplay_status{color:#ffbd55;min-height:18px}#autoplay_help{color:#bbb;font-size:12px;line-height:1.45}' +
      '</style>';
    $("head").append(css);
    $(".buttons").after('<section id="autoplay_panel"><h3>Chart Autoplay</h3>' +
      '<div class="ap-row"><button id="ap_analyse">Analyse reference video</button><button id="ap_play" disabled>▶ Play chart</button><button id="ap_stop" disabled>■ Stop</button>' +
      '<label>Speed <select id="ap_speed"><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label></div>' +
      '<div class="ap-row"><label>Grid left <input id="ap_left" type="range" min="0" max="50" value="4"></label>' +
      '<label>Top <input id="ap_top" type="range" min="0" max="50" value="8"></label>' +
      '<label>Width <input id="ap_width" type="range" min="40" max="100" value="92"></label>' +
      '<label>Height <input id="ap_height" type="range" min="30" max="100" value="82"></label></div>' +
      '<div id="autoplay_status">Ready. Analyse the clip to build a chart from the orange pad flashes.</div>' +
      '<p id="autoplay_help">The analyzer samples the video for orange pressed-pad glows. If the detected grid is offset, adjust the grid bounds and analyse again. The chart triggers the actual Launchpad keys, so the website sounds and orange pressed effect are used.</p>' +
      '<video id="ap_reference_video" crossorigin="anonymous" preload="auto" playsinline style="display:none"></video></section>');
    $("#ap_reference_video").attr("src", videoUrl);
    $("#ap_analyse").on("click", analyseVideo);
    $("#ap_play").on("click", play);
    $("#ap_stop").on("click", stop);
    $("#ap_speed").on("change", function(){ state.speed = parseFloat(this.value) || 1; });
  }

  function status(message) { $("#autoplay_status").text(message); }
  function isOrange(r,g,b) { return r > 175 && g > 65 && g < 205 && b < 95 && r > g * 1.18; }

  function analyseVideo() {
    var video = document.getElementById("ap_reference_video");
    var canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });
    var token = ++state.scanToken;
    state.chart = [];
    $("#ap_analyse,#ap_play").prop("disabled", true);
    status("Loading reference clip…");
    video.onerror = function(){ if(token === state.scanToken) { status("Could not load the reference video in this browser. Check that the clip is public in the GitHub repo."); $("#ap_analyse").prop("disabled", false); } };
    video.onloadedmetadata = function() {
      if(token !== state.scanToken) return;
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      var fps = 30, total = Math.floor(video.duration * fps), frame = 0;
      var left = parseFloat($("#ap_left").val())/100, top = parseFloat($("#ap_top").val())/100;
      var width = parseFloat($("#ap_width").val())/100, height = parseFloat($("#ap_height").val())/100;
      var x0 = Math.floor(canvas.width*left), y0 = Math.floor(canvas.height*top);
      var gw = Math.floor(canvas.width*width), gh = Math.floor(canvas.height*height);
      var cellW = gw/12, cellH = gh/4, previous = {};
      status("Scanning video frames… 0%");
      function scanNext() {
        if(token !== state.scanToken) return;
        if(frame >= total) {
          state.duration = video.duration;
          state.chart.sort(function(a,b){return a.time-b.time || a.pad-b.pad;});
          $("#ap_analyse").prop("disabled", false);
          $("#ap_play").prop("disabled", !state.chart.length);
          status(state.chart.length ? "Chart ready: "+state.chart.length+" pad hits detected. Adjust speed and press Play." : "No orange pad flashes detected. Adjust the grid bounds and analyse again.");
          return;
        }
        function captureFrame() {
          if(token !== state.scanToken) return;
          try {
            ctx.drawImage(video,0,0,canvas.width,canvas.height);
            var data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
            for(var pad=0; pad<48; pad++) {
              var row = Math.floor(pad/12), col = pad%12;
              var sx = Math.floor(x0+col*cellW+cellW*.18), ex = Math.floor(x0+(col+1)*cellW-cellW*.18);
              var sy = Math.floor(y0+row*cellH+cellH*.18), ey = Math.floor(y0+(row+1)*cellH-cellH*.18);
              var hits=0, samples=0, stepX=Math.max(1,Math.floor((ex-sx)/12)), stepY=Math.max(1,Math.floor((ey-sy)/10));
              for(var y=sy;y<ey;y+=stepY) for(var x=sx;x<ex;x+=stepX) {
                var p=(y*canvas.width+x)*4; samples++;
                if(isOrange(data[p],data[p+1],data[p+2])) hits++;
              }
              var active = samples && hits/samples > 0.12;
              if(active && !previous[pad]) state.chart.push({time:frame/fps,pad:pad});
              previous[pad] = !!active;
            }
          } catch(e) {
            state.scanToken++;
            $("#ap_analyse").prop("disabled", false);
            status("Video frame access was blocked by the browser. The clip must allow cross-origin canvas access.");
            return;
          }
          frame++;
          if(frame%45===0) status("Scanning video frames… "+Math.round(frame/total*100)+"%");
          if(frame%3===0) setTimeout(scanNext,0); else scanNext();
        }
        var targetTime = Math.min(frame/fps, Math.max(0, video.duration-0.001));
        if(frame === 0 && Math.abs(video.currentTime-targetTime) < 0.0001) {
          captureFrame();
        } else {
          video.onseeked = captureFrame;
          video.currentTime = targetTime;
        }
      }
      scanNext();
    };
    if(video.readyState >= 1 && video.duration) video.onloadedmetadata();
    else video.load();
  }

  function releaseAll() {
    if(!window.keyboard || !window.keyPairs) return;
    for(var i=0;i<48;i++) {
      try { window.keyboard.releaseKey(keyCodes[i]); } catch(e) {}
    }
  }
  function stop() {
    state.playing = false;
    if(state.timer) clearTimeout(state.timer);
    state.timer = null;
    releaseAll();
    $("#ap_play").prop("disabled", !state.chart.length);
    $("#ap_stop").prop("disabled", true);
    status("Stopped.");
  }
  function play() {
    if(!state.chart.length || !window.keyboard) { status("The pad keyboard is not ready yet."); return; }
    stop();
    state.playing = true; state.index = 0; state.startedAt = Date.now();
    $("#ap_play").prop("disabled", true); $("#ap_stop").prop("disabled", false);
    function tick() {
      if(!state.playing) return;
      var elapsed = (Date.now()-state.startedAt)/1000*state.speed;
      while(state.index < state.chart.length && state.chart[state.index].time <= elapsed) {
        var event = state.chart[state.index++];
        window.keyboard.playKey(keyCodes[event.pad]);
        (function(kc){ setTimeout(function(){ if(window.keyboard) window.keyboard.releaseKey(kc); }, Math.max(70, 130/state.speed)); })(keyCodes[event.pad]);
      }
      if(state.index >= state.chart.length) { stop(); status("Chart finished."); return; }
      state.timer = setTimeout(tick, 8);
    }
    tick();
  }

  $(document).on("turbolinks:load", buildUI);
  $(buildUI);
})(jQuery);
