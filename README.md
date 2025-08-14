# Discourse S3 Uploader

A Discourse plugin that provides admins with direct S3 file upload capabilities. The plugin generates presigned URLs for secure file uploads directly to Amazon S3, bypassing Discourse's default file handling.

## Installation

Add the plugin repository to your app.yml file:

```yaml
hooks:
  after_code:
    - exec:
        cd: $home/plugins
        cmd:
          - git clone https://github.com/b89k57w62/discourse-s3-uploader.git
```

Rebuild your Discourse container:

```bash
cd /var/discourse
./launcher rebuild app
```

## Configuration

1. Enable the plugin in your Discourse admin settings
2. Configure your AWS S3 credentials and bucket settings
3. Ensure the `aws-sdk-s3` gem is properly configured

## Usage

Once installed, admins can access the S3 upload functionality at `/s3-uploader/presigned-url` to generate presigned URLs for direct file uploads to S3.

The plugin provides a minimal, admin-focused interface for secure file management outside of Discourse's standard upload system.
