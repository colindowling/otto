# otto

Static site for [withants.com](https://www.withants.com/).

## Staging

Swap one placeholder when each ID arrives.

### Google Search Console

Each page has its own `<head>`. The verification tag is on the homepage, which is the URL Search Console checks.

In `index.html`, replace `GSC_VERIFICATION_PLACEHOLDER` in this tag:

```html
<meta name="google-site-verification" content="GSC_VERIFICATION_PLACEHOLDER">
```

That is the whole change. The tag name stays as it is.

### GA4

Already staged in [PR #5](https://github.com/colindowling/otto/pull/5). This change leaves that snippet where it is.

When that PR is merged, the Measurement ID is `GA4_ID` in `assets/track.js` (line 5 on that branch):

```js
const GA4_ID = 'G-XXXXXXXXXX';
```

Replace `G-XXXXXXXXXX` with the real `G-` ID. While the constant is still that placeholder, the file does not load `gtag.js`.
