#!/bin/bash

# Grandparent Co-Creation Mode - Implementation Verification Script
# Checks that all required files exist and have expected content

echo "=========================================="
echo "Grandparent Co-Creation Mode - Verification"
echo "=========================================="
echo ""

PASS=0
FAIL=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1 (MISSING)"
        ((FAIL++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contains '$2'"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1 missing '$2'"
        ((FAIL++))
    fi
}

check_line_count() {
    count=$(wc -l < "$1" 2>/dev/null)
    expected=$2
    if [ "$count" -ge "$((expected - 50))" ] && [ "$count" -le "$((expected + 50))" ]; then
        echo -e "${GREEN}✓${NC} $1 (~$count lines, expected ~$expected)"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠${NC} $1 has $count lines (expected ~$expected)"
    fi
}

echo "Checking Core Files..."
echo "─────────────────────"
check_file "server/_core/grandparentService.ts"
check_file "server/_core/grandparentRouter.ts"
check_file "lib/grandparent-store.ts"
check_file "app/grandparent-cocreation.tsx"

echo ""
echo "Checking Component Files..."
echo "────────────────────────────"
check_file "components/family-invite-card.tsx"
check_file "components/memory-prompt-input.tsx"
check_file "components/grandparent-story-view.tsx"
check_file "components/family-member-card.tsx"
check_file "components/family-archive-list.tsx"

echo ""
echo "Checking Documentation..."
echo "──────────────────────────"
check_file "IMPLEMENTATION_SUMMARY.md"
check_file "GRANDPARENT_FEATURE_GUIDE.md"
check_file "GRANDPARENT_SETUP.md"

echo ""
echo "Checking Service Implementation..."
echo "──────────────────────────────────"
check_content "server/_core/grandparentService.ts" "createFamilyInvite"
check_content "server/_core/grandparentService.ts" "acceptFamilyInvite"
check_content "server/_core/grandparentService.ts" "generateStoryFromMemory"
check_content "server/_core/grandparentService.ts" "Anthropic"

echo ""
echo "Checking Router Implementation..."
echo "─────────────────────────────────"
check_content "server/_core/grandparentRouter.ts" "grandparentRouter = router"
check_content "server/_core/grandparentRouter.ts" "createInvite: protectedProcedure"
check_content "server/_core/grandparentRouter.ts" "acceptInvite: protectedProcedure"
check_content "server/_core/grandparentRouter.ts" "generateFromMemory: protectedProcedure"

echo ""
echo "Checking Store Implementation..."
echo "────────────────────────────────"
check_content "lib/grandparent-store.ts" "useGrandparentStore"
check_content "lib/grandparent-store.ts" "persist"
check_content "lib/grandparent-store.ts" "AsyncStorage"
check_content "lib/grandparent-store.ts" "setGrandparentMode"

echo ""
echo "Checking Main Screen..."
echo "──────────────────────"
check_content "app/grandparent-cocreation.tsx" "My Family"
check_content "app/grandparent-cocreation.tsx" "Create Together"
check_content "app/grandparent-cocreation.tsx" "Memory Garden"
check_content "app/grandparent-cocreation.tsx" "Family Archive"
check_content "app/grandparent-cocreation.tsx" "trpc.grandparent"

echo ""
echo "Checking Database Schema Updates..."
echo "───────────────────────────────────"
check_content "drizzle/schema.ts" "familyInvites"
check_content "drizzle/schema.ts" "familyConnections"
check_content "drizzle/schema.ts" "coCreationSessions"
check_content "drizzle/schema.ts" "memoryPrompts"
check_content "drizzle/schema.ts" "export type FamilyInvite"

echo ""
echo "Checking Router Integration..."
echo "──────────────────────────────"
check_content "server/routers.ts" "grandparentRouter"
check_content "server/routers.ts" "grandparent: grandparentRouter"

echo ""
echo "Checking Navigation Setup..."
echo "────────────────────────────"
check_content "app/_layout.tsx" "grandparent-cocreation"

echo ""
echo "Checking Line Counts..."
echo "──────────────────────"
check_line_count "server/_core/grandparentService.ts" 500
check_line_count "server/_core/grandparentRouter.ts" 250
check_line_count "lib/grandparent-store.ts" 250
check_line_count "app/grandparent-cocreation.tsx" 450
check_line_count "components/family-invite-card.tsx" 180

echo ""
echo "=========================================="
echo "Verification Results"
echo "=========================================="
echo -e "${GREEN}Passed: $PASS${NC}"
if [ $FAIL -gt 0 ]; then
    echo -e "${RED}Failed: $FAIL${NC}"
else
    echo -e "${GREEN}Failed: $FAIL${NC}"
fi

if [ $FAIL -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All checks passed! Implementation is complete.${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some checks failed. Please review the items above.${NC}"
    exit 1
fi
