class UserMailer < ActionMailer::Base
  default from: ENV['MAIL_FROM'] || 'no-reply@launchpad.local'

  def verification_email(user, verification_url)
    @user = user
    @verification_url = verification_url
    mail(to: @user.email, subject: "Verify your Launchpad account")
  end
end
