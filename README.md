
This is the source code of the WLED-WIRING TOOL.

* Live web page: [https://wled-wiring.github.io](https://wled-wiring.github.io)
* Web page data: [gh-pages branch](https://github.com/wled-wiring/wled-wiring.github.io/tree/gh-pages)

# Guide for contributors:
- Before contributing please read [CLA (Contributor License Agreement)](https://github.com/wled-wiring/wled-wiring.github.io/blob/main/.cla/cla.md)
- This web page uses Typescript, [React](https://react.dev/), [ReactFlow](https://reactflow.dev/) and [ant  design](https://ant.design/). You would need to know these frameworks.
- Feel free to make a pull request (PR). Please make all PRs against the `main` branch.
- Please make possibly small pull request and describe them properly. It makes it easier to review.
- For development we recommend using Visual Studio Code (VSC) with ESLint plugin. In VSC you would need once run `npm install vite`. Then run `npm run dev` for development.
- When you make a PR:
   * Clone repository, make a **separate branch** for each PR
   * Test all changes locally
   * Commit a PR
   * Please do **not** use "force-push" while your PR is open!
- I am not a professional WEB SW developer, this is also the first time at all I used Typescript, React etc. Therefore you will find the code little bit "wild". Feel free to improve! If you want to make substantial structural changes, maybe first discuss it with me. Thanks!

# Notes on implementation
*	We call ractflow's nodes “components” in wled-wiring tool
*	We call reactflow's edges “wires” in wled-wiring tool
*	First take a look at type definitions in src\types.ts
*	Each component type is described by its .ts file (data structure) in src\components\ComponentTypes
*	All component types must be listed in ComponentList.ts to appear on the side bar
*	Each component is based on a picture (jpeg, png)
*	We want to keep the number of “official” component types small (because later we want to introduce the rule based check and simulation for “official” components that will be hard to support for lots of them). To add support for more controllers etc., the idea is to make a customizable user-edited component type and the possibility for users to store and share customized types on https://github.com/wled-development/wled-wiring-store and we would integrate in wled-wiring a “custom component” section.
*	All components implemented by a single src\components\GeneralComponent.tsx
*	We use only our custom edge implemented in src\wires\EditableWire.tsx
*	In reactflow edges have handles to connect nodes to each other. Components (except InfoNode etc.) have handles defined in the component type definition file (src\components\ComponentTypes), in data
*	In reactflow handles have a position property. We had to modify usage of handles significantly (to implement proper node rotation etc.).  “position” property must be always Position.Left. We use our own property postype ("centered" | "top" | "bottom" | "left" | "right")
*	 Reactflow does not support proper rotation of the node. The usage of “transform” as given in reactflow example breaks a lot. Therefore, we implemented it differently. The rotation can be only 0, 90, 280 or 270 deg.
*	We use i18n package for translations, the translations are stored in src\translations.
*	editor.html and src\editor are just for development purposes now
*	We want that the wled-wiring designer tool can be used on devices with mouse (mainly), but also support basic usage on touch devices. Be sure you test your changes on both types.

# How to make a PR using git

Here is a short description of how to do a PR:

## Preconditions:
1)	To authenticate on GitHub, you will need to install [github cli]( https://docs.github.com/de/get-started/git-basics/caching-your-github-credentials-in-git) and run `gh auth login`.
2)	Install git (for example [git for windows](https://github.com/git-for-windows/git/releases/tag/v2.49.0.windows.1))

## PR process
* Fork the wled-wiring.github.io repository in Github (by clicking the "Fork" button in the upper-right corner of Github)
* Make a new branch in Github (click on “main” branch, then “View all branches”, then use “New Branch” button). Call it as you want. Later we refer to it as <pr_branch>
* Clone your repository locally via `git clone https://github.com/<github_user>/wled-wiring.github.io.git` (replacing <github_user> with your GitHub Username)
* Go to cloned repo (in Windows via `cd wled-wiring.github.io`)
* Ensure you are on the branch you created via `git checkout <pr_branch>` (replacing <pr_branch> with the name you want to use for your temporary branch)
* Set the upstream branch via `git push --set-upstream origin <pr_branch>` (replacing <pr_branch> with the name you used before)
* Work on your local version. Test everything.
* Before doing any commits, ensure that email address and name configured in git are the same as your GitHub account name and email address used for this account.  Otherwise you won’t be able to sign CLA and your PR cannot be merged. For that check the output of `git config --global user.name` and `git config --global user.email`. You can change them using `git config --global user.name “YourGitHubUserName”` and `git config --global user.email “YourEmailUsedForGitHubAccount”`
* Use command like `git add -all`, then `git commit` and then `git push` to push the changes. After git push, the changes are uploaded to github in your fork/your branch
* Go to Github to your fork and your branch, then use “Contribute” menu and there “Open pull request” button

# Copyright
(c) Wladislaw Waag, info@myhome-control.de

