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
          
          upload = UploadCreator.new(
            file,
            file.original_filename,
            type: "admin_s3_upload",
            for_site_setting: false
          ).create_for(current_user.id)
          
          if upload.persisted?
            Rails.logger.info("S3Uploader: Upload successful - ID: #{upload.id}, URL: #{upload.url}")
            
            render json: {
              success: true,
              url: upload.url,
              short_url: upload.short_url,
              original_filename: upload.original_filename,
              filesize: upload.filesize,
              human_filesize: upload.human_filesize,
              width: upload.width,
              height: upload.height
            }
          else
            Rails.logger.warn("S3Uploader: Upload validation failed - #{upload.errors.full_messages.join(', ')}")
            render_json_error(upload.errors.full_messages.join(", "))
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