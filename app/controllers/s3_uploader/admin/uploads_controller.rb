module S3Uploader
  module Admin
    class UploadsController < ::Admin::AdminController
      requires_plugin 'discourse-s3-uploader'
      
      before_action :ensure_admin
      before_action :ensure_plugin_enabled
      
      skip_before_action :check_xhr, only: [:create]
      
      MAX_FILE_SIZE = 10.megabytes
      ALLOWED_EXTENSIONS = %w[jpg jpeg png gif webp pdf doc docx xls xlsx txt csv]
      
      def create
        return render_json_error("No file provided") unless params[:file].present?
        
        file = params[:file]
        
        if file.size > MAX_FILE_SIZE
          return render_json_error("File too large. Maximum size is 10MB")
        end
        
        extension = File.extname(file.original_filename).downcase.delete('.')
        unless ALLOWED_EXTENSIONS.include?(extension)
          return render_json_error("File type not allowed. Allowed types: #{ALLOWED_EXTENSIONS.join(', ')}")
        end
        
        begin
          begin
            info = ::UploadsController.create_upload(
              current_user: current_user,
              file: file,
              url: nil,
              type: "admin_s3_upload",
              for_private_message: false,
              for_site_setting: false,
              pasted: false,
              is_api: false,
              retain_hours: 0
            )
            
            if info.is_a?(Upload) && info.persisted?
              Rails.logger.info("S3Uploader: Upload successful - ID: #{info.id}")
              
              cdn_url = Discourse.store.cdn_url(info.url)
              
              if cdn_url.include?('fungps-upload.s3.dualstack.ap-southeast-1.amazonaws.com')
                cdn_url = cdn_url.gsub('//fungps-upload.s3.dualstack.ap-southeast-1.amazonaws.com', '//images.fungps.net')
              end
              
              render json: {
                success: true,
                url: cdn_url,
                s3_url: info.url,
                short_url: info.short_url,
                original_filename: info.original_filename,
                filesize: info.filesize,
                human_filesize: info.human_filesize,
                width: info.width,
                height: info.height
              }
            else
              Rails.logger.warn("S3Uploader: Upload validation failed - #{info[:errors]&.join(', ')}")
              render_json_error(info[:errors]&.join(", ") || "Upload failed")
            end
          rescue => e
            Rails.logger.error("S3Uploader: Upload creation failed: #{e.message}")
            render_json_error("Upload creation failed: #{e.message}")
          end
        rescue => e
          Rails.logger.error("S3Uploader: Upload failed for user #{current_user.username}: #{e.message}")
          
          error_message = case e.class.to_s
          when 'Discourse::InvalidAccess'
            "Access denied. Please check your permissions."
          when 'Discourse::InvalidParameters'
            "Invalid file parameters. Please check the file format and size."
          when 'Aws::S3::Errors::AccessDenied'
            "S3 access denied. Please check your S3 configuration."
          when 'Aws::S3::Errors::NoSuchBucket'
            "S3 bucket not found. Please check your S3 configuration."
          when 'Aws::S3::Errors::InvalidAccessKeyId'
            "Invalid S3 credentials. Please check your AWS configuration."
          else
            "Upload failed: #{e.message}. Please try again or contact an administrator if the problem persists."
          end
          
          render_json_error(error_message)
        end
      end
      
      private
      
      def ensure_plugin_enabled
        unless SiteSetting.s3_uploader_enabled
          render_json_error("S3 Uploader plugin is not enabled") 
          false
        end
      end
    end
  end
end