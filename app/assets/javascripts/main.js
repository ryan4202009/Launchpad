$(document).ready(function(){
    // Profile and edit-profile pages share the application layout, but do not
    // contain the Launchpad. Do not start loading audio on those pages.
    if (!$(".buttons").length || !$(".soundPack").length) return;

    Zip_Space.initialize();
    
    keyboard = Keyboard_Space.initKeyboard(true);

    // A profile's "Use song" link returns here with a chart ID. Wait until the
    // soundboard/editor is ready, then load that saved chart into the editor.
    var requestedSong = window.location.search.match(/[?&]load_song_id=(\\d+)/);
    if (requestedSong) {
        var requestedSongId = requestedSong[1];
        var waitForEditor = setInterval(function() {
            if (keyboard && keyboard.editor && keyboard.editor.notesLoaded) {
                clearInterval(waitForEditor);
                $.ajax({
                    url: "/saved_songs/" + encodeURIComponent(requestedSongId),
                    type: "GET",
                    dataType: "json",
                    success: function(song) {
                        var notes = song.song_data;
                        if (typeof notes === "string") {
                            try { notes = JSON.parse(notes); } catch (error) {
                                console.error("Saved chart data could not be parsed.", error);
                                alert("This saved chart could not be loaded.");
                                return;
                            }
                        }
                        keyboard.editor.notesLoaded(notes, parseInt(song.id, 10));
                        $("#editor_container_div").show();
                        $(".click_button").css("background-color", "white");
                        $("#toggle_editor_container").css("background-color", "lightgray");
                        $("html, body").animate({scrollTop: $("#editor_container_div").offset().top}, 300);
                    },
                    error: function() {
                        alert("That saved song could not be found. It may have been removed.");
                    }
                });
            }
        }, 300);
        setTimeout(function() { clearInterval(waitForEditor); }, 60000);
    }
    
    $(window).resize(function(){
        $(".buttons").css("margin", "0");
        var margin = (($("body").innerWidth()-$(".buttons").width()-30)/2);
        if(margin < 0)
            margin = 0;
        if(margin < 180)
            margin = 180;
        $(".buttons").css("padding","0 "+margin+"px");
    });
    
    // adMessage();
    
});

var keyboard = undefined;