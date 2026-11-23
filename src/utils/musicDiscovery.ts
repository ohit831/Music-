/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IndieTrack {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  coverUrl: string;
  genre:
    | 'Dream Pop'
    | 'Indie Rock'
    | 'Bedroom Lo-Fi'
    | 'Neo-Folk'
    | 'Math Rock'
    | 'Shoegaze'
    | 'Synthwave'
    | 'Pop'
    | 'Hip-Hop'
    | 'R&B'
    | 'Rock'
    | 'Alternative'
    | 'Electronic'
    | 'Dance'
    | string;
  duration: number; // in seconds
  releaseYear: number;
  monthlyListeners: number;
  energy: number; // 0 to 1
  acousticness: number; // 0 to 1
  melancholy: number; // 0 to 1 (0 = euphoric, 1 = melancholic)
  obscurity: number; // 0 to 1 (1 = hyper underground <1,000 plays, 0 = global mega hit)
  tags: string[];
  lyrics?: string[];
  syncedLyrics?: Array<{ time: number; text: string }>;
  linerNotes?: string;
  addedBy?: string; // friend name if collaborative
  audioUrl?: string; // real streaming audio / preview mp3/aac
  spotifyUrl?: string; // link to open on Spotify
  isSpotifyHit?: boolean;
  popularity?: number; // 0 to 100
  explicit?: boolean;
  youtubeId?: string; // official full song YouTube video ID
  bpm?: number;
  fullSongAvailable?: boolean;
  language?: 'kannada' | 'hindi' | 'english' | string;
  isAlbum?: boolean;
  viewsText?: string;
}

export interface IndieArtist {
  id: string;
  name: string;
  location: string;
  bio: string;
  genres: string[];
  monthlyListeners: number;
  coverUrl: string;
  verified: boolean;
  recordingGear: string;
  bandcampUrl?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverGradient: string;
  coverEmoji: string;
  trackIds: string[];
  isPersonalized?: boolean;
  isCollaborative?: boolean;
  createdAt: string;
  owner: string;
}

export interface FriendActivity {
  id: string;
  friendName: string;
  avatar: string;
  trackId: string;
  trackTitle: string;
  artist: string;
  coverUrl: string;
  timeAgo: string;
  isListeningNow: boolean;
  currentSeconds: number;
}

export interface DiscoveryPreferences {
  genres: string[];
  minObscurity: number; // 0 to 1
  maxObscurity: number; // 0 to 1
  energyTarget: number; // 0 to 1
  melancholyTarget: number; // 0 to 1
}

/**
 * Format duration in seconds to M:SS (e.g. 194 -> "3:14")
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Calculate total formatted duration for a list of tracks (e.g. "42 min 18 sec")
 */
export function calculatePlaylistDuration(tracks: IndieTrack[]): string {
  const totalSeconds = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) {
    return `${hours} hr ${mins} min`;
  }
  return `${mins} min ${secs} sec`;
}

/**
 * Filter catalog tracks based on text query, genre, and obscurity
 */
export function filterIndieCatalog(
  query: string,
  genreFilter: string | null,
  catalog: IndieTrack[]
): IndieTrack[] {
  const cleanQuery = query.trim().toLowerCase();
  const lowerGenre = genreFilter?.trim().toLowerCase();

  return catalog.filter((track) => {
    // Genre and language filtering
    if (lowerGenre && lowerGenre !== 'all') {
      if (lowerGenre === 'hit' || lowerGenre === "today's top hits") {
        if (!track.isSpotifyHit && (!track.popularity || track.popularity < 80)) {
          return false;
        }
      } else if (lowerGenre === 'new' || lowerGenre === 'new releases 2026') {
        const isNewTrack =
          track.id.startsWith('new-') ||
          track.tags?.some((t) => t.toLowerCase().includes('new')) ||
          (track.album && (track.album.includes('2024') || track.album.includes('2025') || track.album.includes('2026')));
        if (!isNewTrack) return false;
      } else if (lowerGenre === 'kannada' || lowerGenre.includes('kannada') || lowerGenre.includes('ಕನ್ನಡ')) {
        const isKannada =
          track.language === 'kannada' ||
          track.tags?.some((t) => t.toLowerCase().includes('kannada')) ||
          (track.genre && track.genre.toLowerCase().includes('kannada'));
        if (!isKannada) return false;
      } else if (lowerGenre === 'hindi' || lowerGenre.includes('hindi') || lowerGenre.includes('bollywood') || lowerGenre.includes('हिन्दी')) {
        const isHindi =
          track.language === 'hindi' ||
          track.tags?.some((t) => t.toLowerCase().includes('hindi') || t.toLowerCase().includes('bollywood')) ||
          (track.genre && track.genre.toLowerCase().includes('hindi'));
        if (!isHindi) return false;
      } else {
        const trackGenreLower = (track.genre || '').toLowerCase();
        const matchesExact = track.genre === genreFilter;
        const matchesSub = trackGenreLower.includes(lowerGenre);
        const matchesTag = track.tags?.some((t) => t.toLowerCase().includes(lowerGenre));
        if (!matchesExact && !matchesSub && !matchesTag) return false;
      }
    }

    if (!cleanQuery) return true;

    // Special language / genre shortcuts when typing Kannada or Hindi
    if (cleanQuery === 'kannada' || cleanQuery === 'ಕನ್ನಡ') {
      if (
        track.language === 'kannada' ||
        track.id.startsWith('kn-') ||
        (track.genre && track.genre.toLowerCase().includes('kannada'))
      ) {
        return true;
      }
    }
    if (cleanQuery === 'hindi' || cleanQuery === 'bollywood' || cleanQuery === 'हिन्दी') {
      if (
        track.language === 'hindi' ||
        track.id.startsWith('hn-') ||
        (track.genre && track.genre.toLowerCase().includes('hindi'))
      ) {
        return true;
      }
    }

    return (
      track.title.toLowerCase().includes(cleanQuery) ||
      track.artist.toLowerCase().includes(cleanQuery) ||
      track.album.toLowerCase().includes(cleanQuery) ||
      (track.genre && track.genre.toLowerCase().includes(cleanQuery)) ||
      (track.language && track.language.toLowerCase().includes(cleanQuery)) ||
      track.tags.some((tag) => tag.toLowerCase().includes(cleanQuery))
    );
  });
}

/**
 * Recommendation scoring algorithm for indie music discovery
 */
export function scoreTrackAffinity(
  track: IndieTrack,
  prefs: DiscoveryPreferences,
  likedTrackIds: Set<string>
): number {
  let score = 50;

  // Liked tracks get slight boost or skip if looking for new
  if (likedTrackIds.has(track.id)) {
    score -= 10; // slightly de-prioritize already known tracks to encourage discovery!
  }

  // Genre match
  if (prefs.genres.length > 0) {
    if (prefs.genres.includes(track.genre)) {
      score += 35;
    } else {
      score -= 20;
    }
  }

  // Obscurity match
  if (track.obscurity >= prefs.minObscurity && track.obscurity <= prefs.maxObscurity) {
    score += 25;
  } else {
    const dist = Math.min(
      Math.abs(track.obscurity - prefs.minObscurity),
      Math.abs(track.obscurity - prefs.maxObscurity)
    );
    score -= dist * 30;
  }

  // Energy proximity (distance from target)
  const energyDiff = Math.abs(track.energy - prefs.energyTarget);
  score += Math.max(0, (1 - energyDiff) * 20);

  // Melancholy proximity
  const melancholyDiff = Math.abs(track.melancholy - prefs.melancholyTarget);
  score += Math.max(0, (1 - melancholyDiff) * 20);

  return Math.round(score);
}

/**
 * Generate a personalized indie mix matching given preferences
 */
export function generatePersonalizedMix(
  title: string,
  prefs: DiscoveryPreferences,
  catalog: IndieTrack[],
  limit = 8
): { playlist: Playlist; tracks: IndieTrack[] } {
  const scored = catalog.map((track) => ({
    track,
    score: scoreTrackAffinity(track, prefs, new Set()),
  }));

  scored.sort((a, b) => b.score - a.score);
  const selectedTracks = scored.slice(0, limit).map((s) => s.track);

  const playlistId = `pl-custom-${Date.now()}`;
  const gradients = [
    'from-emerald-600 via-teal-800 to-slate-900',
    'from-purple-600 via-indigo-900 to-black',
    'from-amber-600 via-rose-900 to-zinc-900',
    'from-cyan-600 via-blue-900 to-slate-950',
    'from-fuchsia-600 via-pink-900 to-neutral-950',
  ];
  const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

  const playlist: Playlist = {
    id: playlistId,
    title: title || 'Custom Indie Discovery Mix',
    description: `Personalized indie blend generated from ${prefs.genres.length ? prefs.genres.join(', ') : 'All Subgenres'} with obscurity rating ${(prefs.minObscurity * 100).toFixed(0)}%-${(prefs.maxObscurity * 100).toFixed(0)}%.`,
    coverGradient: randomGradient,
    coverEmoji: '✨',
    trackIds: selectedTracks.map((t) => t.id),
    isPersonalized: true,
    createdAt: new Date().toISOString().split('T')[0],
    owner: 'You',
  };

  return { playlist, tracks: selectedTracks };
}

/**
 * Generate share payload object and base64 encoded URL safe string for social sharing
 */
export function createSharePayload(track: IndieTrack, note?: string): {
  payloadStr: string;
  shareUrl: string;
  summaryText: string;
} {
  const payload = {
    tId: track.id,
    title: track.title,
    artist: track.artist,
    genre: track.genre,
    note: note || '',
    timestamp: Date.now(),
  };

  const json = JSON.stringify(payload);
  const encoded = typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json).toString('base64');
  const appOrigin = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://indiewave.app';
  const shareUrl = `${appOrigin}/?track=${encodeURIComponent(track.id)}&ref=share&s=${encodeURIComponent(encoded)}`;
  const summaryText = `Check out "${track.title}" by ${track.artist} on Apna Music! #ApnaMusic #${track.genre.replace(/\s+/g, '')}`;

  return {
    payloadStr: encoded,
    shareUrl,
    summaryText,
  };
}

/**
 * Decode share payload string
 */
export function decodeSharePayload(encoded: string): {
  tId: string;
  title: string;
  artist: string;
  genre: string;
  note?: string;
} | null {
  try {
    const decoded = typeof atob !== 'undefined' ? decodeURIComponent(escape(atob(encoded))) : Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Format monthly listener counts into human readable Spotify format (e.g. 110,500,000 -> 110.5M)
 */
export function formatListenersCount(count: number): string {
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(1)}B`;
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toLocaleString();
}

export const KNOWN_YOUTUBE_HITS: Record<string, string> = {
  'blinding lights': '4NRXx6U8ABQ',
  'starboy': '34Na4j8AVgA',
  'as it was': 'H5v3kku4y6Q',
  'cruel summer': 'ic8j13piAhQ',
  'flowers': 'G7KNmW9a75Y',
  'birds of a feather': 'V9PVRfjEBTI',
  'sunflower': 'ApXoWvfEYVU',
  'levitating': 'TUVcZfQe-Kw',
  'kill bill': 'MSRcC626prw',
  'heat waves': 'mRD0-GxqHVo',
  'do i wanna know': 'bpOSxM0rNPM',
  'vampire': 'RlPNh_PBZb4',
  'espresso': '51zjlMhdSTE',
  'too sweet': 'NTpbbQUBbuo',
  'humble': 'tvTRZJ-4EyI',
  'good luck babe': '1RKqOmSkGgM',
  'good luck, babe!': '1RKqOmSkGgM',
  'get lucky': '5NV6Rdv1a3I',
  'dreams': 'Y3ywicffOj4',
  'smells like teen spirit': 'hTWKbfoikeg',
  'bohemian rhapsody': 'fJ9rUzIMcZQ',
  'chamber of reflection': 'MJoSyNdffGo',
  'pink + white': 'uzS3WG6__G4',
  'video games': 'Qi5ppQAozIM',
  'yellow': 'yKNxeF4KMsY',
  'bad guy': 'DyDfgMOUjCI',
  'anti-hero': 'b1kbLwvqugk',
  'drivers license': 'ZmDBbnmKpqQ',
  'watermelon sugar': '7-x3uD5z1bQ',
  'snooze': 'Sv5yCzPCkv8',
  'shape of you': 'JGwWNGJdvx8',
  'stay': 'kTJczUoc26U',
  'save your tears': 'XXYlFuWEuKI',
  'gods plan': 'xpVfcZ0ZcFM',
  'not like us': 'H58vbez_m4E',
  'taste': 'KEG7b851Ric',
  'karma police': '1uYWYWPc9HU',
  'lose control': '9gWIIIr2Asw',
  'someone you loved': 'zABLecsR5UE',
  'water': 'XoiOOiuH8iI',
  'million dollar baby': 'zG5YzRxOcsI',
  'i wanna be yours': 'nyuo9-OjNNg',
  'sweater weather': 'GCdwKhTtNNw',
  'daylight': 'MoN9ql6Yymw',
  'riptide': 'uJ_1HMAGb4k',
  'another love': 'MwpMEbgC7DA',
  'viva la vida': 'dvgZkm1xWPE',
  'lose yourself': '_Yhyp-_hX2s',
  'seven': 'QU9c0053UAU',
  // Kannada Chartbusters - Verified Real Full Song IDs
  'singara siriye': 'Q-yJcnX0Qzg',
  'ra ra rakkamma': 'ScPxjcfacwg',
  'varaha roopam': 'gH_RYRwVrVM',
  'dheera dheera': 'gWcILbCt1zA',
  'mehabooba': 'mJ8bwitLiUo',
  'sulthan': '0j8FYH9Ps2U',
  'belageddu': 'McjQCtnQyZY',
  'sapta sagaradaache': 'dDMXyQ6cwIc',
  'neene modalu': 'TjkPEBV0Vh4',
  'tagaru banthu': 'V3-Fd8wPuRA',
  'marali manasagide': '01uRBlLAjFg',
  'anisuthide': 'nlsLKA6hlVQ',
  'bombe helutaite': 'fpGvB7AT1vA',
  'dwapara': 'wiur_AGatGU',
  'minchagi neenu': 'cTYyAEvsOZs',
  'salaam rocky bhai': 'vDHy2_o8YzU',
  'soul of dia': 'cO4eJxbCedc',
  'geleya geleya': 'SxRSPyJewgg',
  'kaarmoda saridu': 'hYOXLwqviR8',
  'karma song': 'pnWvZCAvv9Y',
  // Hindi & Bollywood Mega-Hits - Verified Real Full Song IDs
  'kesariya': 'BddP6PYo2gs',
  'tum hi ho': 'IJq0yyWug1k',
  'chaleya': 'VAdGW7QDJiU',
  'apna bana le': 'ElZfdU54Cp8',
  'o maahi': '8sLS2knUa6Y',
  'tere vaaste': '9E9SAt7uJ_I',
  'pehle bhi main': 'HrnrqYxYrbk',
  'satranga': '_Wv2iV8b0hA',
  'tauba tauba': 'LK7-_dgAVQE',
  'chaiyya chaiyya': '9MX-QejdVaQ',
  'kun faya kun': 'T94PHkuydcw',
  'agar tum saath ho': 'sK7riqg2mr4',
  'kabira': 'jHNNMj5bNQw',
  'pee loon': 'Nbr_KJT0TIc',
  'kal ho naa ho': 'g0eO74UmRBs',
  'ghungroo': 'qFkNATtc3mc',
  'raataan lambiyan': 'gvyUuxdRdR4',
  'maan meri jaan': 'A66TYFdz8YA',
  'kahani suno': 'qhYLX8QWIHQ',
  'husn': 'sFMRqxCexDk',
  'baarishein': 'PJWemSzExXs',
  'namo namo': 'dx4Teh-nv3A',
  'die with a smile': 'PfH7jq_uSCM',
  'please please please': 'cF1Na4AIecM',
  'a bar song': 't7bQwwqW-Hc',
  'beautiful things': 'Oa_RSwwpPaA',
  'i had some help': '11T6kF66dKY',
  'lunch': 'MB3VkzPdgLA',
  'we cant be friends': 'KNtJGQkC-WI',
  'greedy': '8AtiHCDGZ8c',
  'houdini': 'suAR1PYFNYA',
  // 90s Kannada Classics - Verified Real Full Song IDs
  'nanna preethiya hudugi': 'J9BJadKmqCw',
  'ee sanje yaakagide': 'qhoDsfJDGvg',
  'premaloka': 'lrOwO-5aXHY',
  'usire usire': 'Ukk2pr5inBA',
  'kogileye haadu': 'hCyfYxnKXnE',
  'preethse preethse': 'NzONsYZN5UA',
  'o mallige': 'jfIMlwQkPFA',
  // 90s Bollywood / Hindi Classics - Verified Real Full Song IDs
  'tujhe dekha toh': 'cNV5hLSa9H8',
  'pehla nasha': 'ODu7OyAqK-Q',
  'dheere dheere se': 'KeyfUuXPOcY',
  'kuch kuch hota hai': 'bKZTnnFU9HA',
  'tip tip barsa': 'BtlnpBb4O8E',
  'chura ke dil mera': 'Yqj1_V90KJo',
  'dil hai ki manta nahin': 'C9efe0rjDlE',
  'baazigar o baazigar': 'PUO7_Gi6ipg',
  'tanha tanha': 'CKXG45s96m8',
  // 90s Global Hits
  'i want it that way': '4fndeDfaWCg',
  'wonderwall': '6hzrDeceEKc',
  'baby one more time': 'C-u5WLJ9Yk4',
  'wannabe': 'gJLIiF15wjQ',
  'black or white': 'F2AitTPI5U0',
  // Gym Motivation & Mega Anthems
  'believer': '7wtfhZwyrcc',
  'unstoppable': 'cxjvTXo9WWM',
  'channa mereya': 'bzSTpdcs-EI',
  'raanjhanaa': 'rSSx1tEKci8',
  'mungaru male': 'nlsLKA6hlVQ',
  'anisa bide': 'nlsLKA6hlVQ',
  'bad newz': 'LK7-_dgAVQE',
  'animal': 'HrnrqYxYrbk',
  'till i collapse': 'Pi3_Zs-oRUo',
  'eye of the tiger': 'btPJPFnesV4',
};

// Known placeholder mock strings that are invalid on YouTube and must be re-resolved
const INVALID_MOCK_IDS = new Set([
  '2k9bXkS6JkY', 'vh9GqH17zO8', 'ZJ1Bv8E9G5U', 'S2q9qG8u2dI', '3Y4E7K4x2O8',
  '8G4yG0Kx2qE', 'dP3_o0b7M8U', 'l8O0yFm2S6M', '6m3K5o7sYgI', 'b8qJtW3sO8U',
  'oQ8J3u4Xv6w', 'h9B2xG_kK3s', '8x3k9K9Q3wM', '7fG3k7sY2wE', 'm2K8y1X9w0E',
  'l2qN3qU-7s0', '1sBqfT_Yh0U', 'mO0pZ8u4k6Y', 'EaM5T1J_560', 'f8i23Tf7-zQ',
  '7kG2rZ-QhXg', 'qCkmf24z_zM', 'h4o7zXv2_d0', 'rFfX8h-m08s', '3wXN_bK69pY',
  '7X7zQ6T5j7M', 'V34-XmQp10U', 'k8OvygL_m9c', 'nK319u_aDks', 'V8T9yL04xPo',
  'PZ2Q7oM-NfI', 'hW4VnUe4d-4', 'M_b8jU1uEPo', 'v50h9bZ5m0Y', 'wYkZzC9W-gQ',
  'qL5_5vW_Cqo', 'CY8E6N5NeyA', 'z5O7_e7oXbM', 'mE6L4b8oZ_s',
  '79y7R_l_R5M', '0z5h0x_zOq4', 'N-zX05hW8lE', 'GZ3zL7kT6_c', 'jA1Nf-qOq4w',
  // Discovered 404/broken catalog IDs
  'SQnc1Q3n26E', 'bpOSxM0zyN8', 'aezstBMeqV8', '1bZsVfA0_F4', 'NY8IS0ss-zk',
  'cE6wxJpnukU', '4kLhO7x5N1E', 'ny9e4L8P-pQ', 'p8Q_3f_J4nI', 'Y1H0aI7u_1c',
  'J6zVv8d7_kQ', '8qSka3rP6rI', 'jG6Q_xQ-iI0', 'qB_qW3O6f3w', 'k0Q4_w9N9qg',
  '0WbMM431U0o', 'M29x1W8r7E8', 'VAdGW7QDJUI', '2ENXZq5hJyo', 'VuG7FT97Q74',
  'gvy8eN6Hn_4', 'dLwS03n0zQY', 'cNV5hLKhvNY', 'n8Y8bV9zH9o', 'clw9Jv1K_pI',
  'h3h1q-P5k1Q', '78q2fKzH6-I', 'wV2zE26FkPQ',
  'd5gxXNtr7Hg', 'VF-FGy_KGvo', '1K_47K-4kHQ', 'E07s5ZYygmg', 'LDY_Xyx3WbE',
  'r0XzQ3G3sI8', 'kPa7bsKwL-8', 't7bQwdJ-TBU', '4QIZk-UqU_8', 'To2SKUKjufM',
  '4o2zT9d2-m4', 'vV0uO1dK8kM', '0WbMM431UOo', 'qK8l1D_8s9I', 'GvAfl9QG8Q4',
  '8B7HgG_d8aU', 'PQmrmVs10X8', 'j7_lSP8VC3o', '2u_1V8Q2iXg', 'BNfAf4ToGSE',
  'f7QeT4a1mX8', 'kfgWd7L8iio', 'h4f4P2xZ3e4', '9r_e2NWupmE', 'mK_P5N8m4_c',
  'jF_0dG4kM6s', 'x4n2B-nO_dE', '1M4yFqW-vQo', '1G2H73K41t4', 'cxjvTXo9WBU',
  '284VoJQs430', 'OsMyV0etwfE', '2f4m6P2pY0A', '_1xXYeNrW9k'
]);

const resolvedVideoCache = new Map<string, string>();

/**
 * Parse any user-provided music link or identifier
 * Supports:
 * - YouTube URLs: https://www.youtube.com/watch?v=..., https://youtu.be/..., https://music.youtube.com/...
 * - Direct YouTube 11-char Video ID
 * - Direct Audio URLs: https://.../song.mp3, .m4a, .aac, .wav, .ogg, stream
 */
export function parseMusicUrl(input: string): {
  type: 'youtube' | 'audio' | 'query';
  value: string;
} {
  const clean = input.trim();
  if (!clean) return { type: 'query', value: '' };

  // 1. YouTube direct video ID (11 chars alphanumeric + _ -)
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return { type: 'youtube', value: clean };
  }

  // 2. YouTube standard or short links
  const ytMatch = clean.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|(?:embed|v|shorts)\/))([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return { type: 'youtube', value: ytMatch[1] };
  }

  // 3. Direct audio stream URLs
  if (/^https?:\/\/.*\.(mp3|m4a|aac|wav|ogg)(\?.*)?$/i.test(clean) || clean.includes('/stream')) {
    return { type: 'audio', value: clean };
  }

  return { type: 'query', value: clean };
}

/**
 * Dynamically resolve 100% full song YouTube ID for any track
 */
export async function resolveFullSong(track: {
  id?: string;
  title: string;
  artist: string;
  youtubeId?: string;
}): Promise<string | null> {
  const cacheKey = `${track.artist} - ${track.title}`.toLowerCase().trim();

  // 1. Authoritative check: match verified known hits by song title first
  const cleanTitle = (track.title || '').toLowerCase().trim();
  for (const [key, ytid] of Object.entries(KNOWN_YOUTUBE_HITS)) {
    if (cleanTitle.includes(key) && !INVALID_MOCK_IDS.has(ytid)) {
      resolvedVideoCache.set(cacheKey, ytid);
      return ytid;
    }
  }

  // 2. Check memory cache for instant lookup
  if (resolvedVideoCache.has(cacheKey)) {
    const cached = resolvedVideoCache.get(cacheKey)!;
    if (!INVALID_MOCK_IDS.has(cached)) {
      return cached;
    }
  }

  // 3. If valid youtubeId already present on track and not an invalid mock string
  if (track.youtubeId && !INVALID_MOCK_IDS.has(track.youtubeId)) {
    resolvedVideoCache.set(cacheKey, track.youtubeId);
    return track.youtubeId;
  }

  // 4. Dynamically resolve from server backend endpoint
  try {
    const q = `${track.artist} ${track.title}`.trim();
    const res = await fetch(`/api/resolve-youtube?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.videoId && !INVALID_MOCK_IDS.has(data.videoId)) {
        resolvedVideoCache.set(cacheKey, data.videoId);
        return data.videoId;
      }
      if (data && Array.isArray(data.candidates)) {
        for (const cand of data.candidates) {
          if (cand && !INVALID_MOCK_IDS.has(cand)) {
            resolvedVideoCache.set(cacheKey, cand);
            return cand;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Backend YouTube resolver notice:', err);
  }

  return null;
}

/**
 * Universal music search that finds full length songs from anywhere on the web
 * Queries server search endpoint, falls back to iTunes metadata + YouTube resolution
 */
export async function searchFullMusicAnywhere(
  query: string,
  limit = 35,
  page = 1
): Promise<IndieTrack[]> {
  const clean = query.trim();
  if (!clean) return [];

  // 1. Check if user entered a direct link (YouTube or Audio file)
  const parsed = parseMusicUrl(clean);
  if (parsed.type === 'youtube') {
    try {
      const oeRes = await fetch(`/api/oembed-info?id=${parsed.value}`);
      if (oeRes.ok) {
        const d = await oeRes.json();
        return [
          {
            id: `custom-yt-${parsed.value}`,
            youtubeId: parsed.value,
            fullSongAvailable: true,
            title: d.title || 'Custom Video Track',
            artist: d.author_name || 'YouTube Creator',
            artistId: `art-yt-${parsed.value}`,
            album: 'Web Import',
            coverUrl: d.thumbnail_url || `https://i.ytimg.com/vi/${parsed.value}/hqdefault.jpg`,
            genre: 'Full Song Stream',
            duration: 220,
            releaseYear: new Date().getFullYear(),
            monthlyListeners: 10000000,
            energy: 0.8,
            acousticness: 0.2,
            melancholy: 0.3,
            obscurity: 0.05,
            tags: ['custom import', 'full music', 'web'],
            popularity: 95,
          },
        ];
      }
    } catch {}
  }

  // 2. Try server-side full music search endpoint (unlimited full songs & albums)
  try {
    const res = await fetch(
      `/api/search-full-music?q=${encodeURIComponent(clean)}&limit=${limit}&page=${page}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results;
      }
    }
  } catch (err) {
    console.warn('Server search notice:', err);
  }

  // 3. Fall back to searchOnlineSpotifyTracks
  return searchOnlineSpotifyTracks(clean, limit);
}

/**
 * Search global online music library (Spotify / Apple Music catalog via open iTunes public API)
 * Returns live playable tracks with artwork and pre-resolved YouTube IDs for full playback
 */
export async function searchOnlineSpotifyTracks(
  query: string,
  limit = 25
): Promise<IndieTrack[]> {
  const clean = query.trim();
  if (!clean) return [];

  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(clean)}&entity=song&limit=${limit}`
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((item: any) => {
      // High-res album artwork (convert 100x100 to 600x600)
      const highResArtwork = item.artworkUrl100
        ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg')
        : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

      const releaseYear = item.releaseDate
        ? new Date(item.releaseDate).getFullYear()
        : 2024;
      const durationSec = item.trackTimeMillis
        ? Math.round(item.trackTimeMillis / 1000)
        : 210;

      const genre = item.primaryGenreName || 'Pop';
      const cleanTitle = (item.trackName || '').toLowerCase();
      
      // Look up known YouTube full song ID
      let matchedYtId: string | undefined;
      for (const [key, ytid] of Object.entries(KNOWN_YOUTUBE_HITS)) {
        if (cleanTitle.includes(key)) {
          matchedYtId = ytid;
          break;
        }
      }

      let detectedLang: 'kannada' | 'hindi' | 'english' | undefined = undefined;
      const combinedMeta = `${item.trackName || ''} ${item.artistName || ''} ${item.collectionName || ''}`.toLowerCase();
      if (/kannada|sandalwood|kantara|kgf|chandan|sanjith|vijay prakash|charan raj|ajaneesh/i.test(combinedMeta)) {
        detectedLang = 'kannada';
      } else if (/hindi|bollywood|arijit|shreya|anuv jain|pritam|bad newz|animal|jawan|sufi|punjabi/i.test(combinedMeta)) {
        detectedLang = 'hindi';
      }

      return {
        id: `sp-${item.trackId || Math.random().toString(36).substring(2, 9)}`,
        title: item.trackName || 'Unknown Title',
        artist: item.artistName || 'Unknown Artist',
        artistId: `art-sp-${(item.artistName || 'artist').toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        album: item.collectionName || item.trackName || 'Single',
        coverUrl: highResArtwork,
        genre: genre,
        duration: durationSec,
        releaseYear: releaseYear,
        monthlyListeners: 15_000_000,
        energy: 0.72,
        acousticness: 0.25,
        melancholy: 0.4,
        obscurity: 0.05,
        tags: [genre.toLowerCase(), 'spotify hit', 'global'],
        audioUrl: item.previewUrl,
        spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(
          (item.trackName || '') + ' ' + (item.artistName || '')
        )}`,
        isSpotifyHit: true,
        popularity: 92,
        youtubeId: matchedYtId,
        fullSongAvailable: true,
        language: detectedLang,
      };
    });
  } catch (err) {
    console.error('Failed to search online Spotify tracks:', err);
    return [];
  }
}


