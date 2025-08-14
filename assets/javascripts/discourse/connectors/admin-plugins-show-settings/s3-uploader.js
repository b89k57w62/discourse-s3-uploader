import Component from "@glimmer/component";
import { service } from "@ember/service";

export default class S3UploaderConnector extends Component {
  @service siteSettings;
  
  static shouldRender(outletArgs, helper) {
    const siteSettings = helper.lookup("service:site-settings");
    return siteSettings.s3_uploader_enabled;
  }
}