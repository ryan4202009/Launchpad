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
  
  // Export the current editor chart as a portable JSON file.
  // This works without an account or a server-side database.
  BackendComm.prototype.saveSong = function(notes, pid, editor, song_number){
    var chartName = prompt("Name your chart:", "My Launchpad Chart");
    if(chartName === null)
      return;

    chartName = chartName.trim();
    if(!chartName)
      chartName = "My Launchpad Chart";

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

    var chart = {
      format: "lookumz-launchpad-chart",
      version: 1,
      name: chartName,
      song_number: song_number,
      saved_at: new Date().toISOString(),
      notes: chartNotes
    };
    var fileName = chartName.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "");
    if(!fileName)
      fileName = "launchpad_chart";

    try {
      var blob = new Blob([JSON.stringify(chart, null, 2)], {type: "application/json;charset=utf-8"});
      if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, fileName + ".json");
      } else {
        var url = window.URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = url;
        link.download = fileName + ".json";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(function(){ window.URL.revokeObjectURL(url); }, 1000);
      }
      alert('Chart "' + chartName + '" was saved as ' + fileName + '.json. Keep the file somewhere safe.');
    } catch(error) {
      console.error(error);
      alert("Could not download the chart. Please try again.");
    }
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