import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function fullMusicApiPlugin(): Plugin {
  const setupMiddleware = (server: any) => {
    // 1. Resolve YouTube video ID for any song query
    server.middlewares.use('/api/resolve-youtube', async (req: any, res: any) => {
      try {
        const parsedUrl = new URL(req.url || '', 'http://localhost');
        const query = parsedUrl.searchParams.get('q') || '';
        if (!query.trim()) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing query parameter q' }));
          return;
        }

        // Clean query and search with fallback variations
        const cleanQuery = query.replace(/[^\w\s-]/gi, ' ').trim();
        const searchVariations = [
          `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery + ' song')}`,
          `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`,
        ];

        let videoId: string | null = null;

        for (const ytUrl of searchVariations) {
          try {
            const fetchRes = await fetch(ytUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+478;',
              },
            });
            const html = await fetchRes.text();
            const m1 = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
            const m2 = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
            videoId = m1 ? m1[1] : m2 ? m2[1] : null;
            if (videoId) break;
          } catch {}
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ videoId, query }));
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
      }
    });

    // 2. Universal music search across YouTube & global music cloud
    server.middlewares.use('/api/search-full-music', async (req: any, res: any) => {
      try {
        const parsedUrl = new URL(req.url || '', 'http://localhost');
        const query = parsedUrl.searchParams.get('q') || '';
        const limit = Math.min(25, parseInt(parsedUrl.searchParams.get('limit') || '12', 10));

        if (!query.trim()) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ results: [] }));
          return;
        }

        const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' song audio')}`;
        const fetchRes = await fetch(ytUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+478;',
          },
        });
        const html = await fetchRes.text();

        const videoIds: string[] = [];
        const regex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
        let match;
        while ((match = regex.exec(html)) !== null && videoIds.length < limit) {
          const id = match[1];
          if (!videoIds.includes(id)) {
            videoIds.push(id);
          }
        }

        // Fetch oEmbed details for each video in parallel
        const results = await Promise.all(
          videoIds.map(async (vid) => {
            try {
              const oeRes = await fetch(
                `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`
              );
              if (!oeRes.ok) return null;
              const data = await oeRes.json();
              const rawTitle = data.title || 'Unknown Song';
              let title = rawTitle;
              let artist = data.author_name || 'Music Artist';

              // Clean common YouTube title patterns like "Artist - Title (Official Video)"
              if (rawTitle.includes(' - ')) {
                const parts = rawTitle.split(' - ');
                artist = parts[0].trim();
                title = parts.slice(1).join(' - ').trim();
              } else if (rawTitle.includes(' | ')) {
                const parts = rawTitle.split(' | ');
                title = parts[0].trim();
                artist = parts[1].trim();
              }

              // Remove video tags from title
              title = title
                .replace(/\(Official.*?\)/gi, '')
                .replace(/\[Official.*?\]/gi, '')
                .replace(/\(Audio.*?\)/gi, '')
                .replace(/\[Audio.*?\]/gi, '')
                .replace(/\(Video.*?\)/gi, '')
                .replace(/\[Video.*?\]/gi, '')
                .replace(/\(Lyric.*?\)/gi, '')
                .replace(/\[Lyric.*?\]/gi, '')
                .replace(/HD|4K|Full Song|Lyrical/gi, '')
                .trim();

              const lowerText = `${rawTitle} ${artist}`.toLowerCase();
              let detectedLang = 'english';
              if (/kannada|sandalwood|kantara|kgf|chandan|sanjith|vijay prakash|charan raj|ajaneesh/i.test(lowerText)) {
                detectedLang = 'kannada';
              } else if (/hindi|bollywood|arijit|shreya|anuv jain|pritam|bad newz|animal|jawan|sufi|punjabi/i.test(lowerText)) {
                detectedLang = 'hindi';
              }

              return {
                id: `yt-${vid}`,
                youtubeId: vid,
                title: title || rawTitle,
                artist: artist,
                artistId: `art-yt-${vid}`,
                album: rawTitle.includes('from') ? rawTitle.split('from')[1].trim() : 'Single',
                coverUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                genre: detectedLang === 'kannada' ? 'Kannada Hits' : detectedLang === 'hindi' ? 'Hindi / Bollywood' : 'Pop / Global',
                duration: 215,
                releaseYear: 2024,
                monthlyListeners: 18000000,
                energy: 0.8,
                acousticness: 0.2,
                melancholy: 0.35,
                obscurity: 0.05,
                tags: ['full song', 'youtube stream', detectedLang],
                isSpotifyHit: true,
                popularity: 90,
                fullSongAvailable: true,
                language: detectedLang,
              };
            } catch {
              return null;
            }
          })
        );

        const validResults = results.filter(Boolean);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ results: validResults }));
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message, results: [] }));
      }
    });

    // 3. oEmbed video info for pasted links
    server.middlewares.use('/api/oembed-info', async (req: any, res: any) => {
      try {
        const parsedUrl = new URL(req.url || '', 'http://localhost');
        const videoId = parsedUrl.searchParams.get('id');
        const targetUrl = parsedUrl.searchParams.get('url');

        const ytUrl = targetUrl || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');
        if (!ytUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing id or url parameter' }));
          return;
        }

        const oeRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(ytUrl)}&format=json`
        );
        if (!oeRes.ok) {
          res.statusCode = oeRes.status;
          res.end(JSON.stringify({ error: 'Could not fetch oEmbed metadata' }));
          return;
        }
        const data = await oeRes.json();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  };

  return {
    name: 'full-music-api-plugin',
    configureServer(server) {
      setupMiddleware(server);
    },
    configurePreviewServer(server) {
      setupMiddleware(server);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        manifest: {
          id: '/',
          name: 'IndieWave - Music App',
          short_name: 'IndieWave',
          description: 'Stream underground indie hits, personalized discovery radar, and real-time D3 frequency visualizer.',
          theme_color: '#0f0f12',
          background_color: '#0f0f12',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          categories: ['music', 'entertainment', 'audio'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: 'Discovery Radar',
              short_name: 'Discover',
              description: 'Explore trending underground indie tracks',
              url: '/?tab=discover',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'D3 Visualizer',
              short_name: 'Visualizer',
              description: 'Watch frequency spectrum react live to audio',
              url: '/?action=visualizer',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      fullMusicApiPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

