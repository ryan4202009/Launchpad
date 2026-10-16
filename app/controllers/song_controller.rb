class SongController < ApplicationController
  
  def create
    if session[:user_id].present?
      # Only let an account update its own saved charts. If an old or foreign
      # chart ID is supplied, create a new chart for the signed-in user instead.
      @song = Song.find_by(id: params[:id], user_id: session[:user_id]) if params[:id].present?
      if @song
        @song.song_data = params[:song_data]
        @song.name = params[:name] if params[:name].present?
        @song.save
        render :json => {"data" => @song.id}
      else
        song = Song.new
        song.user_id = session[:user_id]
        song.song_number = params[:songNum]
        song.song_data = params[:song_data]
        song.name = params[:name]
        if song.save
          render :json => {"data" => song.id}
        else
          render :json => {"data" => "null"}
        end
      end
    else
      render :json => {"data" => "nil"}
    end
  end
  
  def view_all
    render :json => {"data" => Song.where("cast(song_number as text) LIKE ?", "%#{params[:songNum]}%")}
  end

  # Public profiles intentionally expose only the chart data needed to use a song.
  def show_public
    song = Song.find_by(id: params[:id])
    unless song && song.user_id.present?
      head :not_found
      return
    end
    render :json => {id: song.id, name: song.name, song_data: song.song_data}
  end
end
