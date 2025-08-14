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
              
              try {
                const presignResponse = await fetch(`/s3-uploader/presigned-url?filename=${encodeURIComponent(file.name)}`, {
                  method: "GET",
                  headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.content || ""
                  },
                  credentials: "include",
                });
                
                if (!presignResponse.ok) {
                  const errorData = await presignResponse.json();
                  throw new Error(errorData.error || "Failed to get presigned URL");
                }
                
                const presignData = await presignResponse.json();
                
                const formData = new FormData();
                
                if (presignData.presigned_post) {
                  Object.keys(presignData.presigned_post).forEach((key) => {
                    if (key !== 'url') {
                      formData.append(key, presignData.presigned_post[key]);
                    }
                  });
                }
                
                formData.append("file", file);
                
                const s3Response = await fetch(presignData.presigned_post.url, {
                  method: "POST",
                  body: formData,
                });
                
                if (s3Response.ok || s3Response.status === 204) {
                  statusDiv.innerHTML = `
                    <p style="color: green;">✅ Upload successful!</p>
                    <p>File URL: <a href="${presignData.url}" target="_blank">${presignData.url}</a></p>
                  `;
                  fileInput.value = "";
                } else {
                  throw new Error(`S3 upload failed with status: ${s3Response.status}`);
                }
              } catch (error) {
                console.error("Upload error:", error);
                statusDiv.innerHTML = `<p style="color: red;">❌ Error: ${error.message}</p>`;
              }
            });
          }
        }
      }, 500);
    }
  });
});