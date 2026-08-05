import assert from "node:assert/strict"
import test from "node:test"

import { sortCatalog } from "./utils.ts"

const lowerRelevance = {
  name: "Alpha",
  metrics: { actions: 500 },
  tags: [],
  valueTags: [],
  useCases: [],
}
const higherRelevance = {
  name: "Zulu",
  metrics: { actions: 0 },
  tags: ["trusted"],
  valueTags: ["automation"],
  useCases: ["ship work"],
}

test("removed action sorting falls back to relevance without using action totals", () => {
  assert.deepEqual(sortCatalog([lowerRelevance, higherRelevance], "actions"), [
    higherRelevance,
    lowerRelevance,
  ])
})

test("name sorting remains available", () => {
  assert.deepEqual(sortCatalog([higherRelevance, lowerRelevance], "name"), [
    lowerRelevance,
    higherRelevance,
  ])
})
