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
              <input type="file" id="s3-file-input" style="margin-bottom: 10px;" accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv">
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
                statusDiv.innerHTML = '';
                const errorP = document.createElement('p');
                errorP.style.color = 'red';
                errorP.textContent = 'Please select a file first.';
                statusDiv.appendChild(errorP);
                return;
              }
              
              statusDiv.innerHTML = '';
              const uploadingP = document.createElement('p');
              uploadingP.style.color = 'blue';
              uploadingP.textContent = 'Uploading...';
              statusDiv.appendChild(uploadingP);
              
              const formData = new FormData();
              formData.append("file", file);
              
              try {
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
                
                if (response.ok && data.url) {
                  statusDiv.innerHTML = '';
                  
                  const successDiv = document.createElement('div');
                  successDiv.style.cssText = 'padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px;';
                  
                  const successMsg = document.createElement('p');
                  successMsg.style.cssText = 'color: #155724; margin: 0 0 10px 0;';
                  successMsg.textContent = '✅ Upload successful!';
                  successDiv.appendChild(successMsg);
                  
                  const urlContainer = document.createElement('div');
                  urlContainer.style.cssText = 'display: flex; align-items: center; gap: 10px;';
                  
                  const urlInput = document.createElement('input');
                  urlInput.type = 'text';
                  urlInput.value = data.url;
                  urlInput.readOnly = true;
                  urlInput.style.cssText = 'flex: 1; padding: 5px;';
                  urlInput.onclick = function() { this.select(); };
                  urlContainer.appendChild(urlInput);
                  
                  const viewLink = document.createElement('a');
                  viewLink.href = data.url;
                  viewLink.target = '_blank';
                  viewLink.rel = 'noopener noreferrer';
                  viewLink.className = 'btn btn-small';
                  viewLink.textContent = 'View';
                  urlContainer.appendChild(viewLink);
                  
                  successDiv.appendChild(urlContainer);
                  
                  const fileInfo = document.createElement('p');
                  fileInfo.style.cssText = 'color: #666; font-size: 12px; margin-top: 5px;';
                  const fileSize = data.human_filesize || (data.filesize + ' bytes');
                  fileInfo.textContent = `${data.original_filename} (${fileSize})`;
                  successDiv.appendChild(fileInfo);
                  
                  statusDiv.appendChild(successDiv);
                  fileInput.value = "";
                } else {
                  const errorMessage = data.errors || data.error || "Upload failed";
                  throw new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
                }
              } catch (error) {
                console.error("Upload error:", error);
                
                statusDiv.innerHTML = '';
                
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;';
                
                const errorMsg = document.createElement('p');
                errorMsg.style.cssText = 'color: #721c24; margin: 0;';
                errorMsg.textContent = `❌ Error: ${error.message}`;
                errorDiv.appendChild(errorMsg);
                
                statusDiv.appendChild(errorDiv);
              }
            });
          }
        }
      }, 500);
    }
  });
});