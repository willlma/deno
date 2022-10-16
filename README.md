Playing around with Deno. Using it to create CLI tools. Just one script for now, but will likely make more proofs of concept here before integrating them into larger/creating dedicated projects.

### GPX
See the comment in `gpx.js` to see what it does. To install it and run it as described there, run
```
deno install --allow-read --allow-write gpx.js
```
If you'd rather not install it, run
```
deno run --allow-read --allow-write gpx.js <input.gpx> <route.gpx> <breakMins>
```
To debug, you can use VSCode with the `.vscode/launch.json` config.
