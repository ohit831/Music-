import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { filterIndieCatalog, IndieTrack } from './musicDiscovery';

describe('Music Discovery & Catalog Filter Logic', () => {
  const sampleTracks: IndieTrack[] = [
    {
      id: 'kn-singara-siriye',
      title: 'Singara Siriye',
      artist: 'Vijay Prakash',
      artistId: 'art-kn-vijay',
      album: 'Kantara',
      coverUrl: '',
      genre: 'Kannada Folk',
      duration: 282,
      releaseYear: 2022,
      monthlyListeners: 14000000,
      energy: 0.85,
      acousticness: 0.2,
      melancholy: 0.2,
      obscurity: 0.05,
      tags: ['kannada', 'kantara', 'folk'],
      fullSongAvailable: true,
      youtubeId: 'Q-yJcnX0Qzg',
      language: 'kannada',
    },
    {
      id: 'hn-kesariya',
      title: 'Kesariya',
      artist: 'Arijit Singh',
      artistId: 'art-hn-arijit',
      album: 'Brahmastra',
      coverUrl: '',
      genre: 'Hindi / Bollywood',
      duration: 268,
      releaseYear: 2022,
      monthlyListeners: 35000000,
      energy: 0.78,
      acousticness: 0.3,
      melancholy: 0.3,
      obscurity: 0.02,
      tags: ['hindi', 'bollywood', 'arijit singh'],
      fullSongAvailable: true,
      youtubeId: 'BddP6PYo2gs',
      language: 'hindi',
    },
    {
      id: 'kn-90s-premaloka',
      title: 'Premaloka (Title Track)',
      artist: 'S. P. Balasubrahmanyam',
      artistId: 'art-kn-spb',
      album: 'Premaloka',
      coverUrl: '',
      genre: 'Kannada 90s Retro',
      duration: 295,
      releaseYear: 1987,
      monthlyListeners: 12000000,
      energy: 0.8,
      acousticness: 0.25,
      melancholy: 0.2,
      obscurity: 0.1,
      tags: ['90s', 'kannada', 'spb', 'hamsalekha'],
      fullSongAvailable: true,
      youtubeId: 'lrOwO-5aXHY',
      language: 'kannada',
      isAlbum: false,
    },
  ];

  test('matches Kannada tracks when searching "kannada" or "ಕನ್ನಡ"', () => {
    const resKannada = filterIndieCatalog('kannada', null, sampleTracks);
    assert.equal(resKannada.length, 2);
    assert.ok(resKannada.some((t) => t.id === 'kn-singara-siriye'));
    assert.ok(resKannada.some((t) => t.id === 'kn-90s-premaloka'));

    const resKannadaNative = filterIndieCatalog('ಕನ್ನಡ', null, sampleTracks);
    assert.equal(resKannadaNative.length, 2);
  });

  test('matches Hindi tracks when searching "hindi" or "bollywood"', () => {
    const resHindi = filterIndieCatalog('hindi', null, sampleTracks);
    assert.equal(resHindi.length, 1);
    assert.equal(resHindi[0].title, 'Kesariya');

    const resBolly = filterIndieCatalog('bollywood', null, sampleTracks);
    assert.equal(resBolly.length, 1);
    assert.equal(resBolly[0].title, 'Kesariya');
  });

  test('matches artist name and song title case-insensitively', () => {
    const resArtist = filterIndieCatalog('arijit', null, sampleTracks);
    assert.equal(resArtist.length, 1);
    assert.equal(resArtist[0].artist, 'Arijit Singh');

    const resSong = filterIndieCatalog('premaloka', null, sampleTracks);
    assert.equal(resSong.length, 1);
    assert.equal(resSong[0].id, 'kn-90s-premaloka');
  });
});
