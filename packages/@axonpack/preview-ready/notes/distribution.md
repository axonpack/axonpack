# Distribution

Publishing a preview so installed apps can find it.

- [ ] Publishes a preview from the developer's machine with one command
- [ ] Replaces a preview when the same branch is published again
- [ ] Removes a preview, and cleans up files nothing uses any more
- [ ] Serves previews from a folder on the laptop while developing

Previews go to an S3-compatible bucket: S3, R2, MinIO or any other host with the S3 API. The app
gets the endpoint, the bucket and, for a private bucket, a read-only key from the config it passes
in.
