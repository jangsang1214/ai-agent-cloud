# GitHub Playbook for the AI Developer Team

## 1. Repository = source of truth
GitHub stores the versioned project code. The local checkout is the working copy.

## 2. Clone
Use GitHub CLI:
`gh repo clone OWNER/REPO`

## 3. Start work safely
Create a feature branch:
`git switch -c feature/<short-name>`

## 4. Inspect before editing
`git status`
`git branch --show-current`
`git log -5 --oneline`
`git remote -v`

Then inspect the project and tests.

## 5. Implement
Edit only the files needed for the task.

## 6. Test locally
Run the project's real test/build commands.
Examples depend on the stack:
- Python: `pytest`
- Node: `npm test`, `npm run build`
- TypeScript: `npm run typecheck`
- Flutter: `flutter test`, `flutter build ...`

Never assume these commands exist; inspect the repository first.

## 7. Review diff
`git diff`
`git status`

Look for accidental files, secrets, unrelated refactors, and regressions.

## 8. Commit
`git add <specific-files>`
`git commit -m "feat: ..."`

## 9. Push
`git push -u origin feature/<short-name>`

## 10. Pull Request
`gh pr create --base main --title "..." --body "..."`

The PR is the review boundary.

## 11. CI
GitHub Actions can run tests/builds automatically. The AI team reads the result and fixes failures instead of declaring success.

## 12. Merge
Do not automatically merge high-risk changes. Human approval remains the final gate.

## 13. PC방/다른 노트북
Install Git + GitHub CLI, authenticate, clone the same repository, and continue from a branch.
The code is synchronized through GitHub rather than Google Drive.
