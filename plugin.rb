# name: discourse-s3-uploader
# about: A minimal plugin for admins to upload files directly to S3.
# version: 1.0
# authors: Jeffrey
# url: https://github.com/b89k57w62/discourse-s3-uploader

enabled_site_setting :s3_uploader_enabled

after_initialize do
  module ::S3Uploader
    class Engine < ::Rails::Engine
      engine_name "s3_uploader"
      isolate_namespace S3Uploader
    end
  end

  S3Uploader::Engine.routes.draw do
    get "/presigned-url" => "admin/uploads#generate_presigned_url"
  end

  Discourse::Application.routes.append do
    mount ::S3Uploader::Engine, at: "/s3-uploader"
  end

  load File.expand_path('../app/controllers/s3_uploader/admin/uploads_controller.rb', __FILE__)
end