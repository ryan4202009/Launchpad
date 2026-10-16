class User < ActiveRecord::Base
  has_secure_password

  validates :username, presence: true, uniqueness: { case_sensitive: false }
  validates :email, presence: true, uniqueness: { case_sensitive: false },
                    format: { with: /\A[^\s@]+@[^\s@]+\.[^\s@]+\z/ }
  validates :verification_token, uniqueness: true, allow_nil: true

  def email_verified?
    !email_verified_at.nil?
  end
end
