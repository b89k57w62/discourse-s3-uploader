module S3Uploader
  module Admin
    class UploadsController < ::Admin::AdminController
      requires_plugin 'discourse-s3-uploader'
      before_action :ensure_plugin_enabled
      
      def create
        return render_json_error("No file provided") unless params[:file].present?
        
        begin
          upload = UploadCreator.new(
            params[:file],
            params[:file].original_filename,
            type: "admin_s3_upload",
            for_site_setting: false
          ).create_for(current_user.id)
          
          if upload.persisted?
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
            render_json_error(upload.errors.full_messages.join(", "))
          end
        rescue => e
          Rails.logger.error("S3Uploader: Upload failed: #{e.message}")
          render_json_error("Upload failed: #{e.message}")
        end
      end
      
      private
      
      def ensure_plugin_enabled
        render_json_error("Plugin is not enabled") unless SiteSetting.s3_uploader_enabled
      end
    end
  end
end