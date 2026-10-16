class Song < ActiveRecord::Base
  serialize :song_data
  belongs_to :user, optional: true
end
