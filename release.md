# Release checklist (note to self)

* check status of GitHub issue(s) and/or milestone(s)
* _TODO_ investigate adding to `package.json`:
  * readme
  * license
  * change the `main` to the minified file; add a dev file
  * do a test beta publish, if necessary
  * see https://docs.npmjs.com/files/package.json
* (optional) update copyright year (`LICENSE`, `package.json`)
* update `README` changelog
* (optional) backup `node_module`; fresh install with `npm install`
* create dist:

```
grunt dist
```

* `git rm` previous artifacts from `dist/` directory
* update download hyperlinks at top of `README` (update download sizes in kb)
* release commit:

```
git commit -m "0.x.0 release"
```

* tag release:

```
git tag -a -m "0.x.0 release" 0.x.0
```

* push commit including tag:

```
git push --tags origin master
```

* recompile the `documentup` page; go to:

```
documentup.com/<repo-owner>/backbone-nestify/recompile
```
    
* copy relevant files to `gh-pages` branch: `README`, `dist/`

```
git checkout gh-pages
git checkout master README.md dist
```

* modify `gh-pages:index.html`, update `script`
* commit

```
git commit -m "gh-pages 0.x.0"
```

* close GitHub release milestone, if there is one
* publish to npmjs.org

```
npm publish .
```
or
```
npm publish . --tag 0.x.0
npm tag backbone-nestify@0.x.0 latest
```
or
```
npm publish . --tag 0.x.0-beta
```
then later
```
npm tag backbone-nestify@0.x.0 latest
```

# Post-release checklist 

(sometime prior to next dev commit in master)

* increment version number (`package.json`)
* (optional) update "dev" dist artifacts

