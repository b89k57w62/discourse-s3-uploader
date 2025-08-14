module S3Uploader
    module Admin
      class UploadsController < ::Admin::AdminController
        requires_plugin 'discourse-s3-uploader'
        before_action :ensure_plugin_enabled
  
        def generate_presigned_url
          unless params[:filename].present?
            return render json: { error: "Filename parameter is missing." }, status: :bad_request
          end

          if SiteSetting.s3_uploader_access_key_id.blank? || SiteSetting.s3_uploader_secret_access_key.blank?
            return render json: { error: "AWS credentials are not configured. Please configure them in site settings." }, status: :unprocessable_entity
          end
          
          begin
            Discourse.logger.info("S3Uploader: Received request to generate presigned URL for #{params[:filename]}")
  
            require 'aws-sdk-s3'
            s3 = Aws::S3::Resource.new(
              region: SiteSetting.s3_uploader_region,
              access_key_id: SiteSetting.s3_uploader_access_key_id,
              secret_access_key: SiteSetting.s3_uploader_secret_access_key
            )
            
            bucket = s3.bucket(SiteSetting.s3_uploader_bucket)
            
            filename = params[:filename].gsub(/[^a-zA-Z0-9.\-_]/, "_")
            upload_path = SiteSetting.s3_uploader_upload_path.presence || "admin-uploads"
            key = "#{upload_path}/#{Time.current.to_i}_#{filename}"
  
            presigned_post = bucket.presigned_post(
              key: key,
              acl: 'public-read',
              success_action_status: '201'
            )
  
            public_url = "#{presigned_post.url}/#{key}"
  
            Discourse.logger.info("S3Uploader: Successfully generated presigned URL for key: #{key}")
  
            render json: { presigned_post: presigned_post.fields, url: public_url }, status: :ok
  
          rescue => e
            Discourse.logger.error("S3Uploader: Failed to generate presigned URL. Error: #{e.message}")
            render json: { error: "Failed to communicate with AWS S3." }, status: :internal_server_error
          end
        end
  
        private
  
        def ensure_plugin_enabled
          unless SiteSetting.s3_uploader_enabled
            render json: { error: "Plugin is not enabled in site settings." }, status: :forbidden
          end
        end
      end
    end
  end