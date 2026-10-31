import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import check_links


def fake(statuses):
    """A fetch that answers from a dict and records what it was asked."""
    asked = []

    def get(url):
        asked.append(url)
        status = statuses[url]
        if isinstance(status, Exception):
            raise status
        return status
    get.asked = asked
    return get


class TestCheckLinks(unittest.TestCase):
    def test_collects_every_link_the_app_shows(self):
        links = check_links.collect()
        tables = {ref.split()[0] for refs in links.values() for ref in refs}
        self.assertEqual(tables, {"learning_resources.csv", "courses.csv", "certifications.csv", "projects.csv"})
        # a course used for two skills is checked once
        self.assertGreater(len(links["https://learn.microsoft.com/en-us/training/paths/get-started-querying-with-transact-sql/"]), 1)

    def test_status_kinds(self):
        get = fake({"https://a.org/": 200, "https://b.org/": 404, "https://c.org/": 403})
        self.assertEqual(check_links.check("https://a.org/", get)[0], "ok")
        self.assertEqual(check_links.check("https://b.org/", get)[0], "broken")
        self.assertEqual(check_links.check("https://c.org/", get)[0], "blocked")

    def test_youtube_goes_through_oembed(self):
        url = "https://www.youtube.com/watch?v=gone"
        oembed = "https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dgone"
        get = fake({oembed: 404})
        kind, detail = check_links.check(url, get)
        self.assertEqual(get.asked, [oembed])
        self.assertEqual(kind, "broken")
        self.assertIn("removed", detail)

    def test_network_error_is_retried_once(self):
        calls = iter([TimeoutError("slow"), 200])

        def get(url):
            result = next(calls)
            if isinstance(result, Exception):
                raise result
            return result
        self.assertEqual(check_links.check("https://a.org/", get)[0], "ok")
        self.assertEqual(check_links.check("https://b.org/", fake({"https://b.org/": OSError("no dns")}))[0], "broken")

    def test_check_all(self):
        get = fake({"https://a.org/": 200, "https://b.org/": 500})
        results = check_links.check_all({"https://a.org/": ["x"], "https://b.org/": ["y"]}, get)
        self.assertEqual({u: k for u, (k, _) in results.items()}, {"https://a.org/": "ok", "https://b.org/": "broken"})


if __name__ == "__main__":
    unittest.main()
