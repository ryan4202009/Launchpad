class RepairUserEmailColumns < ActiveRecord::Migration
  def up
    unless column_exists?(:users, :email)
      add_column :users, :email, :string
    end

    unless column_exists?(:users, :email_verified_at)
      add_column :users, :email_verified_at, :datetime
    end

    unless column_exists?(:users, :verification_token)
      add_column :users, :verification_token, :string
    end

    unless index_exists?(:users, :email)
      add_index :users, :email, unique: true
    end

    unless index_exists?(:users, :verification_token)
      add_index :users, :verification_token, unique: true
    end
  end

  def down
    # Intentionally leave account columns in place so rolling back this repair
    # cannot remove data or break accounts created by the signup feature.
  end
end
