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

    function authHeaders() {
      return {"X-CSRF-Token": $('meta[name="csrf-token"]').attr("content")};
    }

    $("#show_signup").click(function(event) {
      event.preventDefault();
      $("#auth_login_panel").hide();
      $("#auth_signup_panel").show();
      $("#signup_message").text("");
    });

    $("#show_login").click(function(event) {
      event.preventDefault();
      $("#auth_signup_panel").hide();
      $("#auth_login_panel").show();
    });

    $("#submit_login").click(function() {
      $.ajax({
        type: "POST",
        url: "/login",
        data: {username: $("#login_username").val(), password: $("#login_password").val()},
        headers: authHeaders(),
        success: function(data) {
          if(data.message === "success") {
            $("#login_form").hide();
            $("#gray_background").hide();
            window.location.reload();
          } else if(data.message === "unverified") {
            alert("Please verify your email using the link we sent before logging in.");
          } else {
            alert("Login failed. Check your username and password.");
          }
        },
        error: function() {
          alert("Could not log in right now. Please try again.");
        }
      });
    });

    $("#submit_signup").click(function() {
      var password = $("#signup_password").val();
      if(password !== $("#signup_password_confirm").val()) {
        $("#signup_message").text("The passwords do not match.");
        return;
      }
      $("#submit_signup").text("Creating account...").css("pointer-events", "none");
      $.ajax({
        type: "POST",
        url: "/signup",
        data: {
          username: $("#signup_username").val(),
          email: $("#signup_email").val(),
          password: password
        },
        headers: authHeaders(),
        success: function(data) {
          if(data.message === "verification_sent") {
            $("#signup_message").text("Account created! Check your inbox for a verification link, then log in.");
            $("#signup_username, #signup_email, #signup_password, #signup_password_confirm").val("");
          } else if(data.message === "password_short") {
            $("#signup_message").text("Use a password with at least 8 characters.");
          } else if(data.message === "email_failed") {
            $("#signup_message").text("Your account was created, but the verification email could not be sent. Please try again later or contact the site owner.");
          } else if(data.message === "invalid") {
            $("#signup_message").text((data.errors || ["Please check your details."]).join(" "));
          } else {
            $("#signup_message").text("Could not create the account. Please try again.");
          }
        },
        error: function() {
          $("#signup_message").text("Could not create the account. Please try again.");
        },
        complete: function() {
          $("#submit_signup").text("Sign up").css("pointer-events", "auto");
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