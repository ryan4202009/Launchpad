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
      unless @user.email_verified?
        render :json => {"message" => "unverified"}
        return
      end
      session[:user_id] = @user.id
      render :json => {"message" => "success"}
    else
      render :json => {"message" => "failed"}
    end
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
    @user.verification_token = SecureRandom.urlsafe_base64(32)
    if @user.save
      begin
        verification_url = verify_email_url(@user.verification_token,
          host: request.host_with_port, protocol: request.ssl? ? "https" : "http")
        UserMailer.verification_email(@user, verification_url).deliver
        render :json => {"message" => "verification_sent"}
      rescue => error
        Rails.logger.error("Signup verification email failed: #{error.class}: #{error.message}")
        render :json => {"message" => "email_failed"}
      end
    else
      render :json => {"message" => "invalid", "errors" => @user.errors.full_messages}
    end
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
