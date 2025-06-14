
This is the source code of the WLED-WIRING TOOL.

Live web page: [https://wled-wiring.github.io](https://wled-wiring.github.io)
Web page data: [gh-pages branch](https://github.com/wled-wiring/wled-wiring.github.io/tree/gh-pages)

# Guide for contributors:
- Before contributing please read [CLA (Contributor License Agreement)](https://github.com/wled-wiring/wled-wiring.github.io/blob/main/.cla/cla.md)
- This web page uses Typescript, [React](https://react.dev/), [ReactFlow](https://reactflow.dev/) and [ant  design](https://ant.design/). You would need to know these frameworks.
- Feel free to make a pull request (PR). Please make all PRs against the `main` branch.
- Please make possibly small pull request and describe them properly. It makes it easier to review.
- For development we recommend using Visual Studio Code (VSC) with ESLint plugin. In VSC you would need to run `npm run dev` for development.
- When you make a PR:
   * Clone repository, make a **separate branch** for each PR
   * Test all changes locally
   * Commit a PR
   * Please do **not** use "force-push" while your PR is open!

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
* Switch to the branch you created via `git checkout <pr_branch>` (replacing <pr_branch> with the name you want to use for your temporary branch)
* Set the upstream branch via `git push --set-upstream origin <pr_branch>` (replacing <pr_branch> with the name you used before)
* Work on your local version. Test everything.
* Before doing any commits, ensure that email address and name configured in git are the same as your GitHub account name and email address used for this account.  Otherwise you won’t be able to sign CLA and your PR cannot be merged. For that check the output of `git config --global user.name` and `git config --global user.email`. You can change them using `git config --global user.name “YourGitHubUserName”` and `git config --global user.email “YourEmailUsedForGitHubAccount”`
* Use command like `git add -all`, then `git commit` and then `git push` to push the changes. After git push, the changes are uploaded to github in your fork/your branch.
* Go to Github to your fork and your branch, then use “Contribute” menu and there “Open pull request” button.

# Copyright
(c) Wladislaw Waag, info@myhome-control.de

