Rails.application.routes.draw do
  root "application#index"

  get "/profile/edit" => "application#edit_profile", as: :edit_profile
  post "/profile/edit" => "application#update_profile"
  get "/users/:username" => "application#profile", as: :user_profile

  post "/get_asset_path" => "application#getAssetUrl"
  post "/login" => "application#login"
  post "/signup" => "application#signup"
  get "/verify_email/:token" => "application#verify_email", as: :verify_email
  get "/logout" => "application#logout"

  post "/create_song" => "song#create"
  post "/view_all_songs" => "song#view_all"
  get "/saved_songs/:id" => "song#show_public", as: :public_saved_song

  get "/google13ecc4458e525973" => "application#google13ecc4458e525973"
end
