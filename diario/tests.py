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
        self.assertNotContains(response, 'rel="preload" href="/static/diario/audio/love-song.mp3"')
        self.assertContains(response, "A LETTER / FOR DAXIAN")
        self.assertContains(response, "PRIVATE EDITION")
        self.assertContains(response, "avec tout mon cœur")
        self.assertContains(response, "This is with love, straight from me to you; simply, it is my heart.")
        self.assertContains(response, "Maybe some feelings are not meant to become a life we can hold.")
        self.assertContains(response, 'class="archive-index"')
        self.assertContains(response, "23 photographs")
        self.assertContains(response, "19 moments · with our song")
        self.assertContains(response, "twenty-three photographs")
        self.assertContains(response, 'id="handwritten"')
        self.assertContains(response, "handwritten-mon-amour.png")
        self.assertContains(response, "Some feelings deserve")
        self.assertContains(response, "Read the handwritten words")
        self.assertContains(response, 'href="#handwritten"')
        self.assertContains(response, 'id="page-progress-bar"')
        self.assertContains(response, 'id="lightbox-counter"')
        self.assertContains(response, 'data-play-film')
        self.assertContains(response, 'data-toggle-film')
        self.assertContains(response, 'data-film-progress')
        self.assertContains(response, 'aria-expanded="false"')
        self.assertContains(response, "site-20261026.css", html=False)
        self.assertContains(response, "atelier-20261028.css", html=False)
        self.assertContains(response, "archive-20261028.js", html=False)
        self.assertContains(response, '<span id="lightbox-counter">01 / 19</span>')
        self.assertEqual(response.content.count(b"diario/images/"), 25)
        self.assertEqual(response.content.count(b'class="photo-item'), 19)
        for filename in (
            "5095980453805624465.jpg",
            "5095980453805624466.jpg",
            "5095980453805624472.jpg",
            "5095980453805624467-soft-focus.jpg",
            "5095980453805624468-soft-focus.jpg",
        ):
            self.assertContains(response, filename)
        self.assertNotContains(response, "5041922874431704504.jpg")
        self.assertNotContains(response, "5041922874431704505.jpg")
        self.assertLess(
            response.content.index(b'id="letter"'),
            response.content.index(b'id="handwritten"'),
        )
        self.assertLess(
            response.content.index(b'id="handwritten"'),
            response.content.index(b'id="photo-grid"'),
        )

    def test_home_keeps_five_chapter_navigation_and_accessible_overlays(self):
        response = self.client.get(reverse("home"))

        self.assertEqual(response.content.count(b"data-section-link"), 5)
        self.assertContains(response, 'aria-labelledby="lightbox-title"')
        self.assertContains(response, 'aria-describedby="lightbox-caption"')
        self.assertContains(response, 'aria-live="polite"')
        self.assertContains(response, 'id="audio-seek"')
        self.assertContains(response, 'aria-controls="archive-audio"', count=2)
        self.assertContains(response, 'aria-pressed="false"', count=2)
        self.assertNotContains(response, 'id="lightbox-image" src=""')
        self.assertContains(response, 'class="song-wave"')
        self.assertContains(response, 'class="closing__seal"')
        self.assertContains(response, "ONE PAGE / KEPT CLOSE")

    def test_search_engine_files_are_available(self):
        robots = self.client.get(reverse("robots"))
        sitemap = self.client.get(reverse("sitemap"))

        self.assertEqual(robots.status_code, 200)
        self.assertIn("Sitemap:", robots.content.decode())
        self.assertEqual(sitemap.status_code, 200)
        self.assertIn("<urlset", sitemap.content.decode())
