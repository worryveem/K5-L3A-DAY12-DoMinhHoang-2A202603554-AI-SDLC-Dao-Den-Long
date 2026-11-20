#!/usr/bin/env bash
# Only called by the checked main-push job. Does not rewrite any existing tag.
set -euo pipefail
test "${GITHUB_ACTIONS:-}" = true
test "${GITHUB_EVENT_NAME:-}" = push
test "${GITHUB_REF:-}" = refs/heads/main
test "$(node -p "require('./package.json').version")" = 1.0.0
test "$(node -p "require('./game.contract.json').contract_version")" = 1.3
archive=artifacts/dao-den-long-v1.0.0-web.zip
test -s "$archive"
test -s docs/demo/demo.mp4
# A queued run must not release a superseded commit.
latest=$(gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/main" --jq .object.sha)
test "$latest" = "$GITHUB_SHA"
for tag in phase-1 phase-2 phase-3; do
  git rev-parse --verify "refs/tags/$tag^{commit}" >/dev/null
done
for tag in phase-4 v1.0.0; do
  if git show-ref --verify --quiet "refs/tags/$tag"; then
    test "$(git rev-parse "refs/tags/$tag^{commit}")" = "$GITHUB_SHA"
  else
    gh api --method POST "repos/$GITHUB_REPOSITORY/git/refs" \
      -f "ref=refs/tags/$tag" -f "sha=$GITHUB_SHA" >/dev/null
  fi
done
if gh release view v1.0.0 --json isDraft --jq .isDraft > /tmp/lantern-release-draft; then
  if test "$(cat /tmp/lantern-release-draft)" = false; then
    # Published releases are immutable for this workflow; never replace their files.
    gh release view v1.0.0 --json assets --jq '.assets[].name' > /tmp/lantern-release-assets
    for name in dao-den-long-v1.0.0-web.zip demo.mp4 bench.json soak.json; do
      grep -Fx "$name" /tmp/lantern-release-assets >/dev/null
    done
    echo 'Release already published with the required assets.'
    exit 0
  fi
else
  gh release create v1.0.0 --verify-tag --draft --title 'Đảo Đèn Lồng v1.0.0' \
    --notes-file docs/notes/release-v1.0.0.md
fi
gh release upload v1.0.0 "$archive" docs/demo/demo.mp4 bench.json soak.json --clobber
gh release edit v1.0.0 --draft=false
echo "Submission repo: https://github.com/$GITHUB_REPOSITORY"
