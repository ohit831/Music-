import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { buildAudioSearchQueries, isAuthenticAudioCandidate } from './src/utils/backgroundPlayback';

const audioStreamCache = new Map<string, { audioUrl: string; isFullLength: boolean; duration?: number; source: 'saavn' | 'itunes' }>();

function fullMusicApiPlugin(): Plugin {
  const setupMiddleware = (server: any) => {
    // 1. Resolve YouTube video ID for any song query (supports Kannada, Hindi, and all Unicode)
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

        // Clean query preserving all Unicode languages (Kannada, Hindi, etc.)
        const cleanQuery = query.replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
        const searchVariations = [
          `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery + ' official audio')}`,
          `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery + ' song')}`,
          `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`,
        ];

        let videoId: string | null = null;
        const candidates: string[] = [];

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

            // Try parsing ytInitialData for exact videoRenderers
            const initialMatch =
              html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
              html.match(/ytInitialData\s*=\s*({.+?});/s);

            if (initialMatch) {
              try {
                const data = JSON.parse(initialMatch[1]);
                const walk = (obj: any) => {
                  if (!obj || typeof obj !== 'object') return;
                  if (obj.videoRenderer?.videoId) {
                    const vid = obj.videoRenderer.videoId;
                    if (!candidates.includes(vid)) {
                      candidates.push(vid);
                    }
                  }
                  for (const k of Object.keys(obj)) {
                    walk(obj[k]);
                  }
                };
                walk(data);
              } catch {}
            }

            // Fallback regex match if candidates empty
            if (candidates.length === 0) {
              const regex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
              let m;
              while ((m = regex.exec(html)) !== null) {
                if (!candidates.includes(m[1])) {
                  candidates.push(m[1]);
                }
                if (candidates.length >= 8) break;
              }
            }

            if (candidates.length > 0) {
              videoId = candidates[0];
              break;
            }
          } catch {}
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ videoId, candidates, query }));
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
      }
    });

    // 2. Universal music search across YouTube & global music cloud with Unlimited Full Songs & Albums
    server.middlewares.use('/api/search-full-music', async (req: any, res: any) => {
      try {
        const parsedUrl = new URL(req.url || '', 'http://localhost');
        const query = parsedUrl.searchParams.get('q') || '';
        const requestedLimit = Math.min(100, Math.max(10, parseInt(parsedUrl.searchParams.get('limit') || '35', 10)));
        const page = Math.max(1, parseInt(parsedUrl.searchParams.get('page') || '1', 10));

        if (!query.trim()) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ results: [], totalResults: 0, hasMore: false }));
          return;
        }

        const clean = query.trim();
        const lowerClean = clean.toLowerCase();

        // Build intelligent query variants for unlimited music and full album discovery
        let queryVariants: string[] = [];
        if (lowerClean === 'kannada' || lowerClean === 'ಕನ್ನಡ') {
          if (page === 1) {
            queryVariants = [
              'kannada all songs album jukebox',
              'kannada super hit songs full audio',
              'kannada new movie songs 2024',
            ];
          } else if (page === 2) {
            queryVariants = [
              'kannada 90s golden hits songs jukebox',
              'kannada romantic melodies all songs',
              'dr rajkumar spb kannada hits',
            ];
          } else {
            queryVariants = [
              'kannada all time blockbuster songs jukebox',
              'sanjith hegde vijay prakash kannada songs',
              'kantara kgf kannada songs collection',
            ];
          }
        } else if (lowerClean === 'hindi' || lowerClean === 'bollywood' || lowerClean === 'हिन्दी') {
          if (page === 1) {
            queryVariants = [
              'hindi all songs album jukebox',
              'bollywood hit songs 2024 full audio',
              'arijit singh all songs full album',
            ];
          } else if (page === 2) {
            queryVariants = [
              'hindi 90s evergreen songs jukebox',
              'bollywood romantic songs all album',
              'sonu nigam shreya ghoshal hindi hits',
            ];
          } else {
            queryVariants = [
              'bollywood party songs all jukebox',
              'hindi sufi acoustic indie songs',
              'bollywood golden era retro hits',
            ];
          }
        } else if (lowerClean.includes('90s') || lowerClean.includes('retro')) {
          queryVariants = [
            `${clean} songs full album jukebox`,
            `${clean} super hits all songs audio`,
          ];
        } else {
          // Specific artist or track search
          if (page === 1) {
            queryVariants = [
              `${clean} full song audio`,
              `${clean} songs album`,
              `${clean} all songs jukebox`,
            ];
          } else {
            queryVariants = [
              `${clean} all songs jukebox collection`,
              `${clean} official jukebox`,
              `${clean} live hits`,
            ];
          }
        }

        // Helper to parse duration string like "3:45" or "1:15:20" into seconds
        const parseDurationToSeconds = (durStr: string): number => {
          if (!durStr) return 210;
          const parts = durStr.split(':').map((p) => parseInt(p, 10));
          if (parts.length === 3) {
            return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
          }
          if (parts.length === 2) {
            return (parts[0] || 0) * 60 + (parts[1] || 0);
          }
          return 210;
        };

        const collectedTracks: any[] = [];
        const seenVideoIds = new Set<string>();

        // Query YouTube across variants in parallel
        await Promise.all(
          queryVariants.map(async (searchQuery) => {
            try {
              const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
              const fetchRes = await fetch(ytUrl, {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept-Language': 'en-US,en;q=0.9',
                  'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+478;',
                },
              });
              const html = await fetchRes.text();

              // 1. Try parsing ytInitialData directly for rich metadata
              const initialDataMatch =
                html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
                html.match(/ytInitialData\s*=\s*({.+?});/s);

              if (initialDataMatch) {
                try {
                  const data = JSON.parse(initialDataMatch[1]);
                  const walk = (obj: any) => {
                    if (!obj || typeof obj !== 'object') return;
                    if (obj.videoRenderer) {
                      const vr = obj.videoRenderer;
                      const videoId = vr.videoId;
                      if (videoId && !seenVideoIds.has(videoId)) {
                        seenVideoIds.add(videoId);

                        const rawTitle =
                          vr.title?.runs?.map((r: any) => r.text).join('') ||
                          vr.title?.simpleText ||
                          'YouTube Track';
                        const artist =
                          vr.ownerText?.runs?.map((r: any) => r.text).join('') ||
                          'Music Artist';
                        const lengthStr = vr.lengthText?.simpleText || '';
                        const durSeconds = parseDurationToSeconds(lengthStr);
                        const viewsText = vr.viewCountText?.simpleText || '';
                        const bestThumb =
                          vr.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
                          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

                        // Clean title
                        let cleanTitle = rawTitle;
                        if (cleanTitle.includes(' - ')) {
                          const parts = cleanTitle.split(' - ');
                          cleanTitle = parts.slice(1).join(' - ').trim();
                        } else if (cleanTitle.includes(' | ')) {
                          const parts = cleanTitle.split(' | ');
                          cleanTitle = parts[0].trim();
                        }
                        cleanTitle = cleanTitle
                          .replace(/\(Official.*?\)/gi, '')
                          .replace(/\[Official.*?\]/gi, '')
                          .replace(/\(Audio.*?\)/gi, '')
                          .replace(/\[Audio.*?\]/gi, '')
                          .replace(/\(Video.*?\)/gi, '')
                          .replace(/\[Video.*?\]/gi, '')
                          .replace(/\(Lyric.*?\)/gi, '')
                          .replace(/\[Lyric.*?\]/gi, '')
                          .replace(/HD|4K|Full Song|Lyrical Video/gi, '')
                          .trim();

                        const lowerAll = `${rawTitle} ${artist}`.toLowerCase();
                        let detectedLang = 'english';
                        if (
                          /kannada|sandalwood|kantara|kgf|chandan|sanjith|vijay prakash|charan raj|ajaneesh|rajkumar|spb|hamsalekha|anand audio|jhankar/i.test(
                            lowerAll
                          )
                        ) {
                          detectedLang = 'kannada';
                        } else if (
                          /hindi|bollywood|arijit|shreya|anuv jain|pritam|bad newz|animal|jawan|sufi|punjabi|t-series|zee music/i.test(
                            lowerAll
                          )
                        ) {
                          detectedLang = 'hindi';
                        }

                        const isAlbum =
                          durSeconds >= 600 ||
                          /album|jukebox|all songs|collection|vol\.|non stop|best of|mashup|soundtrack/i.test(
                            rawTitle
                          );

                        collectedTracks.push({
                          id: `yt-${videoId}`,
                          youtubeId: videoId,
                          title: cleanTitle || rawTitle,
                          artist: artist.trim(),
                          artistId: `art-yt-${videoId}`,
                          album: isAlbum
                            ? 'Full Album Jukebox'
                            : rawTitle.includes('from')
                            ? rawTitle.split('from')[1].trim()
                            : 'Single',
                          coverUrl: bestThumb,
                          genre:
                            detectedLang === 'kannada'
                              ? 'Kannada Hits (ಕನ್ನಡ)'
                              : detectedLang === 'hindi'
                              ? 'Bollywood & Hindi (हिन्दी)'
                              : 'Global Hits',
                          duration: durSeconds,
                          releaseYear: 2024,
                          monthlyListeners: 25000000,
                          energy: 0.85,
                          acousticness: 0.2,
                          melancholy: 0.35,
                          obscurity: 0.05,
                          tags: [
                            'youtube stream',
                            'full song',
                            detectedLang,
                            isAlbum ? 'full album' : 'single',
                          ],
                          isSpotifyHit: true,
                          popularity: 92,
                          fullSongAvailable: true,
                          language: detectedLang,
                          isAlbum,
                          viewsText: viewsText || undefined,
                        });
                      }
                    }
                    for (const k of Object.keys(obj)) {
                      walk(obj[k]);
                    }
                  };
                  walk(data);
                } catch {}
              }

              // 2. Regex fallback if initialData was not matched
              const regex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
              let match;
              while ((match = regex.exec(html)) !== null) {
                const vid = match[1];
                if (!seenVideoIds.has(vid)) {
                  seenVideoIds.add(vid);
                  collectedTracks.push({
                    id: `yt-${vid}`,
                    youtubeId: vid,
                    title: `${query} (Official Audio)`,
                    artist: 'YouTube Music Artist',
                    artistId: `art-yt-${vid}`,
                    album: 'YouTube Stream',
                    coverUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                    genre:
                      lowerClean.includes('kannada')
                        ? 'Kannada Hits (ಕನ್ನಡ)'
                        : lowerClean.includes('hindi')
                        ? 'Bollywood & Hindi (हिन्दी)'
                        : 'Global Hits',
                    duration: 235,
                    releaseYear: 2024,
                    monthlyListeners: 20000000,
                    energy: 0.8,
                    acousticness: 0.2,
                    melancholy: 0.35,
                    obscurity: 0.05,
                    tags: ['youtube stream', 'full song'],
                    isSpotifyHit: true,
                    popularity: 88,
                    fullSongAvailable: true,
                    language: lowerClean.includes('kannada')
                      ? 'kannada'
                      : lowerClean.includes('hindi')
                      ? 'hindi'
                      : 'english',
                    isAlbum: false,
                  });
                }
              }
            } catch {}
          })
        );

        const limitedResults = collectedTracks.slice(0, requestedLimit);
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            results: limitedResults,
            totalResults: collectedTracks.length,
            page,
            hasMore: collectedTracks.length >= requestedLimit,
          })
        );
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message, results: [], totalResults: 0, hasMore: false }));
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

    // 4. AI-Powered Music Curator endpoint using Gemini
    server.middlewares.use('/api/ai-curator', async (req: any, res: any) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }

      try {
        const rawBody: string = await new Promise((resolve) => {
          if (req.body) return resolve(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
          if (req.readableEnded) return resolve('');
          let data = '';
          req.setEncoding('utf8');
          req.on('data', (chunk: any) => { data += chunk; });
          req.on('end', () => resolve(data));
          req.on('error', () => resolve(data));
          setTimeout(() => resolve(data), 1500);
        });

        const body = rawBody ? JSON.parse(rawBody) : {};
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured', fallbackRequired: true }));
          return;
        }

            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                },
              },
            });

            const prompt = `You are IndieWave AI, a boutique indie music curator, radio DJ, and underground music scout.
Analyze this user's music taste, listening history, liked tracks, and especially their SKIPPED tracks.

User Taste Summary:
- Persona: ${body.tasteProfile?.personaTitle || 'Emerging Indie Explorer'}
- Top Genres: ${(body.tasteProfile?.topGenres || []).map((g: any) => g.genre).join(', ') || 'Dream Pop, Lo-Fi, Folk'}
- Obscurity Affinity: ${body.tasteProfile?.obscurityAffinity ?? 0.8} (higher = hyper underground <1,000 plays)
- Average Energy: ${body.tasteProfile?.averageEnergy ?? 0.45}
- Average Melancholy: ${body.tasteProfile?.averageMelancholy ?? 0.65}

User Liked Tracks:
${JSON.stringify(body.likedTracks || [], null, 2)}

User Listening History (Recently Played & Completion):
${JSON.stringify(body.listeningHistory || [], null, 2)}

User Skipped Tracks (CRITICAL - examine what made them skip: tempos, commercial styles, abrasive synths, or auto-tune):
${JSON.stringify(body.skippedTracks || [], null, 2)}

Candidate Catalog Sample:
${JSON.stringify(body.catalogSample || [], null, 2)}

Requested Timeframe: ${body.timeframe || 'daily'}
Requested Vibe / Mood Filter: ${body.vibe || 'all'}

Instructions:
1. Explain in the "curatorNote" specifically how both liked tracks and skipped tracks influenced this curation (e.g. why certain styles were included and others excluded).
2. Propose 8-10 tracks. Prefer tracks from the catalog sample where they fit the taste, or recommend matching emerging indie gems.
3. Recommend 4 emerging indie artists (<50k listeners, especially <10k underground artists) with bio, monthlyListeners, and which liked artist they are similar to.
4. Recommend 3-4 emerging micro-genres and sonic aesthetics (e.g. Slowcore, Hypnagogic Pop, Kannada Neo-Folk).
5. Provide a taste analysis breakdown.

Return valid JSON conforming to this structure:
{
  "playlistTitle": "string",
  "playlistDescription": "string",
  "curatorNote": "string",
  "reasoning": "string",
  "recommendedTracks": [
    {
      "id": "track-id or slug",
      "title": "Song Title",
      "artist": "Artist Name",
      "genre": "Genre",
      "monthlyListeners": 4200,
      "whyRecommended": "Reason based on history and skips",
      "similarityFactor": "Comparison to liked song"
    }
  ],
  "similarArtists": [
    {
      "id": "artist-id",
      "name": "Artist Name",
      "genre": "Genre",
      "monthlyListeners": 3500,
      "bio": "Short 1-2 sentence bio",
      "similarTo": "Liked Artist Name",
      "spotlightTrack": "Best Track Title"
    }
  ],
  "recommendedGenres": [
    {
      "genre": "Micro-Genre Name",
      "description": "Short description of sonic characteristics",
      "moodTag": "Mood description"
    }
  ],
  "tasteAnalysis": {
    "persona": "Persona title",
    "energyLevel": "Description of energy",
    "obscurityRating": "Underground rating",
    "skippedPatternSummary": "What was excluded based on skips"
  }
}`;

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
              },
            });

            const text = response.text || '{}';
            let parsed;
            try {
              parsed = JSON.parse(text);
            } catch {
              const clean = text.replace(/```json\n?|```/g, '').trim();
              parsed = JSON.parse(clean);
            }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(parsed));
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message, fallbackRequired: true }));
      }
    });

    // 5. Resolve direct HTML5 <audio> stream for uninterrupted lock-screen & background playback
    server.middlewares.use('/api/resolve-audio', async (req: any, res: any) => {
      try {
        const parsedUrl = new URL(req.url || '', 'http://localhost');
        const title = (parsedUrl.searchParams.get('title') || '').trim();
        const artist = (parsedUrl.searchParams.get('artist') || '').trim();
        const q = (parsedUrl.searchParams.get('q') || `${title} ${artist}`).trim();

        if (!q) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing title or q parameter' }));
          return;
        }

        const cacheKey = `${title}::${artist}::${q}`.toLowerCase();
        if (audioStreamCache.has(cacheKey)) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(audioStreamCache.get(cacheKey)));
          return;
        }

        // A. Try JioSaavn full-length 320kbps AAC (excellent for Kannada, Hindi, Bollywood, Indian Indie)
        const queryCandidates = buildAudioSearchQueries(title || q, artist);
        if (!queryCandidates.includes(q)) {
          queryCandidates.push(q);
        }

        try {
          let matchedItem: any = null;
          for (const candidateQuery of queryCandidates.slice(0, 2)) {
            const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&q=${encodeURIComponent(candidateQuery)}&n=6`;
            const sRes = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (sRes.ok) {
              const sData = await sRes.json();
              const candidates = Array.isArray(sData?.results) ? sData.results : [];
              const found = candidates.find((item: any) => {
                const primaryArtists =
                  item?.more_info?.artistMap?.primary_artists?.map((a: any) => a.name).join(', ') ||
                  item?.subtitle ||
                  '';
                return isAuthenticAudioCandidate(
                  {
                    title: item?.title,
                    language: item?.language,
                    artists: primaryArtists,
                    hasEncryptedUrl: Boolean(item?.more_info?.encrypted_media_url),
                  },
                  title || q,
                  artist
                );
              });
              if (found) {
                matchedItem = found;
                break;
              }
            }
          }

          if (matchedItem?.more_info?.encrypted_media_url) {
            const tokenUrl = `https://www.jiosaavn.com/api.php?__call=song.generateAuthToken&url=${encodeURIComponent(matchedItem.more_info.encrypted_media_url)}&bitrate=320&api_version=4&_format=json&ctx=web6dot0&_marker=0`;
            const tRes = await fetch(tokenUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (tRes.ok) {
              const tData = await tRes.json();
              if (tData?.auth_url) {
                const aacUrl = String(tData.auth_url)
                  .split('?')[0]
                  .replace('https://web.saavncdn.com/', 'https://aac.saavncdn.com/');
                const dur = parseInt(matchedItem?.more_info?.duration || '0', 10) || undefined;
                const payload = {
                  audioUrl: aacUrl,
                  isFullLength: true,
                  duration: dur,
                  source: 'saavn' as const,
                };
                audioStreamCache.set(cacheKey, payload);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(payload));
                return;
              }
            }
          }
        } catch {}

        // B. Fall back to official iTunes AAC stream for global/Western/indie tracks
        try {
          const itQuery = queryCandidates[0] || q;
          const itRes = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(itQuery)}&entity=song&limit=3`
          );
          if (itRes.ok) {
            const itData = await itRes.json();
            const firstWithPreview = (itData?.results || []).find((r: any) => Boolean(r?.previewUrl));
            if (firstWithPreview?.previewUrl) {
              const payload = {
                audioUrl: String(firstWithPreview.previewUrl),
                isFullLength: false,
                duration: 30,
                source: 'itunes' as const,
              };
              audioStreamCache.set(cacheKey, payload);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
              return;
            }
          }
        } catch {}

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ audioUrl: null, isFullLength: false }));
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message, audioUrl: null }));
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

function devPwaSafeRegisterPlugin(): Plugin {
  return {
    name: 'dev-pwa-safe-register',
    apply: 'serve',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // src/main.tsx registers the service worker directly via `virtual:pwa-register`,
        // so stripping vite-plugin-pwa's HMR-only dev script prevents Vite 6
        // `SendBeforeConnectError: send was called before connect` when HMR is disabled.
        return html.replace(
          /<script\s+id="vite-plugin-pwa:register-dev-sw"[\s\S]*?<\/script>\s*/gi,
          ''
        );
      },
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
        injectRegister: false,
        useCredentials: true,
        manifest: {
          id: '/',
          name: 'Apna Music - Gym Motivation & Music App',
          short_name: 'Apna Music',
          description: 'Stream gym workout motivation beats, Kannada mass tracks, Bollywood chartbusters, and underground discoveries.',
          theme_color: '#0b0d17',
          background_color: '#0b0d17',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          orientation: 'any',
          start_url: '/',
          scope: '/',
          categories: ['music', 'entertainment', 'audio', 'fitness'],
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
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Audio Visualizer',
              short_name: 'Visualizer',
              description: 'Watch frequency spectrum react live to audio',
              url: '/?action=visualizer',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
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
          suppressWarnings: true,
        },
      }),
      devPwaSafeRegisterPlugin(),
      fullMusicApiPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});

