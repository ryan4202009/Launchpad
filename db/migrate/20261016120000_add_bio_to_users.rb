class AddBioToUsers < ActiveRecord::Migration
  def up
    add_column :users, :bio, :text unless column_exists?(:users, :bio)
  end

  def down
    remove_column :users, :bio if column_exists?(:users, :bio)
  end
end
