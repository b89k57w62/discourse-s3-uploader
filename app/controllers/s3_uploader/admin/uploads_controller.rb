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
          Rails.logger.info("S3Uploader: File size: #{file.size}, Content type: #{file.content_type}")
          
          # 检查Discourse的S3配置
          s3_bucket = SiteSetting.s3_upload_bucket
          s3_region = SiteSetting.s3_region
          Rails.logger.info("S3Uploader: S3 Bucket: #{s3_bucket}, Region: #{s3_region}")
          
          # 使用Discourse的标准UploadsController.create_upload方法
          # 这样就能获得正确的CDN URL而不是S3 URL
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
            
            Rails.logger.info("S3Uploader: UploadsController.create_upload completed, result: #{info.inspect}")
            
            if info.is_a?(Upload) && info.persisted?
              Rails.logger.info("S3Uploader: Upload successful - ID: #{info.id}")
              
              # 使用Discourse的serialize_upload方法获取正确的URL
              render json: ::UploadsController.serialize_upload(info)
            else
              Rails.logger.warn("S3Uploader: Upload validation failed - #{info[:errors]&.join(', ')}")
              render_json_error(info[:errors]&.join(", ") || "Upload failed")
            end
          rescue => e
            Rails.logger.error("S3Uploader: UploadsController.create_upload failed: #{e.message}")
            Rails.logger.error(e.backtrace.join("\n"))
            render_json_error("Upload creation failed: #{e.message}")
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