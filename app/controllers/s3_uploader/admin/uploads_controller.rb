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
          Rails.logger.info("S3Uploader: Admin #{current_user.username} (ID: #{current_user.id}) uploading file: #{file.original_filename}")

          info = UploadsController.create_upload(
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

            render json: UploadsController.serialize_upload(info)
          else
            Rails.logger.warn("S3Uploader: Upload validation failed - #{info[:errors]&.join(', ')}")
            render_json_error(info[:errors]&.join(", ") || "Upload failed")
          end
        rescue => e
          Rails.logger.error("S3Uploader: Upload failed for user #{current_user.username}: #{e.message}")
          Rails.logger.error(e.backtrace.join("\n"))
          
          render_json_error("Upload failed. Please try again or contact an administrator if the problem persists.")
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