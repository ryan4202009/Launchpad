/* Chart-based autoplay. Detects the reference video's orange pressed-pad flashes. */
(function ($) {
  "use strict";

  var videoUrl = "https://raw.githubusercontent.com/ryan4202009/Launchpad/master/videoplayback.mp4";
  var defaultClipStartSeconds = 124;
  var state = {
    chart: [], timer: null, playing: false, startedAt: 0, index: 0,
    speed: 1, duration: 0, clipStartSeconds: defaultClipStartSeconds,
    scanToken: 0, releaseTimers: {}
  };
  var fallbackKeyCodes = [
    49,50,51,52,53,54,55,56,57,48,189,187,
    81,87,69,82,84,89,85,73,79,80,219,221,
    65,83,68,70,71,72,74,75,76,186,222,13,
    90,88,67,86,66,78,77,188,190,191,16,-1
  ];

  function buildUI() {
    if ($("#autoplay_panel").length || !$(".buttons").length) return;

    var css = '<style id="autoplay_styles">' +
      '#autoplay_panel{margin:18px auto;padding:14px;max-width:900px;background:#181818;color:#f4f4f4;border:1px solid #444;border-radius:10px;font:14px Arial,sans-serif;box-sizing:border-box}' +
      '#autoplay_panel h3{margin:0 0 10px;font-size:18px}#autoplay_panel .ap-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:9px 0}' +
      '#autoplay_panel button,#autoplay_panel select,#autoplay_panel input[type=number]{border:0;border-radius:5px;padding:8px 10px;font-weight:600;box-sizing:border-box}' +
      '#autoplay_panel button{cursor:pointer;background:#ff9d00;color:#171717}#autoplay_panel button:disabled{opacity:.5;cursor:not-allowed}' +
      '#autoplay_panel input[type=range]{width:115px;vertical-align:middle}#autoplay_panel input[type=number]{width:82px}' +
      '#ap_video_stage{position:relative;width:min(100%,840px);margin:12px auto 4px;line-height:0}' +
      '#ap_reference_video{display:block;width:100%;height:auto;background:#080808;border-radius:5px}' +
      '#ap_grid_overlay{position:absolute;border:2px solid rgba(255,90,40,.95);box-sizing:border-box;pointer-events:none;background-image:repeating-linear-gradient(to right,transparent 0,transparent calc(8.333333% - 1px),rgba(255,90,40,.7) calc(8.333333% - 1px),rgba(255,90,40,.7) 8.333333%),repeating-linear-gradient(to bottom,transparent 0,transparent calc(25% - 1px),rgba(255,90,40,.7) calc(25% - 1px),rgba(255,90,40,.7) 25%)}' +
      '#autoplay_status{color:#ffbd55;min-height:18px}#autoplay_help{color:#bbb;font-size:12px;line-height:1.45;margin-bottom:0}' +
      '</style>';

    $("head").append(css);
    $(".buttons").after(
      '<section id="autoplay_panel"><h3>Chart Autoplay</h3>' +
      '<div class="ap-row"><button id="ap_analyse">Analyse reference video</button><button id="ap_play" disabled>▶ Play chart</button><button id="ap_stop" disabled>■ Stop</button>' +
      '<label>Speed <select id="ap_speed"><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label>' +
      '<label>Video start (sec) <input id="ap_start" type="number" min="0" step="0.1" value="124"></label></div>' +
      '<div class="ap-row"><label>Grid left <input id="ap_left" type="range" min="0" max="50" value="17"></label>' +
      '<label>Top <input id="ap_top" type="range" min="0" max="50" value="20"></label>' +
      '<label>Width <input id="ap_width" type="range" min="40" max="100" value="66"></label>' +
      '<label>Height <input id="ap_height" type="range" min="30" max="100" value="40"></label>' +
      '<label>Sensitivity <input id="ap_sensitivity" type="range" min="4" max="25" value="8"><span id="ap_sensitivity_value">8%</span></label></div>' +
      '<div id="autoplay_status">Reference: YouTube at 2:04. The orange outline shows the pad area being analysed.</div>' +
      '<p id="autoplay_help">The analyser detects orange flashes inside each of the 48 pad cells. The orange grid overlay shows exactly which area is scanned. This uses your repo’s MP4 copy because a YouTube player itself cannot be read by the page’s canvas analyser. Playback triggers the website’s real pad functions.</p><p style="margin:8px 0"><a href="https://www.youtube.com/watch?v=W1kkVe_lWD4&amp;t=124s" target="_blank" rel="noopener noreferrer">Open the original YouTube reference at 2:04</a></p>' +
      '<div id="ap_video_stage"><video id="ap_reference_video" crossorigin="anonymous" preload="metadata" playsinline controls></video><div id="ap_grid_overlay"></div></div></section>'
    );

    var video = document.getElementById("ap_reference_video");
    video.muted = true;
    video.crossOrigin = "anonymous";
    video.src = videoUrl;
    video.load();

    function updateGridOverlay() {
      var left = parseFloat($("#ap_left").val()) || 0;
      var top = parseFloat($("#ap_top").val()) || 0;
      var width = parseFloat($("#ap_width").val()) || 0;
      var height = parseFloat($("#ap_height").val()) || 0;
      $("#ap_grid_overlay").css({
        left: left + "%", top: top + "%", width: width + "%", height: height + "%"
      });
    }
    $("#ap_left,#ap_top,#ap_width,#ap_height").on("input change", updateGridOverlay);
    updateGridOverlay();

    $("#ap_analyse").on("click", analyseVideo);
    $("#ap_play").on("click", play);
    $("#ap_stop").on("click", stop);
    $("#ap_speed").on("change", function () {
      state.speed = parseFloat(this.value) || 1;
    });
    $("#ap_sensitivity").on("input change", function () {
      $("#ap_sensitivity_value").text(this.value + "%");
    });
  }

  function status(message) {
    $("#autoplay_status").text(message);
  }

  function formatTime(seconds) {
    var m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function isOrange(r, g, b) {
    return r > 175 && g > 65 && g < 215 && b < 110 && r > g * 1.16 && (r - b) > 70;
  }

  function analyseVideo() {
    var video = document.getElementById("ap_reference_video");
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    var token = ++state.scanToken;
    var raf = null;
    var metadataHandled = false;
    var previous = {};
    var lastHitAt = {};
    var activeEvents = {};
    var startValue = parseFloat($("#ap_start").val());
    var clipStartSeconds = isFinite(startValue) && startValue >= 0 ? startValue : defaultClipStartSeconds;
    state.clipStartSeconds = clipStartSeconds;
    state.chart = [];

    $("#ap_analyse,#ap_play").prop("disabled", true);
    status("Loading reference clip…");

    function fail(message) {
      if (token !== state.scanToken) return;
      if (raf !== null) cancelAnimationFrame(raf);
      video.pause();
      video.playbackRate = 1;
      $("#ap_analyse").prop("disabled", false);
      $("#ap_play").prop("disabled", !state.chart.length);
      status(message);
    }

    video.onerror = function () {
      fail("Could not load videoplayback.mp4 from GitHub. Check that the repo and MP4 are public.");
    };

    video.onloadedmetadata = function () {
      if (token !== state.scanToken || metadataHandled) return;
      metadataHandled = true;

      if (!isFinite(video.duration) || video.duration <= clipStartSeconds) {
        fail("The MP4 is " + formatTime(video.duration || 0) + " long. Set Video start to a value below that, then analyse again.");
        return;
      }

      // Downscale very large videos before reading pixels to keep analysis responsive.
      var scale = Math.min(1, 960 / video.videoWidth);
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      if (!canvas.width || !canvas.height) {
        fail("The browser could not read the video's dimensions. Try reloading the page and analysing again.");
        return;
      }

      var left = parseFloat($("#ap_left").val()) / 100;
      var top = parseFloat($("#ap_top").val()) / 100;
      var width = parseFloat($("#ap_width").val()) / 100;
      var height = parseFloat($("#ap_height").val()) / 100;
      var x0 = Math.max(0, Math.min(canvas.width - 1, Math.floor(canvas.width * left)));
      var y0 = Math.max(0, Math.min(canvas.height - 1, Math.floor(canvas.height * top)));
      var gw = Math.max(1, Math.min(canvas.width - x0, Math.floor(canvas.width * width)));
      var gh = Math.max(1, Math.min(canvas.height - y0, Math.floor(canvas.height * height)));
      var cellW = gw / 12;
      var cellH = gh / 4;
      var lastSampleTime = -1;
      var sampleInterval = 1 / 30;
      var sensitivity = (parseFloat($("#ap_sensitivity").val()) || 8) / 100;

      function scanFrame() {
        if (token !== state.scanToken) return;

        var now = video.currentTime;
        if (now >= video.duration - 0.04) {
          video.pause();
          video.playbackRate = 1;
          state.duration = video.duration - clipStartSeconds;
          // If a pad is still orange at the very end, close its measured press at the clip end.
          Object.keys(activeEvents).forEach(function (padKey) {
            var openEvent = activeEvents[padKey];
            openEvent.duration = Math.max(0.04, Math.min(1.5, state.duration - openEvent.time));
          });
          state.chart.sort(function (a, b) { return a.time - b.time || a.pad - b.pad; });
          $("#ap_analyse").prop("disabled", false);
          $("#ap_play").prop("disabled", !state.chart.length);
          status(state.chart.length
            ? "Chart ready: " + state.chart.length + " hits from " + formatTime(clipStartSeconds) + " onward. Set speed and press Play."
            : "No pad flashes detected. Adjust Grid left/Top/Width/Height or lower Sensitivity, then analyse again.");
          return;
        }

        if (now >= clipStartSeconds && (lastSampleTime < 0 || now - lastSampleTime >= sampleInterval * 0.98)) {
          lastSampleTime = now;
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            for (var pad = 0; pad < 48; pad++) {
              var row = Math.floor(pad / 12), col = pad % 12;
              // Avoid pad edges, labels and the gaps between pads.
              var sx = Math.floor(x0 + col * cellW + cellW * 0.18);
              var ex = Math.floor(x0 + (col + 1) * cellW - cellW * 0.18);
              var sy = Math.floor(y0 + row * cellH + cellH * 0.18);
              var ey = Math.floor(y0 + (row + 1) * cellH - cellH * 0.18);
              var hits = 0, samples = 0;
              var stepX = Math.max(1, Math.floor((ex - sx) / 12));
              var stepY = Math.max(1, Math.floor((ey - sy) / 10));

              for (var y = sy; y < ey; y += stepY) {
                for (var x = sx; x < ex; x += stepX) {
                  var p = (y * canvas.width + x) * 4;
                  samples++;
                  if (isOrange(data[p], data[p + 1], data[p + 2])) hits++;
                }
              }

              var active = samples > 0 && (hits / samples) >= sensitivity;
              if (active && !previous[pad]) {
                // A new orange transition marks a fresh pad press.
                if (lastHitAt[pad] === undefined || now - lastHitAt[pad] >= 0.065) {
                  var pressEvent = {
                    time: Math.max(0, now - clipStartSeconds),
                    pad: pad,
                    duration: 0.10
                  };
                  state.chart.push(pressEvent);
                  activeEvents[pad] = pressEvent;
                  lastHitAt[pad] = now;
                }
              } else if (!active && previous[pad] && activeEvents[pad]) {
                // Keep the observed orange-on time instead of forcing every pad to 130 ms.
                activeEvents[pad].duration = Math.max(
                  0.025,
                  Math.min(1.5, Math.max(0, now - clipStartSeconds - activeEvents[pad].time))
                );
                delete activeEvents[pad];
              }
              previous[pad] = !!active;
            }
          } catch (e) {
            fail("Browser blocked video-frame analysis (canvas/CORS). The MP4 must be publicly accessible on GitHub.");
            return;
          }

          var progress = Math.max(0, Math.min(100, Math.round((now - clipStartSeconds) / (video.duration - clipStartSeconds) * 100)));
          status("Scanning video frames… " + progress + "%");
        }

        raf = requestAnimationFrame(scanFrame);
      }

      video.pause();
      video.playbackRate = 1.5;
      video.onseeked = function () {
        if (token !== state.scanToken) return;
        video.onseeked = null;
        var startPromise = video.play();
        if (startPromise && startPromise.then) {
          startPromise.then(function () {
            if (token === state.scanToken) raf = requestAnimationFrame(scanFrame);
          }).catch(function () {
            fail("Could not start video analysis. Press Analyse again and allow video playback.");
          });
        } else {
          raf = requestAnimationFrame(scanFrame);
        }
      };
      video.currentTime = clipStartSeconds;
    };

    if (video.readyState >= 1 && video.duration) video.onloadedmetadata();
    else video.load();
  }

  function keyCodeForPad(pad) {
    // Prefer the website's actual mapping, including its browser-specific fallback.
    if (window.keyPairs && window.keyPairs[pad] !== undefined) return window.keyPairs[pad];
    return fallbackKeyCodes[pad];
  }

  function releaseAll() {
    Object.keys(state.releaseTimers).forEach(function (kc) {
      clearTimeout(state.releaseTimers[kc]);
      delete state.releaseTimers[kc];
    });
    if (!window.keyboard || typeof window.keyboard.releaseKey !== "function") return;
    for (var i = 0; i < 48; i++) {
      try { window.keyboard.releaseKey(keyCodeForPad(i)); } catch (e) {}
    }
  }

  function stop(silent) {
    state.playing = false;
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
    releaseAll();
    $("#ap_play").prop("disabled", !state.chart.length);
    $("#ap_stop").prop("disabled", true);
    if (!silent) status("Stopped.");
  }

  function play() {
    if (!state.chart.length || !window.keyboard ||
        typeof window.keyboard.playKey !== "function" ||
        typeof window.keyboard.releaseKey !== "function") {
      status("The pad keyboard is still loading. Wait for the sound pack to finish, then press Play.");
      return;
    }

    stop(true);
    state.speed = parseFloat($("#ap_speed").val()) || 1;
    state.playing = true;
    state.index = 0;
    state.startedAt = Date.now();
    var finishAt = state.chart[state.chart.length - 1].time + 0.22;

    $("#ap_play").prop("disabled", true);
    $("#ap_stop").prop("disabled", false);
    status("Playing " + state.chart.length + " pad hits at " + state.speed + "× speed…");

    function tick() {
      if (!state.playing) return;

      var elapsed = (Date.now() - state.startedAt) / 1000 * state.speed;
      while (state.index < state.chart.length && state.chart[state.index].time <= elapsed) {
        var event = state.chart[state.index++];
        var keyCode = keyCodeForPad(event.pad);
        if (state.releaseTimers[keyCode]) clearTimeout(state.releaseTimers[keyCode]);

        try {
          window.keyboard.playKey(keyCode);
          (function (kc) {
            state.releaseTimers[kc] = setTimeout(function () {
              delete state.releaseTimers[kc];
              if (window.keyboard) window.keyboard.releaseKey(kc);
            }, Math.max(25, ((isFinite(event.duration) ? event.duration : 0.10) * 1000) / state.speed));
          })(keyCode);
        } catch (e) {
          stop(true);
          status("Playback hit an error while triggering a pad. Reload the page after the sound pack finishes loading.");
          return;
        }
      }

      // Keep the final note alive long enough to hear it; the old code stopped
      // on the same tick as the last press and could instantly cut that note off.
      if (state.index >= state.chart.length && elapsed >= finishAt) {
        stop(true);
        status("Chart finished.");
        return;
      }
      state.timer = setTimeout(tick, 5);
    }

    tick();
  }

  $(document).on("turbolinks:load", buildUI);
  $(buildUI);
})(jQuery);
