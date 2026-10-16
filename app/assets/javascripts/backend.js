var BackendSpace = new function(){

  this.init = function(){
    return new BackendComm();
  }

  var BackendComm = function(){
    $("#close_layover").click(function(){
      $("#gray_background").css("display","none");
      $("#login_form").css("display","none");
      $("#load_songs").css("display","none");
    });
    
    $("#submit_login").click(function() {
      $.ajax({
        type: "POST",
        url: "/login",
        data: {username: $("#login_username").val(), password: $("#login_password").val()},
        success: function(data, textStatus, jqXHR) {
          console.log(data);
          if(data.message == "success"){
            $("#login_form").css("display", "none");
            $("#gray_background").css("display", "none");
          }
          else
            alert("There was an error");
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log("Error=" + errorThrown);
            alert("There was an error");
        }
      });
    });
  }
  
  // Save charts to the website's database so they appear in the Load list.
  BackendComm.prototype.saveSong = function(notes, pid, editor, song_number){
    var chartName = prompt("Name your chart:");
    if(chartName === null)
      return;
    chartName = chartName.trim();
    if(!chartName){
      alert("Please enter a chart name.");
      return;
    }

    var chartNotes;
    try {
      chartNotes = typeof notes === "string" ? JSON.parse(notes) : notes;
      if(!Array.isArray(chartNotes))
        throw new Error("Chart data must be a list of notes.");
    } catch(error) {
      alert("Could not save this chart because its note data is invalid.");
      console.error(error);
      return;
    }

    $.ajax({
      type: "POST",
      url: "/create_song",
      data: {
        song_data: JSON.stringify(chartNotes),
        id: pid,
        name: chartName,
        songNum: song_number
      },
      headers: {
        "X-CSRF-Token": $('meta[name="csrf-token"]').attr("content")
      },
      success: function(data) {
        if(data.data === "nil"){
          alert("You must be logged in to save charts. Please log in and try again.");
          $("#gray_background").css("display","block");
          $("#login_form").css("display","block");
        } else if(data.data === "null" || data.data === null) {
          alert("Chart was not saved. Please try again.");
        } else {
          editor.notesSaved(parseInt(data.data, 10));
          alert('Chart "' + chartName + '" was saved to the website. Open Load to find it later.');
        }
      },
      error: function(xhr, textStatus, errorThrown) {
        console.error("Chart save failed:", errorThrown);
        alert("Could not save the chart to the website. Please try again.");
      }
    });
  }

  BackendComm.prototype.loadSongs = function(editor, song_number){
    $.ajax({
      type: "POST",
      url: "/view_all_songs",
      data: {songNum: song_number},
      success: function(data, textStatus, jqXHR) {
        $("#gray_background").css("display", "block");
        $("#load_songs").css("display", "block");
        $(".loaded_song").remove();
        data.data.forEach(function(e, i, a){
          $("#load_songs").append('<div class="loaded_song" song_ind="'+i+'">'+e.name+'</div>');
        });
        $(".loaded_song").click(function(){
          $("#gray_background").css("display", "none");
          $("#load_songs").css("display", "none");
          var ind = parseInt($(this).attr("song_ind"));
          var tempinput = JSON.parse(data.data[ind].song_data);
          editor.notesLoaded(tempinput,parseInt(data.data[ind].id));
        });
      },
      error: function(jqXHR, textStatus, errorThrown) {
          console.log("Error=" + errorThrown);
          alert("There was an error");
      }
    });
  }

}