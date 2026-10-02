from django.http import HttpResponse
from django.shortcuts import render
from django.urls import reverse


# Centralized presentation settings. Replace only these values when the archive
# receives its final public identity; templates do not contain owner-specific data.
SITE_CONFIG = {
    "name": "DAXIAN",
    "descriptor": "PERSONAL ARCHIVE",
    "year": "2026",
    "email": "",
}


def home(request):
    return render(request, "diario/home.html", {"site": SITE_CONFIG})


def robots_txt(request):
    sitemap_url = request.build_absolute_uri(reverse("sitemap"))
    return HttpResponse(
        f"User-agent: *\nAllow: /\nSitemap: {sitemap_url}\n",
        content_type="text/plain; charset=utf-8",
    )


def sitemap_xml(request):
    home_url = request.build_absolute_uri(reverse("home"))
    return HttpResponse(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"
        f"<url><loc>{home_url}</loc></url>"
        "</urlset>",
        content_type="application/xml; charset=utf-8",
    )


def page_not_found(request, exception):
    return render(request, "diario/404.html", {"site": SITE_CONFIG}, status=404)
