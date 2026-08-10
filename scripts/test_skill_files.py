from __future__ import annotations

import hashlib
from pathlib import Path
import re
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[1]
SKILL_FILES = ROOT / "scripts" / "lib" / "skill-files.sh"


def asset_name(skill: str, relative_path: str) -> str:
    completed = subprocess.run(
        [
            "bash",
            "-c",
            '. "$1"; skill_file_asset_name "$2" "$3"',
            "skill-file-test",
            str(SKILL_FILES),
            skill,
            relative_path,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return completed.stdout


def github_asset_name(name: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9._-]", ".", name)
    return re.sub(r"\.{2,}", ".", normalized)


class SkillFileAssetNameTests(unittest.TestCase):
    def test_current_companion_assets_are_unique_and_provider_stable(self) -> None:
        generated: list[str] = []
        for skill_dir in sorted((ROOT / "skills").iterdir()):
            if not skill_dir.is_dir():
                continue
            for file_path in sorted(skill_dir.rglob("*")):
                if not file_path.is_file() or file_path.name == "SKILL.md":
                    continue
                relative_path = file_path.relative_to(skill_dir).as_posix()
                name = asset_name(skill_dir.name, relative_path)
                self.assertEqual(github_asset_name(name), name)
                generated.append(name)

        self.assertTrue(generated, "expected at least one companion skill asset")
        self.assertEqual(len(generated), len(set(generated)))

    def test_nested_and_hidden_paths_survive_github_asset_normalization(self) -> None:
        for relative_path in (
            "assets/near-presentation-template.html",
            ".smoke-fixtures.json",
        ):
            generated = asset_name("presentation-generation", relative_path)
            self.assertEqual(github_asset_name(generated), generated)

    def test_provider_normalization_cannot_collapse_distinct_relative_paths(self) -> None:
        nested = github_asset_name(asset_name("example", "assets/template.html"))
        dotted = github_asset_name(asset_name("example", "assets.template.html"))
        self.assertNotEqual(nested, dotted)

    def test_asset_name_is_path_addressed(self) -> None:
        relative_path = "assets/near-presentation-template.html"
        path_digest = hashlib.sha256(relative_path.encode()).hexdigest()
        self.assertEqual(
            asset_name("presentation-generation", relative_path),
            f"presentation-generation.files.{path_digest}",
        )


if __name__ == "__main__":
    unittest.main()
