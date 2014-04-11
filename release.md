# Release checklist (note to self)

* (optional) update copyright year (`LICENSE`, `package.json`)
* update `README` changelog
* create dist:

    grunt dist

* `git rm` previous artifacts from `dist/` directory
* update download hyperlinks at top of `README` (update download sizes in kb)
* release commit:

    git commit -m "0.x.0 release"
    
* tag release:

    git tag -a -m "0.x.0 release" 0.x.0
    
* push commit including tag:

    git push --tags origin master

* recompile the `documentup` page; go to:

    documentup.com/<repo-owner>/backbone-nestify/recompile

# Post-release checklist 

(sometime prior to next dev commit in master)

* increment version number (`package.json`)
* (optional) update "dev" dist artifacts
