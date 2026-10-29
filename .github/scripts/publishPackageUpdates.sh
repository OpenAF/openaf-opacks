#!/usr/bin/env bash
# Run only in the disposable CI checkout after package generation.
set -euo pipefail

: "${BASE_BRANCH:?BASE_BRANCH is required}"
update_branch="automation/update-packages/${BASE_BRANCH}"

# Record the remote tip before publishing so concurrent edits cannot be overwritten.
remote_tip=$(git ls-remote --heads origin "refs/heads/${update_branch}")
remote_sha=${remote_tip%%$'\t'*}

# Stage the complete generated snapshot, including removed dependency JARs.
# These paths are implementation artifacts of the OpenAF action/runtime.
git add -A -- . ':!.github/action' ':!.openaf_precompiled'
if git diff --cached --quiet; then
  echo "No package changes to publish."
  exit 0
fi

git -c user.name='github-actions[bot]' \
    -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
    commit -m 'Update packs'
git push --force-with-lease="refs/heads/${update_branch}:${remote_sha}" \
  origin "HEAD:refs/heads/${update_branch}"

pr_number=$(gh pr list --repo "$GITHUB_REPOSITORY" --state open \
  --base "$BASE_BRANCH" --head "$update_branch" --json number --jq '.[0].number // empty')
if [[ -n "$pr_number" ]]; then
  echo "Updated package pull request #${pr_number}."
else
  gh pr create --repo "$GITHUB_REPOSITORY" --base "$BASE_BRANCH" \
    --head "$update_branch" --title 'Update packs' \
    --body 'Automated package metadata and dependency updates.'
fi
