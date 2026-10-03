from django.test import TestCase
from django.urls import reverse


class PublicPagesTests(TestCase):
    def test_home_is_available(self):
        response = self.client.get(reverse("home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "DAXIAN")
        self.assertContains(response, "PERSONAL ARCHIVE")
        self.assertContains(response, "love-song.mp3")
        self.assertContains(response, 'autoplay playsinline preload="auto"')
        self.assertContains(response, "A LETTER / FOR DAXIAN")
        self.assertContains(response, "avec tout mon cœur")
        self.assertContains(response, "This is with love, straight from me to you; simply, it is my heart.")
        self.assertContains(response, 'id="handwritten"')
        self.assertContains(response, "handwritten-mon-amour.png")
        self.assertContains(response, "Some feelings deserve")
        self.assertContains(response, "Read the handwritten words")
        self.assertContains(response, 'href="#handwritten"')
        self.assertEqual(response.content.count(b"diario/images/"), 20)
        self.assertNotContains(response, "5041922874431704504.jpg")
        self.assertLess(
            response.content.index(b'id="letter"'),
            response.content.index(b'id="handwritten"'),
        )
        self.assertLess(
            response.content.index(b'id="handwritten"'),
            response.content.index(b'id="photo-grid"'),
        )

    def test_search_engine_files_are_available(self):
        robots = self.client.get(reverse("robots"))
        sitemap = self.client.get(reverse("sitemap"))

        self.assertEqual(robots.status_code, 200)
        self.assertIn("Sitemap:", robots.content.decode())
        self.assertEqual(sitemap.status_code, 200)
        self.assertIn("<urlset", sitemap.content.decode())
