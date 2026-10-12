/* Built-in Launchpad performance player. The chart is stored in autoplayChartData.js;
 * no video is loaded, embedded, or scanned by the website.
 */
(function ($, window) {
  "use strict";

  var state = {
    entries: null,
    timer: null,
    playing: false,
    startedAt: 0,
    index: 0,
    speed: 1,
    releaseTimers: {},
    currentPack: null
  };

  var fallbackKeyCodes = [
    49,50,51,52,53,54,55,56,57,48,189,187,
    81,87,69,82,84,89,85,73,79,80,219,221,
    65,83,68,70,71,72,74,75,76,186,222,13,
    90,88,67,86,66,78,77,188,190,191,16,-1
  ];

  function buildEntries() {
    var chart = window.LAUNCHPAD_REFERENCE_CHART;
    if (!chart || !chart.notes || !chart.notes.length) return [];

    var entries = [];
    chart.packChanges.forEach(function (change) {
      entries.push({
        frame: change[0],
        kind: 0,
        pack: change[1]
      });
    });
    chart.notes.forEach(function (note) {
      entries.push({
        frame: note.frame,
        kind: 1,
        pad: note.pad,
        durationFrames: note.durationFrames
      });
    });

    // Pack changes at a timestamp must be applied before any pad hit at that time.
    entries.sort(function (a, b) {
      return a.frame - b.frame || a.kind - b.kind || (a.pad || 0) - (b.pad || 0);
    });
    return entries;
  }

  function buildUI() {
    if ($("#autoplay_panel").length || !$(".buttons").length) return;

    var chart = window.LAUNCHPAD_REFERENCE_CHART;
    var count = chart ? chart.noteCount : 0;

    var css = '<style id="autoplay_styles">' +
      '#autoplay_panel{margin:18px auto;padding:16px;max-width:840px;background:#181818;color:#f4f4f4;border:1px solid #444;border-radius:10px;font:14px Arial,sans-serif;box-sizing:border-box;text-align:left}' +
      '#autoplay_panel h3{margin:0 0 8px;font-size:19px;text-align:left}' +
      '#autoplay_panel .ap-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0}' +
      '#autoplay_panel button,#autoplay_panel select{border:0;border-radius:5px;padding:9px 13px;cursor:pointer;font-weight:700}' +
      '#autoplay_panel button{background:#ff9d00;color:#171717}#autoplay_panel button:disabled{opacity:.48;cursor:not-allowed}' +
      '#autoplay_panel select{background:#fff;color:#171717}#autoplay_status{color:#ffbd55;min-height:18px}' +
      '#autoplay_help{color:#c5c5c5;font-size:12px;line-height:1.5;margin:5px 0 0}' +
      '</style>';
    $("head").append(css);

    $(".buttons").after(
      '<section id="autoplay_panel">' +
      '<h3>Performance Autoplay</h3>' +
      '<div class="ap-row"><button id="ap_play">▶ Play performance</button><button id="ap_stop" disabled>■ Stop</button>' +
      '<label for="ap_speed">Speed </label><select id="ap_speed">' +
      '<option value="0.5">0.5×</option><option value="0.75">0.75×</option>' +
      '<option value="1" selected>1×</option><option value="1.25">1.25×</option>' +
      '<option value="1.5">1.5×</option><option value="2">2×</option></select></div>' +
      '<div id="autoplay_status">' +
      (count ? 'Ready: ' + count + ' built-in pad hits from 2:04 of the reference. Press Play performance.' : 'The built-in chart did not load. Refresh the page.') +
      '</div>' +
      '<p id="autoplay_help">Plays the recorded pad sequence directly on this Launchpad. The pads light orange and use the site’s own sounds. No video player or manual analysis is involved.</p>' +
      '</section>'
    );

    state.entries = buildEntries();
    $("#ap_play").prop("disabled", !state.entries.length);
    $("#ap_play").on("click", play);
    $("#ap_stop").on("click", stop);
    $("#ap_speed").on("change", function () {
      state.speed = parseFloat(this.value) || 1;
    });
  }

  function status(message) {
    $("#autoplay_status").text(message);
  }

  function keyCodeForPad(pad) {
    if (window.keyPairs && window.keyPairs[pad] !== undefined) return window.keyPairs[pad];
    return fallbackKeyCodes[pad];
  }

  function clearReleaseTimers() {
    Object.keys(state.releaseTimers).forEach(function (keyCode) {
      clearTimeout(state.releaseTimers[keyCode]);
      delete state.releaseTimers[keyCode];
    });
  }

  function releaseAll() {
    clearReleaseTimers();
    if (!window.keyboard || typeof window.keyboard.releaseKey !== "function") return;
    for (var pad = 0; pad < 48; pad++) {
      try { window.keyboard.releaseKey(keyCodeForPad(pad)); } catch (e) {}
    }
  }

  function switchPack(pack) {
    if (!window.keyboard || typeof window.keyboard.switchSoundPack !== "function") return;
    if (state.currentPack === pack) return;

    // Cancel old-chain key-up timers before switching; they must not release same-key
    // notes in the new chain.
    clearReleaseTimers();
    window.keyboard.switchSoundPack(pack);
    state.currentPack = pack;
  }

  function stop(silent) {
    state.playing = false;
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
    releaseAll();
    $("#ap_play").prop("disabled", !(state.entries && state.entries.length));
    $("#ap_stop").prop("disabled", true);
    if (!silent) status("Stopped.");
  }

  function play() {
    if (!state.entries || !state.entries.length) {
      status("The built-in note chart is missing. Refresh the page and try again.");
      return;
    }

    var keyboard = window.keyboard;
    var packLabel = $(".soundPack").text();
    if (!keyboard || typeof keyboard.playKey !== "function" ||
        typeof keyboard.releaseKey !== "function" ||
        typeof keyboard.switchSoundPack !== "function" ||
        $(".button").length < 48 || /loading/i.test(packLabel)) {
      status("Wait for the Launchpad sounds to finish loading, then press Play performance.");
      return;
    }

    stop(true);
    state.speed = parseFloat($("#ap_speed").val()) || 1;
    state.currentPack = null;
    switchPack(window.LAUNCHPAD_REFERENCE_CHART.initialPack);
    state.playing = true;
    state.index = 0;
    state.startedAt = Date.now();

    $("#ap_play").prop("disabled", true);
    $("#ap_stop").prop("disabled", false);
    status("Playing " + window.LAUNCHPAD_REFERENCE_CHART.noteCount + " pad hits at " + state.speed + "×…");

    var fps = window.LAUNCHPAD_REFERENCE_CHART.fps || 30;
    var lastFrame = state.entries[state.entries.length - 1].frame;
    var lastNoteEndFrame = lastFrame;

    state.entries.forEach(function (entry) {
      if (entry.kind === 1) {
        lastNoteEndFrame = Math.max(lastNoteEndFrame, entry.frame + entry.durationFrames);
      }
    });

    function tick() {
      if (!state.playing) return;

      var elapsed = (Date.now() - state.startedAt) / 1000 * state.speed;
      var elapsedFrame = elapsed * fps;

      while (state.index < state.entries.length &&
             state.entries[state.index].frame <= elapsedFrame) {
        var event = state.entries[state.index++];

        if (event.kind === 0) {
          switchPack(event.pack);
          continue;
        }

        var keyCode = keyCodeForPad(event.pad);
        if (state.releaseTimers[keyCode]) {
          clearTimeout(state.releaseTimers[keyCode]);
          delete state.releaseTimers[keyCode];
        }

        try {
          keyboard.playKey(keyCode);
          (function (kc, holdFrames, speed) {
            state.releaseTimers[kc] = setTimeout(function () {
              delete state.releaseTimers[kc];
              if (window.keyboard) window.keyboard.releaseKey(kc);
            }, Math.max(35, (holdFrames / fps) * 1000 / speed));
          })(keyCode, event.durationFrames, state.speed);
        } catch (e) {
          stop(true);
          status("Playback stopped because a pad could not be triggered. Reload after the sounds finish loading.");
          return;
        }
      }

      if (state.index >= state.entries.length && elapsedFrame >= lastNoteEndFrame + 3) {
        stop(true);
        status("Performance finished.");
        return;
      }

      state.timer = setTimeout(tick, 4);
    }

    tick();
  }

  $(document).on("turbolinks:load", buildUI);
  $(buildUI);
})(jQuery, window);
