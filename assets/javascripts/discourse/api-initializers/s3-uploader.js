import { apiInitializer } from "discourse/lib/api";

export default apiInitializer("0.11.1", (api) => {
  const siteSettings = api.container.lookup("service:site-settings");
  
  if (!siteSettings.s3_uploader_enabled) {
    return;
  }
  
  api.onPageChange((url) => {
    if (url.includes("/admin/plugins/discourse-s3-uploader") || 
        url.includes("/admin/site_settings/category/plugins?filter=s3_uploader")) {
      
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
              
              // Create FormData with the file
              const formData = new FormData();
              formData.append("file", file);
              
              try {
                // Upload directly to our controller
                const response = await fetch("/s3-uploader/upload", {
                  method: "POST",
                  headers: {
                    "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.content || "",
                    "X-Requested-With": "XMLHttpRequest"
                  },
                  body: formData,
                  credentials: "include"
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                  statusDiv.innerHTML = `
                    <div style="padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px;">
                      <p style="color: #155724; margin: 0 0 10px 0;">✅ Upload successful!</p>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="text" value="${data.url}" readonly style="flex: 1; padding: 5px;" onclick="this.select()">
                        <a href="${data.url}" target="_blank" class="btn btn-small">View</a>
                      </div>
                      <p style="color: #666; font-size: 12px; margin-top: 5px;">
                        ${data.original_filename} (${data.human_filesize || data.filesize + ' bytes'})
                      </p>
                    </div>
                  `;
                  fileInput.value = ""; // Clear the file input
                } else {
                  throw new Error(data.errors || data.error || "Upload failed");
                }
              } catch (error) {
                console.error("Upload error:", error);
                statusDiv.innerHTML = `
                  <div style="padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
                    <p style="color: #721c24; margin: 0;">❌ Error: ${error.message}</p>
                  </div>
                `;
              }
            });
          }
        }
      }, 500);
    }
  });
});