# Distribution

Publishing a preview so installed apps can find it.

- [ ] Publishes a preview from the developer's machine with one command
- [ ] Replaces a preview when the same branch is published again
- [ ] Removes a preview, and cleans up files nothing uses any more
- [ ] Serves previews from a folder on the laptop while developing

Where previews are stored is still open. The app only needs an HTTPS address and, if the storage
wants one, a header to send. It gets both from the config the app passes in.
