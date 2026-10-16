class Song < ActiveRecord::Base
  serialize :song_data
  belongs_to :user
end
