import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import Mock, patch

from token_buster.core.watcher import ChangeHandler, _should_watch


class ShouldWatchTests(unittest.TestCase):
    def test_watches_dotenv_files(self):
        self.assertTrue(_should_watch(".env"))
        self.assertTrue(_should_watch(".env.local"))
        self.assertTrue(_should_watch("project/.env.development"))

    def test_ignores_other_hidden_files_and_directories(self):
        self.assertFalse(_should_watch(".secret.py"))
        self.assertFalse(_should_watch(".hidden/config.py"))
        self.assertFalse(_should_watch("project/.hidden/config.py"))

    def test_watches_supported_source_files(self):
        self.assertTrue(_should_watch("project/main.py"))

    def test_does_not_persist_dotenv_contents(self):
        with TemporaryDirectory() as directory:
            env_path = Path(directory) / ".env"
            env_path.write_text("API_KEY=secret-value", encoding="utf-8")
            database = Mock()
            engine = Mock()
            engine.count_tokens.return_value = 4

            with patch(
                "token_buster.core.watcher.get_db", return_value=database
            ), patch("token_buster.core.watcher.get_engine", return_value=engine):
                ChangeHandler(project_id=1)._process_change(str(env_path), "modified")

            self.assertEqual(database.log_file_change.call_args.kwargs["content_snapshot"], "")
            self.assertEqual(database.log_file_change.call_args.kwargs["token_count"], 4)


if __name__ == "__main__":
    unittest.main()
