import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("0.11.1", (api) => {
  const siteSettings = api.container.lookup("service:site-settings");
  
  // Only proceed if the plugin is enabled
  if (!siteSettings.s3_uploader_enabled) {
    return;
  }
  
  // Check if we're on the S3 uploader settings page
  api.onPageChange((url) => {
    if (url.includes("/admin/plugins/discourse-s3-uploader") || 
        url.includes("/admin/site_settings/category/plugins?filter=s3_uploader")) {
      
      // Add custom content after page loads
      setTimeout(() => {
        const container = document.querySelector(".admin-plugin-config-page") || 
                         document.querySelector(".admin-contents") ||
                         document.querySelector(".admin-container");
                         
        if (container && !document.querySelector(".s3-uploader-tool")) {
          const uploaderDiv = document.createElement("div");
          uploaderDiv.className = "s3-uploader-tool";
          uploaderDiv.style.cssText = "margin-top: 20px; padding: 20px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px;";
          uploaderDiv.innerHTML = `
            <h3 style="margin-bottom: 15px;">📤 S3 File Uploader Tool</h3>
            <p style="margin-bottom: 15px;">Upload files directly to your S3 bucket:</p>
            <div style="padding: 15px; background: white; border-radius: 4px;">
              <input type="file" id="s3-file-input" style="margin-bottom: 10px;">
              <button id="s3-upload-btn" class="btn btn-primary">Upload to S3</button>
              <div id="s3-upload-status" style="margin-top: 10px;"></div>
            </div>
          `;
          container.appendChild(uploaderDiv);
          
          // Add upload functionality
          const fileInput = document.getElementById("s3-file-input");
          const uploadBtn = document.getElementById("s3-upload-btn");
          const statusDiv = document.getElementById("s3-upload-status");
          
          if (uploadBtn && fileInput) {
            uploadBtn.addEventListener("click", async () => {
              const file = fileInput.files[0];
              if (!file) {
                statusDiv.innerHTML = '<p style="color: red;">Please select a file first.</p>';
                return;
              }
              
              statusDiv.innerHTML = '<p style="color: blue;">Uploading...</p>';
              
              try {
                // Call the upload API
                const response = await fetch("/s3-uploader/presigned-url", {
                  method: "GET",
                  headers: {
                    "X-Requested-With": "XMLHttpRequest",
                  },
                  credentials: "include",
                });
                
                if (response.ok) {
                  statusDiv.innerHTML = '<p style="color: green;">Upload successful!</p>';
                } else {
                  statusDiv.innerHTML = '<p style="color: red;">Upload failed. Please try again.</p>';
                }
              } catch (error) {
                statusDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
              }
            });
          }
        }
      }, 500);
    }
  });
});