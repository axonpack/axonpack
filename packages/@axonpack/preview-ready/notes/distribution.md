# Distribution

Publishing a preview so installed apps can find it.

- [ ] Publishes a preview from the developer's machine with one command
- [ ] Replaces a preview when the same branch is published again
- [ ] Removes a preview, and cleans up files nothing uses any more
- [ ] Serves previews from a folder on the laptop while developing

Previews go to an S3 or R2 bucket, or to GitHub Releases. Both hold the same files in the same
layout; only the upload and download code differs. The app gets the address and any key or token
from the config it passes in.
