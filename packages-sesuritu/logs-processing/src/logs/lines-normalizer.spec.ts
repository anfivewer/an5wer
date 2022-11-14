import {LinesNormalizer} from './lines-normalizer';

describe('LinesNormalizer', () => {
  it('should remove concurrenlty prefix and swap type with ts', () => {
    const normalizer = new LinesNormalizer();

    expect(
      normalizer.normalizeLine(
        '[Kicker] T 2022-10-28T20:53:42.699Z.000 kicker checkCandidates checking:false',
      ),
    ).toBe(
      '2022-10-28T20:53:42.699Z.000 T kicker checkCandidates checking:false',
    );
  });

  it('should prefix with last seen timestamp if timestamp not present/not valid', () => {
    const normalizer = new LinesNormalizer();

    // Valid timestamp
    normalizer.normalizeLine(
      '[Kicker] T 2022-10-28T20:53:42.699Z.000 kicker checkCandidates checking:false',
    );

    // No timestamp
    expect(normalizer.normalizeLine('some random line')).toBe(
      '2022-10-28T20:53:42.699Z.001 some random line',
    );

    // Invalid timestamp
    expect(
      normalizer.normalizeLine(
        '[Kicker] T 22-10-28T20:53:42.699Z.000 kicker checkCandidates checking:false',
      ),
    ).toBe(
      '2022-10-28T20:53:42.699Z.002 [Kicker] T 22-10-28T20:53:42.699Z.000 kicker checkCandidates checking:false',
    );
  });

  it('should prefix with epoch start if no timestamps seen', () => {
    const normalizer = new LinesNormalizer();

    // No timestamp
    expect(normalizer.normalizeLine('some random line')).toBe(
      '1970-01-01T00:00:00.000Z.001 some random line',
    );

    // Invalid timestamp
    expect(
      normalizer.normalizeLine(
        '[Kicker] T 22-10-28T20:53:42.699Z.000 kicker checkCandidates checking:false',
      ),
    ).toBe(
      '1970-01-01T00:00:00.000Z.002 [Kicker] T 22-10-28T20:53:42.699Z.000 kicker checkCandidates checking:false',
    );
  });
});
