/* Compact built-in autoplay player for First of the Year. */
(function ($, window) {
  "use strict";
  var state = { entries: [], timer: null, playing: false, paused: false, speed: 1,
    startedAt: 0, pausedAt: 0, offsetSeconds: 0, index: 0, releaseTimers: {}, currentPack: null };

  var fallbackKeyCodes = [49,50,51,52,53,54,55,56,57,48,189,187,81,87,69,82,84,89,85,73,79,80,219,221,65,83,68,70,71,72,74,75,76,186,222,13,90,88,67,86,66,78,77,188,190,191,16,-1];

  function buildEntries() {
    var chart = window.LAUNCHPAD_REFERENCE_CHART;
    if (!chart || !chart.notes || !chart.notes.length) return [];
    var entries = [];
    (chart.packChanges || []).forEach(function (c) { entries.push({frame:c[0], kind:0, pack:c[1]}); });
    chart.notes.forEach(function (n) { entries.push({frame:n.frame, kind:1, pad:n.pad, durationFrames:n.durationFrames}); });
    entries.sort(function(a,b){ return a.frame-b.frame || a.kind-b.kind || (a.pad||0)-(b.pad||0); });
    return entries;
  }
  function keyCodeForPad(pad) {
    if (window.keyPairs && window.keyPairs[pad] !== undefined) return window.keyPairs[pad];
    return fallbackKeyCodes[pad];
  }
  function status(message) { $("#autoplayer_status").text(message); }
  function clearTimer() { if (state.timer) clearTimeout(state.timer); state.timer = null; }
  function clearReleaseTimers() {
    Object.keys(state.releaseTimers).forEach(function(k){ clearTimeout(state.releaseTimers[k]); delete state.releaseTimers[k]; });
  }
  function releaseAll() {
    clearReleaseTimers();
    if (!window.keyboard || typeof window.keyboard.releaseKey !== "function") return;
    for (var i=0;i<48;i++) { try { window.keyboard.releaseKey(keyCodeForPad(i)); } catch(e) {} }
  }
  function switchPack(pack) {
    if (!window.keyboard || typeof window.keyboard.switchSoundPack !== "function" || state.currentPack === pack) return;
    clearReleaseTimers();
    window.keyboard.switchSoundPack(pack);
    state.currentPack = pack;
  }
  function setButtons() {
    $("#ap_play").prop("disabled", state.playing);
    $("#ap_pause").prop("disabled", !state.playing);
  }
  function stopPlayback() {
    state.playing = false; state.paused = false; clearTimer(); releaseAll();
    window.LAUNCHPAD_AUTOPLAY_ACTIVE = false;
    setButtons();
  }
  function startFromOffset(offset) {
    var chart = window.LAUNCHPAD_REFERENCE_CHART;
    if (!state.entries.length || !window.keyboard || typeof window.keyboard.playKey !== "function" ||
        typeof window.keyboard.releaseKey !== "function" || typeof window.keyboard.switchSoundPack !== "function" ||
        $(".button").length < 48 || /loading/i.test($(".soundPack").text())) {
      status("Wait for all Launchpad sounds to load, then press Play."); return;
    }
    stopPlayback();
    state.offsetSeconds = Math.max(0, offset || 0);
    state.index = 0;
    var fps = chart.fps || 30;
    while (state.index < state.entries.length && state.entries[state.index].frame < state.offsetSeconds * fps) state.index++;
    state.currentPack = null;
    switchPack(chart.initialPack || 0);
    state.playing = true; state.paused = false;
    state.startedAt = Date.now() - state.offsetSeconds * 1000 / state.speed;
    window.LAUNCHPAD_AUTOPLAY_ACTIVE = true;
    setButtons();
    status("Playing at " + state.speed.toFixed(2).replace(/0+$/,"").replace(/\.$/,"") + "×");
    tick();
  }
  function play() {
    if (state.paused) {
      state.playing = true; state.paused = false;
      state.startedAt = Date.now() - state.pausedAt * 1000 / state.speed;
      window.LAUNCHPAD_AUTOPLAY_ACTIVE = true; setButtons(); status("Playing"); tick();
    } else if (!state.playing) startFromOffset(0);
  }
  function pause() {
    if (!state.playing) return;
    state.pausedAt = (Date.now() - state.startedAt) / 1000 * state.speed;
    state.playing = false; state.paused = true; clearTimer(); releaseAll();
    window.LAUNCHPAD_AUTOPLAY_ACTIVE = false; setButtons(); status("Paused");
  }
  function rewind() {
    stopPlayback(); state.index = 0; state.offsetSeconds = 0; state.pausedAt = 0;
    state.currentPack = null; switchPack((window.LAUNCHPAD_REFERENCE_CHART || {}).initialPack || 0);
    status("Rewound to the beginning");
  }
  function tick() {
    if (!state.playing) return;
    var chart = window.LAUNCHPAD_REFERENCE_CHART, fps = chart.fps || 30;
    var elapsedFrame = ((Date.now() - state.startedAt) / 1000) * state.speed * fps;
    var burst = 0;
    // Drain due chart events in order, but cap each batch so a delayed browser frame
    // cannot monopolize the main thread and make the audio/pad UI hitch.
    while (state.index < state.entries.length && state.entries[state.index].frame <= elapsedFrame && burst < 80) {
      var ev = state.entries[state.index++]; burst++;
      if (ev.kind === 0) { switchPack(ev.pack); continue; }
      var kc = keyCodeForPad(ev.pad);
      if (state.releaseTimers[kc]) { clearTimeout(state.releaseTimers[kc]); delete state.releaseTimers[kc]; }
      try {
        window.keyboard.playKey(kc);
        (function(keyCode, holdFrames, speed) {
          state.releaseTimers[keyCode] = setTimeout(function() {
            delete state.releaseTimers[keyCode];
            if (window.keyboard) window.keyboard.releaseKey(keyCode);
          }, Math.max(45, (holdFrames / fps) * 1000 / speed));
        })(kc, ev.durationFrames, state.speed);
      } catch(e) { stopPlayback(); status("Playback stopped: a pad failed to trigger."); return; }
    }
    if (state.index >= state.entries.length) {
      var last = state.entries[state.entries.length - 1];
      if (elapsedFrame >= last.frame + (last.durationFrames || 1) + 3) {
        stopPlayback(); status("Performance finished"); return;
      }
    }
    state.timer = setTimeout(tick, burst >= 80 ? 0 : 6);
  }
  function buildUI() {
    if ($("#autoplayer_panel").length || !$(".buttons").length) return;
    $("head").append('<style id="autoplayer_styles">#autoplayer_panel{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;max-width:840px;margin:18px auto;padding:12px 16px;background:#171717;color:#f7f7f7;border:1px solid #3b3b3b;border-radius:9px;font:14px Arial,sans-serif;box-sizing:border-box}#autoplayer_panel .ap-title{font-size:16px;font-weight:700;margin-right:4px}#autoplayer_panel button{border:0;border-radius:5px;background:#ffa000;color:#171717;padding:9px 15px;font-weight:700;cursor:pointer}#autoplayer_panel button:disabled{opacity:.45;cursor:default}#autoplayer_panel label{white-space:nowrap}#ap_speed{width:150px;accent-color:#ffa000}#ap_speed_value{min-width:42px;color:#ffbd55;font-weight:700}#autoplayer_status{flex-basis:100%;font-size:12px;color:#c7c7c7;text-align:center;min-height:14px}</style>');
    $(".buttons").after('<section id="autoplayer_panel" aria-label="Autoplayer controls"><span class="ap-title">Autoplayer - First of the year</span><button type="button" id="ap_play">▶ Play</button><button type="button" id="ap_pause" disabled>Ⅱ Pause</button><button type="button" id="ap_rewind">↶ Rewind</button><label for="ap_speed">Speed</label><input id="ap_speed" type="range" min="0.25" max="2" step="0.25" value="1"><span id="ap_speed_value">1×</span><div id="autoplayer_status"></div></section>');
    state.entries = buildEntries();
    $("#ap_play").on("click", play); $("#ap_pause").on("click", pause); $("#ap_rewind").on("click", rewind);
    $("#ap_speed").on("input change", function() {
      var next = parseFloat(this.value) || 1;
      if (state.playing) {
        var position = (Date.now() - state.startedAt) / 1000 * state.speed;
        state.speed = next; state.startedAt = Date.now() - position * 1000 / state.speed;
      } else state.speed = next;
      $("#ap_speed_value").text(state.speed.toFixed(2).replace(/0+$/,"").replace(/\.$/,"") + "×");
    });
    status(state.entries.length ? "Ready" : "Chart failed to load — refresh the page");
  }
  $(document).on("turbolinks:load", buildUI);
  $(buildUI);
})(jQuery, window);
