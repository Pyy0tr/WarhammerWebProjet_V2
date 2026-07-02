// CloudFront Function (viewer-request) — resolves extensionless SPA routes to
// their prerendered index.html.
//
// The S3 origin uses Origin Access Control (a private REST origin), not S3
// static-website-hosting mode — so CloudFront has no built-in "serve
// index.html for any directory" behavior. default_root_object only covers
// the exact root "/". Without this function, a request to e.g. /simulator
// finds no matching object key, gets a 403 from S3, and falls through to the
// custom_error_response 403/404 -> /index.html rewrite (see main.tf) — which
// serves the generic ROOT index.html, not frontend/scripts/generate-pages.js's
// page-specific dist/simulator/index.html. That file becomes unreachable even
// though it exists in the bucket, and crawlers see the homepage's canonical
// URL on every route (Google then refuses to index them as duplicates).
//
// This function only rewrites paths with no file extension, so it never
// touches actual assets (/assets/*.js, /data/*.json, /robots.txt, ...) or the
// custom_error_response fallback for genuinely unknown routes.
function handler(event) {
    var request = event.request;
    var uri = request.uri;

    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    } else if (!uri.includes('.')) {
        request.uri += '/index.html';
    }

    return request;
}
