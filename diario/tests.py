from django.test import TestCase
from django.urls import reverse


class PublicPagesTests(TestCase):
    def test_home_is_available(self):
        response = self.client.get(reverse("home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "DAXIAN")
        self.assertContains(response, "PERSONAL ARCHIVE")
        self.assertContains(response, "love-song.mp3")
        self.assertContains(response, "Esto es con amor y directo de mí para ti")

    def test_search_engine_files_are_available(self):
        robots = self.client.get(reverse("robots"))
        sitemap = self.client.get(reverse("sitemap"))

        self.assertEqual(robots.status_code, 200)
        self.assertIn("Sitemap:", robots.content.decode())
        self.assertEqual(sitemap.status_code, 200)
        self.assertIn("<urlset", sitemap.content.decode())
