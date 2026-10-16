class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception

  def getAssetUrl
    render :json => {"asset_path" => ActionController::Base.helpers.asset_path("chain#{params["chain"]}/#{params["file_name"]}.mp3"), "sindex" => params["sindex"]}
  end

  def index
    @current_user = User.find_by(id: session[:user_id]) if session[:user_id].present?
    render "index"
  end

  def profile
    @profile_user = User.find_by(username: params[:username])
    unless @profile_user
      head :not_found
      return
    end
    @current_user = User.find_by(id: session[:user_id]) if session[:user_id].present?
  end

  def edit_profile
    @user = User.find_by(id: session[:user_id]) if session[:user_id].present?
    unless @user
      redirect_to root_path
      return
    end
  end

  def update_profile
    @user = User.find_by(id: session[:user_id]) if session[:user_id].present?
    unless @user
      redirect_to root_path
      return
    end

    @user.username = params[:username].to_s.strip
    @user.bio = params[:bio].to_s.strip

    @user.valid?
    @user.errors.add(:username, "is too long (maximum is 40 characters)") if @user.username.to_s.length > 40
    @user.errors.add(:bio, "is too long (maximum is 500 characters)") if @user.bio.to_s.length > 500

    if @user.errors.empty? && @user.save
      redirect_to user_profile_path(username: @user.username), notice: "Profile updated!"
    else
      render "edit_profile"
    end
  end

  def logout
    session[:user_id] = nil
    redirect_to "/"
  end

  def login
    @user = User.find_by(username: params[:username])
    if @user && @user.authenticate(params[:password])
      session[:user_id] = @user.id
      render :json => {"message" => "success"}
    else
      render :json => {"message" => "failed"}
    end
  rescue StandardError => e
    Rails.logger.error("LOGIN_ERROR #{e.class}: #{e.message}")
    render :json => {"message" => "server_error"}, :status => 500
  end

  def signup
    username = params[:username].to_s.strip
    email = params[:email].to_s.strip.downcase
    password = params[:password].to_s

    if password.length < 8
      render :json => {"message" => "password_short"}
      return
    end

    @user = User.new(username: username, email: email, password: password)
    # Email verification is temporarily disabled so signup does not depend on SMTP.
    @user.email_verified_at = Time.now
    @user.verification_token = nil

    if @user.save
      session[:user_id] = @user.id
      render :json => {"message" => "success"}
    else
      render :json => {"message" => "invalid", "errors" => @user.errors.full_messages}
    end
  rescue StandardError => e
    diagnostic = "#{e.class}: #{e.message}"
    diagnostic += " (at #{e.backtrace.first})" if e.backtrace && e.backtrace.first
    # Include caller frames: the first BCrypt frame alone does not identify which
    # application operation passed BCrypt an invalid hash.
    diagnostic += " | called from: #{e.backtrace[1,4].join(" <- ")}" if e.backtrace && e.backtrace.length > 1
    Rails.logger.error("SIGNUP_ERROR #{diagnostic}")
    Rails.logger.error(e.backtrace.first(10).join("\n")) if e.backtrace
    STDOUT.sync = true
    puts("SIGNUP_ERROR #{diagnostic}")
    puts(e.backtrace.first(10).join("\n")) if e.backtrace
    render :json => {"message" => "server_error", "error" => diagnostic}, :status => 500
  end

  def verify_email
    @user = User.find_by(verification_token: params[:token])
    if @user && !@user.email_verified?
      @user.update_attributes(email_verified_at: Time.now, verification_token: nil)
      flash[:notice] = "Email verified! You can now log in."
    elsif @user && @user.email_verified?
      flash[:notice] = "Your email is already verified. You can log in."
    else
      flash[:notice] = "That verification link is invalid or has already been used."
    end
    redirect_to root_path
  end

  def google13ecc4458e525973
    render "google13ecc4458e525973", :layout => false
  end
end
