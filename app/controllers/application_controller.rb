class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception

  def getAssetUrl
    render :json => {"asset_path" => ActionController::Base.helpers.asset_path("chain#{params["chain"]}/#{params["file_name"]}.mp3"), "sindex" => params["sindex"]}
  end

  def index
    render "index"
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
    Rails.logger.error("SIGNUP_ERROR #{e.class}: #{e.message}")
    Rails.logger.error(e.backtrace.first(10).join("\n")) if e.backtrace
    render :json => {"message" => "server_error"}, :status => 500
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
