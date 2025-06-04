Playing around with Deno. Using it to create CLI tools. Just one script for now, but will likely make more proofs of concept here before integrating them into larger/creating dedicated projects.

Deno can run JS or TS files. All script files are in the root of this repo.

### Installation
Call `which deno` to make sure it's installed. To upgrade deno, call `brew upgrade deno`.

### Running a script

To install a script, run
```
deno install --allow-read --allow-write <filename>
```

If you'd rather not install it, run
```
deno run --allow-read --allow-write <filename> <args>
```

To debug, you can use VSCode with the `.vscode/launch.json` config.

### GPX
deno install --allow-read --allow-write gpx.js

### Clean Notes

deno install --allow-read --allow-write --allow-env clean-notes.ts
- [ ] implement part b of the help text

### Merge GPX

deno install --global --allow-read --allow-write merge-gpx.ts

### Dev

Every file should
- contain a TechnicalCode class the wraps all calls to Deno (or any external) dependencies
- be callable with a -h or --help arg for instructions
