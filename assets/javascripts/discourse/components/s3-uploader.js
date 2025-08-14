import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { ajax } from "discourse/lib/ajax";
import { I18n } from "discourse-i18n";

export default class S3Uploader extends Component {
  @tracked statusMessage = "";
  @tracked finalUrl = "";
  @tracked isLoading = false;

  @action
  async uploadFile(event) {
    const file = event.target.files[0];
    if (!file) {
      this.statusMessage = I18n.t("js.s3_uploader.error_file_type");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.statusMessage = I18n.t("js.s3_uploader.error_file_size", { max: "10MB" });
      return;
    }

    this.isLoading = true;
    this.finalUrl = "";
    this.statusMessage = I18n.t("js.s3_uploader.uploading");

    try {
      const presignResponse = await ajax(
        "/s3-uploader/presigned-url",
        {
          data: { filename: file.name },
        }
      );

      const formData = new FormData();
      Object.keys(presignResponse.presigned_post).forEach((key) => {
        formData.append(key, presignResponse.presigned_post[key]);
      });
      formData.append("file", file);

      const s3Response = await fetch(presignResponse.presigned_post.url, {
        method: "POST",
        body: formData,
      });

      if (!s3Response.ok) {
        throw new Error(await s3Response.text());
      }
      
      this.statusMessage = I18n.t("js.s3_uploader.success");
      this.finalUrl = presignResponse.url;

    } catch (error) {
      console.error("S3 Uploader Error:", error);
      this.statusMessage = I18n.t("js.s3_uploader.error_upload");
      this.finalUrl = "";
    } finally {
      this.isLoading = false;
      event.target.value = null;
    }
  }
}