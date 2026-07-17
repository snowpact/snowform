#!/bin/bash
set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Vérifier qu'on est sur main
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo -e "${RED}Error: Must be on main branch${NC}"
  exit 1
fi

# Vérifier pas de changements non commités
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}Error: Working directory not clean${NC}"
  exit 1
fi

# Type de release (patch par défaut)
RELEASE_TYPE=${1:-patch}

if [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo -e "${RED}Error: Invalid release type. Use: patch, minor, or major${NC}"
  exit 1
fi

# Vérifier l'auth npm avant tout commit/tag : npm renvoie un 404 trompeur
# sur les packages scopés quand le token est invalide.
echo -e "${YELLOW}Checking npm authentication...${NC}"
if ! NPM_USER=$(npm whoami --registry https://registry.npmjs.org/ 2>/dev/null); then
  echo -e "${RED}Error: Not authenticated to npm. Run 'npm login' first.${NC}"
  exit 1
fi
echo -e "${GREEN}Authenticated as ${NPM_USER}${NC}"

echo -e "${YELLOW}Starting release (${RELEASE_TYPE})...${NC}"

# Tests
echo -e "${YELLOW}Running tests...${NC}"
pnpm test

# Typecheck
echo -e "${YELLOW}Running typecheck...${NC}"
pnpm typecheck

# Build
echo -e "${YELLOW}Building...${NC}"
pnpm build

# Bump version
echo -e "${YELLOW}Bumping version (${RELEASE_TYPE})...${NC}"
npm version $RELEASE_TYPE --no-git-tag-version

# Get new version
VERSION=$(node -p "require('./package.json').version")

# Commit et tag
git add package.json
git commit -m "chore: release v${VERSION}"
git tag "v${VERSION}"

# Publish avant de pousser : un publish raté se rejoue, alors qu'un push raté
# après publish se rattrape par un simple retry. L'inverse impose de réécrire
# l'historique git pour resynchroniser.
echo -e "${YELLOW}Publishing to npm...${NC}"
npm publish --access public

# Push
echo -e "${YELLOW}Pushing to remote...${NC}"
git push origin main
git push origin "v${VERSION}"

echo -e "${GREEN}Successfully released v${VERSION}${NC}"
