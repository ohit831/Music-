import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSyncedLyrics,
  formatLyricTimestamp,
  getActiveLyricState,
  parseLrcLine,
} from './syncedLyrics';

test('parseLrcLine parses mm:ss and mm:ss.xx timestamps while ignoring section headings', () => {
  assert.deepEqual(parseLrcLine('[00:12] Hello world'), { time: 12, text: 'Hello world' });
  assert.deepEqual(parseLrcLine('[01:05.50] Chorus kicks in'), {
    time: 65.5,
    text: 'Chorus kicks in',
  });
  assert.equal(parseLrcLine('[Verse 1]'), null);
  assert.equal(parseLrcLine('[Chorus]'), null);
  assert.equal(parseLrcLine('Just plain lyrics'), null);
});

test('buildSyncedLyrics derives monotonically increasing timestamps for plain track lyrics with headings and spacers', () => {
  const lines = buildSyncedLyrics(
    {
      id: 'trk-1',
      duration: 180,
      lyrics: [
        '[Verse 1]',
        'Silver needles on the cedar floor',
        'The quiet squeak of the porch screen door',
        '',
        '[Chorus]',
        'Just tape hiss and cedar trees',
        'Whispers carried on a coastal breeze',
      ],
    },
    180
  );

  assert.equal(lines.length, 7);
  assert.equal(lines[0].kind, 'heading');
  assert.equal(lines[1].kind, 'lyric');
  assert.equal(lines[1].startTime, 0);
  assert.equal(lines[3].kind, 'spacer');
  assert.equal(lines[4].kind, 'heading');

  const sungLines = lines.filter((l) => l.kind === 'lyric');
  assert.equal(sungLines.length, 4);
  for (let i = 1; i < sungLines.length; i++) {
    assert.ok(
      sungLines[i].startTime > sungLines[i - 1].startTime,
      `Expected line ${i} startTime (${sungLines[i].startTime}) > line ${i - 1} (${sungLines[i - 1].startTime})`
    );
  }
  assert.equal(sungLines[sungLines.length - 1].endTime, 180);
});

test('buildSyncedLyrics honors explicit syncedLyrics metadata and LRC timestamps when provided', () => {
  const explicitLines = buildSyncedLyrics({
    id: 'trk-sync',
    duration: 120,
    syncedLyrics: [
      { time: 20, text: 'Second line' },
      { time: 5.5, text: 'First line' },
    ],
  });

  assert.equal(explicitLines[0].text, 'First line');
  assert.equal(explicitLines[0].startTime, 5.5);
  assert.equal(explicitLines[0].endTime, 20);
  assert.equal(explicitLines[0].hasExplicitTimestamp, true);

  const lrcLines = buildSyncedLyrics({
    id: 'trk-lrc',
    duration: 100,
    lyrics: ['[00:08.00] Intro vocals', '[00:24.50] Main hook'],
  });
  assert.equal(lrcLines[0].startTime, 8);
  assert.equal(lrcLines[0].endTime, 24.5);
  assert.equal(lrcLines[1].startTime, 24.5);
  assert.equal(lrcLines[1].hasExplicitTimestamp, true);
});

test('getActiveLyricState highlights the currently sung line and tracks progress across currentTime', () => {
  const lines = buildSyncedLyrics(
    {
      id: 'trk-active',
      duration: 100,
      lyrics: [
        '[Verse 1]',
        'Line one text here',
        'Line two text here',
        'Line three text here',
        'Line four text here',
      ],
    },
    100
  );

  // At 0s -> first sung line (index 1, skipping [Verse 1] heading)
  const atStart = getActiveLyricState(lines, 0);
  assert.equal(atStart.activeIndex, 1);
  assert.equal(atStart.lineProgress, 0);

  // Midpoint of line 2
  const line2Mid = (lines[2].startTime + lines[2].endTime) / 2;
  const atMid2 = getActiveLyricState(lines, line2Mid);
  assert.equal(atMid2.activeIndex, 2);
  assert.ok(atMid2.lineProgress > 0.45 && atMid2.lineProgress < 0.55);

  // Near end of song -> last sung line (index 4)
  const atEnd = getActiveLyricState(lines, 98);
  assert.equal(atEnd.activeIndex, 4);
  assert.ok(atEnd.lineProgress > 0.8);
});

test('getActiveLyricState returns -1 before explicit intro timestamp and formats timestamps cleanly', () => {
  const lrcLines = buildSyncedLyrics({
    id: 'trk-intro',
    duration: 90,
    lyrics: ['[00:12.00] First line after intro', '[00:30.00] Second line'],
  });

  assert.equal(getActiveLyricState(lrcLines, 4).activeIndex, -1);
  assert.equal(getActiveLyricState(lrcLines, 12).activeIndex, 0);
  assert.equal(getActiveLyricState(lrcLines, 35).activeIndex, 1);

  assert.equal(formatLyricTimestamp(0), '0:00');
  assert.equal(formatLyricTimestamp(65.9), '1:05');
  assert.equal(formatLyricTimestamp(-3), '0:00');
});
