# WhatsApp Sharing Guide

## Configuration Added

WhatsApp sharing has been optimized with the following:

### Meta Tags Added

```html
<!-- WhatsApp Sharing Optimization -->
<meta property="og:image" content="https://cerebra.ai/cerebra-logo.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:alt" content="Cerebra Knowledge Network" />
```

### Image Requirements

**Current Image:** `cerebra-logo.png`
- **Dimensions:** 1200x630 pixels (optimal for social sharing)
- **Format:** PNG
- **Size:** < 5MB
- **URL:** https://cerebra.ai/cerebra-logo.png

### How WhatsApp Sharing Works

1. **Share Link in WhatsApp**
   - User shares: `https://cerebra.ai`
   - WhatsApp fetches Open Graph (og:) meta tags
   - Displays preview with image, title, and description

2. **Image Selection Priority**
   - WhatsApp uses the first `og:image` found
   - Falls back to Twitter card image
   - Falls back to favicon if no og:image

3. **Preview Display**
   - **Title:** "Cerebra — Knowledge Visualized"
   - **Description:** "Explore the universe of human knowledge as a living 3D neural network"
   - **Image:** cerebra-logo.png (1200x630)

## Testing WhatsApp Sharing

### Method 1: WhatsApp Web
1. Open WhatsApp Web
2. Click share button in chat
3. Paste link: `https://cerebra.ai`
4. Verify preview shows correct image

### Method 2: Mobile App
1. Open WhatsApp on mobile
2. Copy/paste link in chat
3. Preview should auto-load
4. Tap to expand preview

### Method 3: Open Graph Debugger
- **Facebook Debugger:** https://developers.facebook.com/tools/debug/og/object
- **LinkedIn Debugger:** https://www.linkedin.com/feed/debug/posts/
- Paste URL and refresh to see parsed tags

## Metadata Structure

```
Open Graph (WhatsApp Primary):
├── og:title
├── og:description
├── og:url
├── og:type
├── og:image
│   ├── og:image:width: 1200
│   ├── og:image:height: 630
│   ├── og:image:type: image/png
│   └── og:image:alt
├── og:locale
└── og:site_name

Twitter Card (Fallback):
├── twitter:card: summary_large_image
├── twitter:title
├── twitter:description
└── twitter:image
```

## Image Optimization Tips

### If You Want to Create a Custom WhatsApp Image:

1. **Optimal Size:** 1200x630 pixels (16:9 ratio)
2. **Alternative:** 1200x1200 pixels (1:1 square)
3. **File Format:** PNG or JPG
4. **File Size:** < 5MB
5. **Content:** Should include:
   - Brand/logo
   - Clear message
   - High contrast
   - Readable on small screens

### Current Images Used:
- **Primary:** `/cerebra-logo.png` (1200x630)
- **Fallback:** `/android-chrome-512x512.png` (512x512)
- **Apple:** `/apple-touch-icon.png` (180x180)

## Troubleshooting

### Image Not Showing in WhatsApp Preview

1. **Check Image URL**
   - Must be absolute URL (https://cerebra.ai/...)
   - Must be publicly accessible
   - Verify domain is correct

2. **Clear WhatsApp Cache**
   - WhatsApp caches previews
   - Share link again after 15 minutes
   - Or use WhatsApp Web for fresh fetch

3. **Verify Meta Tags**
   ```bash
   # Using curl to check headers
   curl -I https://cerebra.ai/
   
   # Check full HTML for og: tags
   curl https://cerebra.ai/ | grep "og:"
   ```

4. **Use Facebook Debugger**
   - Scrape URL again to refresh cache
   - View parsed tags
   - Check for warnings/errors

### Image Dimensions Wrong

- Ensure `og:image:width` = 1200
- Ensure `og:image:height` = 630
- Avoid images smaller than 200x200px

### Multiple Images Issue

If multiple images show in preview:
1. Only first `og:image` is used
2. Remove duplicate og:image tags
3. Twitter card image is fallback only

## Advanced: Dynamic Sharing

If you need dynamic sharing based on route:

```tsx
// Create dynamic metadata
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  return {
    openGraph: {
      images: ["https://cerebra.ai/custom-image.png"],
    },
  }
}
```

## Resources

- [Open Graph Protocol](https://ogp.me/)
- [Meta for Developers](https://developers.facebook.com/docs/sharing/webmasters/)
- [WhatsApp Link Sharing](https://www.whatsapp.com/contact/)
- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
