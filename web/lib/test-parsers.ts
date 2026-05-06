import { parseToolValueMetadata, parseSkillFrontmatter, parseTrackingTable } from './catalog-parsers.ts';
import assert from 'assert';

function testToolValueMetadata() {
  console.log('Testing parseToolValueMetadata...');
  const readme = `
# My Tool
**Value Prop:** This tool saves time by automating X.
**Value Tags:** automation, productivity, time-saver
`;
  const result = parseToolValueMetadata(readme);
  assert.strictEqual(result.valueProp, 'This tool saves time by automating X.');
  assert.deepStrictEqual(result.valueTags, ['automation', 'productivity', 'time-saver']);
  console.log('PASS: parseToolValueMetadata');
}

function testSkillFrontmatter() {
  console.log('Testing parseSkillFrontmatter...');
  const yaml = `---
name: My Skill
version: 1.0.0
description: A great skill
tags:
  - tag1
value_prop: A great skill for Y.
value_tags:
  - analytics
  - reporting
---`;
  const result = parseSkillFrontmatter(yaml);
  assert.strictEqual(result.valueProp, 'A great skill for Y.');
  assert.deepStrictEqual(result.valueTags, ['analytics', 'reporting']);
  console.log('PASS: parseSkillFrontmatter');
}

function testTrackingTable() {
  console.log('Testing parseTrackingTable...');
  
  // Tools Table
  const toolsTable = `
## Tools
| Name | Status | Version | Value Prop | Value Tags | Description | Limits | Author |
| --- | --- | --- | --- | --- | --- | --- | --- |
| \`my-tool\` | live | 1.0.0 | Saves time | speed, auto | Does things | None | Alice |
`;
  const tools = parseTrackingTable(toolsTable, 'Tools');
  const tool = tools.get('my-tool');
  assert.ok(tool);
  assert.strictEqual(tool.valueProp, 'Saves time');
  assert.deepStrictEqual(tool.valueTags, ['speed', 'auto']);
  assert.strictEqual(tool.author, 'Alice');

  // Skills Table
  const skillsTable = `
## Skills
| Name | Trunk | Status | Version | Value Prop | Value Tags | Description | Author |
| --- | --- | --- | --- | --- | --- | --- | --- |
| \`my-skill\` | main | live | 1.1.0 | Enhances UI | ui, ux | Better UI | Bob |
`;
  const skills = parseTrackingTable(skillsTable, 'Skills');
  const skill = skills.get('my-skill');
  assert.ok(skill);
  assert.strictEqual(skill.trunk, 'main');
  assert.strictEqual(skill.valueProp, 'Enhances UI');
  assert.deepStrictEqual(skill.valueTags, ['ui', 'ux']);
  assert.strictEqual(skill.author, 'Bob');

  console.log('PASS: parseTrackingTable');
}

try {
  testToolValueMetadata();
  testSkillFrontmatter();
  testTrackingTable();
  console.log('\nAll tests passed!');
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
}
