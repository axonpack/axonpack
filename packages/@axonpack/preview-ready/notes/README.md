# @axonpack/preview-ready notes

Scope: this package only. One note per area, and **each one owns its own feature status**: what is
built, what is not, and what never will be. There is no combined list anywhere; a second copy would
only disagree with these.

| Note                                   | Covers                                                            |
| -------------------------------------- | ----------------------------------------------------------------- |
| [bundles.md](./bundles.md)             | Building a preview bundle, and which native build it can run on   |
| [native-loader.md](./native-loader.md) | Starting the app from a downloaded bundle, and getting back again |
| [distribution.md](./distribution.md)   | Publishing a preview so installed apps can find it                |
| [storage.md](./storage.md)             | Downloads on the device: keeping, replacing and deleting them     |

## How to edit an area note

- **Features first**, as a checklist: `- [x]` for shipped, `- [ ]` for not built yet. One
  plain-English line each, no sub-lists, no paragraphs.
- **Describe a feature from the outside**: what someone using the package gets. No file names, no
  function or option names, and no explanation of how it works. That belongs in the prose below the
  checklist and in the code comments.
- **Prose after the checklist** carries the design: how it works, and the decisions that constrain
  it. Why, not what.
- **Won't do goes last**, for what the platform makes impossible. No checkboxes there, because nothing in
  it is waiting to be built. Move a line there instead of deleting it, so the reason survives. If
  something becomes possible, move it back up as `- [ ]`.
- **A feature belongs to exactly one note.** If two notes would list it, one of them is wrong.
- New work goes in the note for its area; only a genuinely new surface earns a new note, and a new
  note earns a row in the table above.

The writing rules that apply to every note in the repo, and how the symlinks under
`notes/@axonpack/` work, are in
[the repo's notes guide](https://github.com/axonpack/axonpack/blob/main/notes/README.md).
