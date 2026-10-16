class AddEmailVerificationToUsers < ActiveRecord::Migration
  def change
    add_column :users, :email, :string
    add_column :users, :email_verified_at, :datetime
    add_column :users, :verification_token, :string
    add_index :users, :email, unique: true
    add_index :users, :verification_token, unique: true
  end
end
