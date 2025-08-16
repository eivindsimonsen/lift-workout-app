# PWA Setup Guide for Fremv

## What's Been Added

✅ **Vite PWA Plugin** - Automatically generates service worker and manifest
✅ **PWA Install Prompt** - Shows users they can install the app
✅ **Offline Indicator** - Shows when the app is offline
✅ **Service Worker** - Handles caching and offline functionality
✅ **Web App Manifest** - Makes the app installable
✅ **PWA Meta Tags** - Optimizes for mobile and app-like experience

## Testing Locally

### 1. Start Development Server

```bash
npm run dev
```

### 2. Test PWA Features

- **Install Prompt**: Should appear on supported browsers/devices
- **Offline Mode**: Use Chrome DevTools → Network → Offline
- **Service Worker**: Check Application → Service Workers in DevTools

### 3. Test Installation

- **Chrome/Edge**: Look for install icon in address bar
- **Mobile**: "Add to Home Screen" option
- **PWA Install Prompt**: Should show at bottom of screen

## Building for Production

```bash
npm run build:pwa
```

This will generate:

- Service worker files
- PWA manifest
- Optimized assets for offline use

## What You Need to Replace Later

### Icons

- `public/icon-192.png` - 192x192 PNG icon
- `public/icon-512.png` - 512x512 PNG icon
- `public/favicon.ico` - Standard favicon
- `public/apple-touch-icon.png` - iOS home screen icon

### Branding

- App name in `vite.config.ts` (currently "Fremv")
- Colors in manifest (currently using your dark theme)
- Description and metadata

## PWA Features Working

- ✅ **Offline Caching** - App assets cached for offline use
- ✅ **Installable** - Can be added to home screen
- ✅ **App-like Experience** - Full-screen, no browser UI
- ✅ **Service Worker** - Background sync and caching
- ✅ **Responsive Design** - Already mobile-optimized

## Browser Support

- **Chrome/Edge**: Full PWA support
- **Firefox**: Full PWA support
- **Safari**: Limited PWA support (iOS 11.3+)
- **Mobile Browsers**: Can add to home screen

## Next Steps

1. **Test locally** with `npm run dev`
2. **Create proper icons** (replace placeholder files)
3. **Customize branding** in `vite.config.ts`
4. **Test offline functionality**
5. **Deploy and test installation**

## Troubleshooting

- **Install prompt not showing**: Check browser support and service worker registration
- **Icons not loading**: Replace placeholder files with actual PNG/ICO files
- **Offline not working**: Check service worker in DevTools → Application
- **Build errors**: Ensure all dependencies are installed

## PWA Checklist

- [x] Service Worker
- [x] Web App Manifest
- [x] Install Prompt
- [x] Offline Support
- [x] Responsive Design
- [x] HTTPS (for production)
- [ ] Custom Icons
- [ ] Brand Customization
- [ ] Push Notifications (future)
- [ ] Background Sync (future)
