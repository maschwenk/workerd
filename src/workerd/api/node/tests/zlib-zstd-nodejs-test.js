// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0
import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import zlib from 'node:zlib';

// Basic sync compress/decompress test
export const zstdBasicSyncTest = {
  test() {
    const input = Buffer.from('Hello, Zstd compression!');
    const compressed = zlib.zstdCompressSync(input);
    assert(Buffer.isBuffer(compressed), 'Compressed output should be a buffer');
    assert(compressed.length > 0, 'Compressed output should not be empty');

    const decompressed = zlib.zstdDecompressSync(compressed);
    assert(
      Buffer.isBuffer(decompressed),
      'Decompressed output should be a buffer'
    );
    assert.strictEqual(
      decompressed.toString(),
      input.toString(),
      'Round-trip should match'
    );
  },
};

// Basic async compress/decompress test
export const zstdBasicAsyncTest = {
  async test() {
    const input = Buffer.from('Hello, async Zstd compression!');

    const {
      promise: compressPromise,
      resolve: compressResolve,
      reject: compressReject,
    } = Promise.withResolvers();
    zlib.zstdCompress(input, (err, res) => {
      if (err) compressReject(err);
      else compressResolve(res);
    });
    const compressed = await compressPromise;

    assert(Buffer.isBuffer(compressed), 'Compressed output should be a buffer');
    assert(compressed.length > 0, 'Compressed output should not be empty');

    const {
      promise: decompressPromise,
      resolve: decompressResolve,
      reject: decompressReject,
    } = Promise.withResolvers();
    zlib.zstdDecompress(compressed, (err, res) => {
      if (err) decompressReject(err);
      else decompressResolve(res);
    });
    const decompressed = await decompressPromise;

    assert(
      Buffer.isBuffer(decompressed),
      'Decompressed output should be a buffer'
    );
    assert.strictEqual(
      decompressed.toString(),
      input.toString(),
      'Round-trip should match'
    );
  },
};

// Test with string input
export const zstdStringInputTest = {
  test() {
    const input = 'This is a string input for Zstd compression';
    const compressed = zlib.zstdCompressSync(input);
    const decompressed = zlib.zstdDecompressSync(compressed);
    assert.strictEqual(
      decompressed.toString(),
      input,
      'String input round-trip should match'
    );
  },
};

// Test with larger data
export const zstdLargeDataTest = {
  test() {
    // Create a 100KB buffer with repetitive content (compresses well)
    const input = Buffer.alloc(100 * 1024);
    for (let i = 0; i < input.length; i++) {
      input[i] = i % 256;
    }

    const compressed = zlib.zstdCompressSync(input);
    assert(
      compressed.length < input.length,
      'Compressed should be smaller than input'
    );

    const decompressed = zlib.zstdDecompressSync(compressed);
    assert(input.equals(decompressed), 'Large data round-trip should match');
  },
};

// Test with different compression levels
export const zstdCompressionLevelsTest = {
  test() {
    const input = Buffer.from(
      'Test data for compression level testing'.repeat(100)
    );

    // Test compression level 1 (fastest)
    const compressedFast = zlib.zstdCompressSync(input, {
      params: { [zlib.constants.ZSTD_c_compressionLevel]: 1 },
    });

    // Test compression level 19 (best compression)
    const compressedBest = zlib.zstdCompressSync(input, {
      params: { [zlib.constants.ZSTD_c_compressionLevel]: 19 },
    });

    // Both should decompress correctly
    const decompressedFast = zlib.zstdDecompressSync(compressedFast);
    const decompressedBest = zlib.zstdDecompressSync(compressedBest);

    assert(
      input.equals(decompressedFast),
      'Fast compression should decompress correctly'
    );
    assert(
      input.equals(decompressedBest),
      'Best compression should decompress correctly'
    );

    // Higher compression level should typically produce smaller output
    assert(
      compressedBest.length <= compressedFast.length,
      'Higher compression level should produce smaller or equal output'
    );
  },
};

// Test with default compression level
export const zstdDefaultCompressionTest = {
  test() {
    const input = Buffer.from('Testing default compression level');
    const compressed = zlib.zstdCompressSync(input);
    const decompressed = zlib.zstdDecompressSync(compressed);
    assert.strictEqual(
      decompressed.toString(),
      input.toString(),
      'Default compression should work'
    );
  },
};

// Test stream API
export const zstdStreamTest = {
  async test() {
    const input = Buffer.from('Stream compression test data'.repeat(50));

    // Create compress stream
    const compress = zlib.createZstdCompress();
    const decompress = zlib.createZstdDecompress();

    const chunks = [];

    // Pipe through compress
    compress.on('data', (chunk) => chunks.push(chunk));

    await new Promise((resolve, reject) => {
      compress.on('end', resolve);
      compress.on('error', reject);
      compress.end(input);
    });

    const compressed = Buffer.concat(chunks);
    assert(compressed.length > 0, 'Stream should produce output');

    // Decompress
    const decompressedChunks = [];
    decompress.on('data', (chunk) => decompressedChunks.push(chunk));

    await new Promise((resolve, reject) => {
      decompress.on('end', resolve);
      decompress.on('error', reject);
      decompress.end(compressed);
    });

    const decompressed = Buffer.concat(decompressedChunks);
    assert(input.equals(decompressed), 'Stream round-trip should match');
  },
};

// Test empty input
export const zstdEmptyInputTest = {
  test() {
    const input = Buffer.alloc(0);
    const compressed = zlib.zstdCompressSync(input);
    const decompressed = zlib.zstdDecompressSync(compressed);
    assert.strictEqual(
      decompressed.length,
      0,
      'Empty input should produce empty output'
    );
  },
};

// Test invalid compressed data
export const zstdInvalidDataTest = {
  test() {
    const invalidData = Buffer.from('This is not valid zstd compressed data');
    assert.throws(
      () => zlib.zstdDecompressSync(invalidData),
      {
        code: 'ZSTD_error_prefix_unknown',
        errno: 10,
        message: 'Unknown frame descriptor',
      },
      'Should throw on invalid compressed data'
    );
  },
};

// Test chunkSize option
export const zstdChunkSizeTest = {
  test() {
    const input = Buffer.from('Testing chunk size option'.repeat(100));
    const compressed = zlib.zstdCompressSync(input, { chunkSize: 1024 });
    const decompressed = zlib.zstdDecompressSync(compressed, {
      chunkSize: 1024,
    });
    assert(
      input.equals(decompressed),
      'Custom chunkSize should work correctly'
    );
  },
};

// Test maxOutputLength option
export const zstdMaxOutputLengthTest = {
  test() {
    const input = Buffer.from('A'.repeat(1000));
    const compressed = zlib.zstdCompressSync(input);

    // Try to decompress with a maxOutputLength that's too small
    assert.throws(
      () => zlib.zstdDecompressSync(compressed, { maxOutputLength: 10 }),
      /Memory limit exceeded/,
      'Should throw when maxOutputLength is exceeded'
    );
  },
};

// Test callback error handling
export const zstdCallbackErrorTest = {
  async test() {
    const invalidData = Buffer.from('invalid zstd data');

    const { promise, resolve, reject } = Promise.withResolvers();
    zlib.zstdDecompress(invalidData, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });

    try {
      await promise;
      assert.fail('Should have thrown');
    } catch (err) {
      assert(err instanceof Error, 'Should receive an error');
    }
  },
};

// Test with params for strategy
export const zstdStrategyTest = {
  test() {
    const input = Buffer.from('Testing compression strategy'.repeat(50));

    // Test with ZSTD_fast strategy
    const compressedFast = zlib.zstdCompressSync(input, {
      params: {
        [zlib.constants.ZSTD_c_strategy]: zlib.constants.ZSTD_fast,
      },
    });

    const decompressed = zlib.zstdDecompressSync(compressedFast);
    assert(input.equals(decompressed), 'Strategy option should work correctly');
  },
};

// Test with info option
export const zstdInfoOptionTest = {
  test() {
    const input = Buffer.from('Testing info option');
    const result = zlib.zstdCompressSync(input, { info: true });

    // When info is true, result should be an object with buffer and engine properties
    assert(
      typeof result === 'object',
      'Result should be an object when info is true'
    );
    assert(result.buffer, 'Result should have a buffer property');
    assert(result.engine, 'Result should have an engine property');
  },
};

// Test classes are exported
export const zstdClassesExportedTest = {
  test() {
    assert.strictEqual(
      typeof zlib.ZstdCompress,
      'function',
      'ZstdCompress should be exported'
    );
    assert.strictEqual(
      typeof zlib.ZstdDecompress,
      'function',
      'ZstdDecompress should be exported'
    );
    assert.strictEqual(
      typeof zlib.createZstdCompress,
      'function',
      'createZstdCompress should be exported'
    );
    assert.strictEqual(
      typeof zlib.createZstdDecompress,
      'function',
      'createZstdDecompress should be exported'
    );
  },
};

// Test sync functions are exported
export const zstdSyncFunctionsExportedTest = {
  test() {
    assert.strictEqual(
      typeof zlib.zstdCompressSync,
      'function',
      'zstdCompressSync should be exported'
    );
    assert.strictEqual(
      typeof zlib.zstdDecompressSync,
      'function',
      'zstdDecompressSync should be exported'
    );
    assert.strictEqual(
      typeof zlib.zstdCompress,
      'function',
      'zstdCompress should be exported'
    );
    assert.strictEqual(
      typeof zlib.zstdDecompress,
      'function',
      'zstdDecompress should be exported'
    );
  },
};

// Test sync decompression of truncated compressed data (EOF mid-frame)
export const zstdTruncatedSyncTest = {
  test() {
    const input = Buffer.from('Hello, Zstd truncation test!'.repeat(100));
    const compressed = zlib.zstdCompressSync(input);

    // Cut the compressed data in half
    const truncated = compressed.subarray(0, Math.floor(compressed.length / 2));
    assert.throws(
      () => zlib.zstdDecompressSync(truncated),
      (err) => err instanceof Error,
      'Should throw on truncated compressed data'
    );
  },
};

// Test async decompression of truncated compressed data
export const zstdTruncatedAsyncTest = {
  async test() {
    const input = Buffer.from('Hello, Zstd truncation test!'.repeat(100));
    const compressed = zlib.zstdCompressSync(input);
    const truncated = compressed.subarray(0, Math.floor(compressed.length / 2));

    const { promise, resolve, reject } = Promise.withResolvers();
    zlib.zstdDecompress(truncated, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });

    try {
      await promise;
      assert.fail('Should have thrown on truncated data');
    } catch (err) {
      assert(
        err instanceof Error,
        'Should receive an error for truncated data'
      );
    }
  },
};

// Test stream decompression of truncated compressed data
export const zstdTruncatedStreamTest = {
  async test() {
    const input = Buffer.from('Stream truncation test data'.repeat(100));
    const compressed = zlib.zstdCompressSync(input);
    const truncated = compressed.subarray(0, Math.floor(compressed.length / 2));

    const decompress = zlib.createZstdDecompress();

    let errored = false;
    decompress.on('error', () => {
      errored = true;
    });

    decompress.end(truncated);
    try {
      for await (const _chunk of decompress) {
        // consume chunks
      }
    } catch {
      errored = true;
    }

    assert(errored, 'Stream should error on truncated compressed data');
  },
};

// Test stream decompression with large output and small chunkSize to exercise
// the processCallback recursion path; verify we don't get a stack overflow.
export const zstdStreamLargeDecompressTest = {
  async test() {
    // 1MB of compressible data — compresses small, decompresses large.
    // With chunkSize=64, this requires ~16,000 output chunks, which triggers
    // deep recursion in processCallback if the callback is synchronous.
    const input = Buffer.alloc(1024 * 1024, 'A');
    const compressed = zlib.zstdCompressSync(input);

    const decompress = zlib.createZstdDecompress({ chunkSize: 64 });
    let totalBytes = 0;

    decompress.end(compressed);
    for await (const chunk of decompress) {
      totalBytes += chunk.length;
    }

    assert.strictEqual(
      totalBytes,
      input.length,
      `Decompressed size should be ${input.length}, got ${totalBytes}`
    );
  },
};

function xorshiftBytes(length) {
  const bytes = Buffer.allocUnsafe(length);
  let x = length;
  for (let i = 0; i < length; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    bytes[i] = x & 0x7f;
  }
  return bytes;
}

async function zstdCompressStreaming(input, options, writeSize) {
  const compress = zlib.createZstdCompress(options);
  const chunks = [];
  compress.on('data', (chunk) => chunks.push(chunk));
  const { promise, resolve, reject } = Promise.withResolvers();
  compress.on('end', resolve);
  compress.on('error', reject);
  for (let offset = 0; offset < input.length; offset += writeSize) {
    compress.write(input.subarray(offset, offset + writeSize));
  }
  compress.end();
  await promise;
  return Buffer.concat(chunks);
}

export const zstdStreamFinalFlushOverflowsChunkTest = {
  async test() {
    const input = xorshiftBytes(200_000);
    const compressed = await zstdCompressStreaming(
      input,
      { chunkSize: 1024 },
      64 * 1024
    );
    assert(compressed.length > 1024);
    assert(input.equals(zlib.zstdDecompressSync(compressed)));
  },
};

export const zstdStreamFinalFlushCrossesMiBChunkBoundaryTest = {
  async test() {
    const input = xorshiftBytes(1_250_000);
    const compressed = await zstdCompressStreaming(
      input,
      {
        chunkSize: 1 << 20,
        params: { [zlib.constants.ZSTD_c_compressionLevel]: 1 },
      },
      64 * 1024
    );
    assert(compressed.length > 1 << 20);
    assert(input.equals(zlib.zstdDecompressSync(compressed)));
  },
};

export const zstdCompressSyncOutputLargerThanFirstBufferTest = {
  test() {
    for (const length of [100_000, 2_000_000]) {
      const input = xorshiftBytes(length);
      const compressed = zlib.zstdCompressSync(input);
      assert(compressed.length > 40 * 1024);
      assert(input.equals(zlib.zstdDecompressSync(compressed)));
    }
  },
};

export const zstdCompressCallbackOutputLargerThanFirstBufferTest = {
  async test() {
    for (const length of [100_000, 2_000_000]) {
      const input = xorshiftBytes(length);
      const { promise, resolve, reject } = Promise.withResolvers();
      zlib.zstdCompress(input, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
      const compressed = await promise;
      assert(compressed.length > 40 * 1024);
      assert(input.equals(zlib.zstdDecompressSync(compressed)));
    }
  },
};

export const zstdCompressSyncMaxOutputLengthTest = {
  test() {
    assert.throws(
      () =>
        zlib.zstdCompressSync(xorshiftBytes(200_000), {
          maxOutputLength: 64 * 1024,
        }),
      { name: 'RangeError', message: /Memory limit exceeded/ }
    );
  },
};

export const zstdCompressSyncMaxOutputLengthAtBufferBoundaryTest = {
  test() {
    const syncFirstBufferSize = 40 * 1024;
    assert.throws(
      () =>
        zlib.zstdCompressSync(xorshiftBytes(200_000), {
          maxOutputLength: 2 * syncFirstBufferSize,
        }),
      { name: 'RangeError', message: /Memory limit exceeded/ }
    );
  },
};

// The sync output buffer starts at 40 KiB and doubles, so 1x, 2x and 4x fill it exactly.
export const zstdDecompressSyncOutputFillsBufferTest = {
  async test() {
    const syncFirstBufferSize = 40 * 1024;
    for (const multiple of [1, 2, 3, 4]) {
      for (const delta of [-1, 0, 1]) {
        const size = multiple * syncFirstBufferSize + delta;
        const input = xorshiftBytes(size);
        const compressed = zlib.zstdCompressSync(input);
        assert(
          input.equals(zlib.zstdDecompressSync(compressed)),
          `size ${size}`
        );

        const { promise, resolve, reject } = Promise.withResolvers();
        zlib.zstdDecompress(compressed, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
        assert(input.equals(await promise), `size ${size}`);
      }
    }
  },
};

// A skippable frame (magic numbers 0x184D2A50 to 0x184D2A5F) carrying `payload`.
function zstdSkippableFrame(payload, magicLowNibble = 0) {
  const header = Buffer.alloc(8);
  header.writeUInt32LE(0x184d2a50 + magicLowNibble, 0);
  header.writeUInt32LE(payload.length, 4);
  return Buffer.concat([header, payload]);
}

function zstdDecompressCallback(input, options = {}) {
  const { promise, resolve, reject } = Promise.withResolvers();
  zlib.zstdDecompress(input, options, (err, res) => {
    if (err) reject(err);
    else resolve(res);
  });
  return promise;
}

async function zstdDecompressStreaming(input, writeSize) {
  const decompress = zlib.createZstdDecompress();
  const chunks = [];
  decompress.on('data', (chunk) => chunks.push(chunk));
  const { promise, resolve, reject } = Promise.withResolvers();
  decompress.on('end', resolve);
  decompress.on('error', reject);
  for (let offset = 0; offset < input.length; offset += writeSize) {
    decompress.write(input.subarray(offset, offset + writeSize));
  }
  decompress.end();
  await promise;
  return Buffer.concat(chunks);
}

// Decodes `input` with every API and checks each result against `expected`.
async function assertZstdDecodesTo(input, expected, message) {
  assert(expected.equals(zlib.zstdDecompressSync(input)), `sync: ${message}`);
  assert(
    expected.equals(zlib.zstdDecompressSync(input, { info: true }).buffer),
    `info: ${message}`
  );
  assert(
    expected.equals(await zstdDecompressCallback(input)),
    `callback: ${message}`
  );
  for (const writeSize of [1, 7, 4096, input.length || 1]) {
    assert(
      expected.equals(await zstdDecompressStreaming(input, writeSize)),
      `stream, ${writeSize}-byte writes: ${message}`
    );
  }
}

// The zstd format allows a stream to hold several frames; zstd and Node.js decode all of them.
export const zstdDecompressConcatenatedFramesTest = {
  async test() {
    const a = Buffer.from('first frame '.repeat(50));
    const b = xorshiftBytes(300);
    const c = xorshiftBytes(40 * 1024);
    const [fa, fb, fc] = [a, b, c].map((x) => zlib.zstdCompressSync(x));
    const empty = zlib.zstdCompressSync(Buffer.alloc(0));

    await assertZstdDecodesTo(
      Buffer.concat([fa, fb]),
      Buffer.concat([a, b]),
      'two frames'
    );
    await assertZstdDecodesTo(
      Buffer.concat([fa, fb, fa]),
      Buffer.concat([a, b, a]),
      'three frames'
    );
    // The first frame fills the first 40 KiB sync output buffer exactly.
    await assertZstdDecodesTo(
      Buffer.concat([fc, fa]),
      Buffer.concat([c, a]),
      'a frame after one that fills the output buffer'
    );
    await assertZstdDecodesTo(
      Buffer.concat([empty, fa, empty]),
      a,
      'empty frames around a frame'
    );
  },
};

export const zstdDecompressSkippableFramesTest = {
  async test() {
    const a = Buffer.from('payload after a skippable frame '.repeat(20));
    const b = xorshiftBytes(100);
    const fa = zlib.zstdCompressSync(a);
    const fb = zlib.zstdCompressSync(b);
    const skippable = zstdSkippableFrame(Buffer.from([1, 2, 3, 4]));
    const lastMagic = zstdSkippableFrame(Buffer.alloc(0), 0xf);

    await assertZstdDecodesTo(
      Buffer.concat([skippable, fa]),
      a,
      'a skippable frame first'
    );
    await assertZstdDecodesTo(
      Buffer.concat([fa, skippable, fb]),
      Buffer.concat([a, b]),
      'a skippable frame between frames'
    );
    await assertZstdDecodesTo(
      Buffer.concat([fa, lastMagic]),
      a,
      'a skippable frame last'
    );
  },
};

// Input after the last frame that does not start a frame is ignored, as in Node.js.
export const zstdDecompressTrailingJunkTest = {
  async test() {
    const a = Buffer.from('frame followed by junk '.repeat(20));
    const fa = zlib.zstdCompressSync(a);
    for (const junk of [
      Buffer.from([0]),
      Buffer.from('xyz'),
      Buffer.from('not a zstd frame at all'),
      Buffer.alloc(16),
      // Prefixes of the zstd magic number too short to tell apart from junk.
      Buffer.from([0x28, 0xb5, 0x2f]),
    ]) {
      await assertZstdDecodesTo(
        Buffer.concat([fa, junk]),
        a,
        `junk ${junk.toString('hex')}`
      );
    }
    // Junk after a frame that fills the first sync output buffer exactly.
    const c = xorshiftBytes(40 * 1024);
    await assertZstdDecodesTo(
      Buffer.concat([zlib.zstdCompressSync(c), Buffer.from('xyz')]),
      c,
      'junk after a frame that fills the output buffer'
    );
  },
};

export const zstdDecompressTruncatedSecondFrameTest = {
  async test() {
    const fa = zlib.zstdCompressSync(Buffer.from('complete '.repeat(30)));
    const fb = zlib.zstdCompressSync(xorshiftBytes(5000));
    const truncated = Buffer.concat([fa, fb.subarray(0, fb.length - 10)]);
    const magicOnly = Buffer.concat([fa, fb.subarray(0, 4)]);
    for (const input of [truncated, magicOnly]) {
      assert.throws(() => zlib.zstdDecompressSync(input), {
        message: 'unexpected end of file',
      });
      await assert.rejects(zstdDecompressCallback(input), {
        message: 'unexpected end of file',
      });
      await assert.rejects(zstdDecompressStreaming(input, 100), {
        message: 'unexpected end of file',
      });
    }
  },
};

// Input with no frame in it, empty input included, is truncated.
export const zstdDecompressEmptyInputTest = {
  async test() {
    for (const input of [Buffer.alloc(0), Buffer.from([0x28, 0xb5])]) {
      assert.throws(() => zlib.zstdDecompressSync(input), {
        message: 'unexpected end of file',
      });
      await assert.rejects(zstdDecompressCallback(input), {
        message: 'unexpected end of file',
      });
    }
  },
};

// maxOutputLength applies to the output of all the frames together.
export const zstdDecompressFramesMaxOutputLengthTest = {
  test() {
    const a = xorshiftBytes(1000);
    const frames = Buffer.concat([
      zlib.zstdCompressSync(a),
      zlib.zstdCompressSync(a),
    ]);
    assert.strictEqual(
      zlib.zstdDecompressSync(frames, { maxOutputLength: 2000 }).length,
      2000
    );
    assert.throws(
      () => zlib.zstdDecompressSync(frames, { maxOutputLength: 1999 }),
      { code: 'ERR_BUFFER_TOO_LARGE' }
    );
    assert.throws(
      () => zlib.zstdDecompressSync(frames, { maxOutputLength: 1000 }),
      { code: 'ERR_BUFFER_TOO_LARGE' }
    );
  },
};

// Output that fills maxOutputLength exactly is fine when what follows the last frame decodes to
// nothing: as in Node.js, only output past the limit fails.
export const zstdDecompressMaxOutputLengthWithTrailingInputTest = {
  test() {
    const a = xorshiftBytes(1000);
    const frame = zlib.zstdCompressSync(a);
    for (const tail of [
      Buffer.from('xyz'),
      zlib.zstdCompressSync(Buffer.alloc(0)),
      zstdSkippableFrame(Buffer.from('seek table')),
      Buffer.from([0x28, 0xb5]),
    ]) {
      const input = Buffer.concat([frame, tail]);
      for (const options of [
        { maxOutputLength: 1000 },
        { maxOutputLength: 1000, info: true },
      ]) {
        const result = zlib.zstdDecompressSync(input, options);
        assert(
          a.equals(options.info ? result.buffer : result),
          `tail ${tail.toString('hex')}`
        );
      }
    }
    // A truncated frame whose output reaches the limit is still truncated.
    const big = zlib.zstdCompressSync(xorshiftBytes(5000));
    assert.throws(
      () =>
        zlib.zstdDecompressSync(Buffer.concat([frame, big.subarray(0, 30)]), {
          maxOutputLength: 1000,
        }),
      { message: 'unexpected end of file' }
    );
  },
};
// zstd errors carry the code, errno and message Node.js gives them: the ZSTD_ErrorCode's name and
// value and zstd's description. Truncated input is Z_BUF_ERROR, as in zlib.
export const zstdDecompressErrorCodesTest = {
  async test() {
    const input = Buffer.from('zstd error codes '.repeat(500));
    const frame = zlib.zstdCompressSync(input, {
      params: { [zlib.constants.ZSTD_c_checksumFlag]: 1 },
    });
    const badChecksum = Buffer.from(frame);
    badChecksum[badChecksum.length - 1] ^= 0xff;
    // An empty frame whose header asks for a 256 MiB window (windowLog 28), above the decoder's
    // default limit of windowLog 27.
    const wideWindow = Buffer.from('28b52ffd0090010000', 'hex');
    const cases = [
      [
        Buffer.from('not zstd'),
        'ZSTD_error_prefix_unknown',
        10,
        'Unknown frame descriptor',
      ],
      [
        badChecksum,
        'ZSTD_error_checksum_wrong',
        22,
        "Restored data doesn't match checksum",
      ],
      [
        wideWindow,
        'ZSTD_error_frameParameter_windowTooLarge',
        16,
        'Frame requires too much memory for decoding',
      ],
      [frame.subarray(0, 20), 'Z_BUF_ERROR', -5, 'unexpected end of file'],
    ];
    for (const [data, code, errno, message] of cases) {
      const expected = { name: 'Error', code, errno, message };
      assert.throws(() => zlib.zstdDecompressSync(data), expected);
      assert.throws(
        () => zlib.zstdDecompressSync(data, { info: true }),
        expected
      );
      await assert.rejects(zstdDecompressCallback(data), expected);
      await assert.rejects(zstdDecompressStreaming(data, 64), expected);
    }
  },
};

// From Node.js' test-zlib-zstd.js: invalid keys, duplicate keys and values zstd rejects, through
// the stream constructors and the one-shot functions.
export const zstdParameterErrorsTest = {
  test() {
    const { constants } = zlib;
    const invalid = (key) => ({
      code: 'ERR_ZSTD_INVALID_PARAM',
      name: 'RangeError',
      message: `${key} is not a valid zstd parameter`,
    });
    const setFailed = {
      code: 'ERR_ZLIB_INITIALIZATION_FAILED',
      name: 'Error',
      message: 'Setting parameter failed',
    };
    const compress = [
      (options) => zlib.createZstdCompress(options),
      (options) => zlib.zstdCompressSync('', options),
      (options) => zlib.zstdCompress('', options, () => {}),
    ];
    const decompress = [
      (options) => zlib.createZstdDecompress(options),
      (options) => zlib.zstdDecompressSync(zlib.zstdCompressSync(''), options),
    ];
    for (const make of [...compress, ...decompress]) {
      assert.throws(() => make({ params: { 10000: 0 } }), invalid(10000));
      assert.throws(() => make({ params: { 0: 0, '00': 0 } }), invalid('00'));
    }
    for (const make of compress) {
      // Not a valid ZSTD_strategy.
      assert.throws(
        () => make({ params: { [constants.ZSTD_c_strategy]: 130 } }),
        setFailed
      );
      assert.throws(
        () => make({ params: { [constants.ZSTD_c_compressionLevel]: 'high' } }),
        { code: 'ERR_INVALID_ARG_TYPE', name: 'TypeError' }
      );
    }
    for (const make of decompress) {
      // Below ZSTD_WINDOWLOG_ABSOLUTEMIN.
      assert.throws(
        () => make({ params: { [constants.ZSTD_d_windowLogMax]: 1 } }),
        setFailed
      );
    }
  },
};

// Node.js checks pledgedSrcSize for every zstd entry point, compression or decompression.
export const zstdPledgedSrcSizeValidationTest = {
  test() {
    const frame = zlib.zstdCompressSync('pledged');
    const entryPoints = [
      (options) => zlib.createZstdCompress(options),
      (options) => zlib.createZstdDecompress(options),
      (options) => zlib.zstdCompressSync('pledged', options),
      (options) => zlib.zstdCompress('pledged', options, () => {}),
      (options) => zlib.zstdDecompressSync(frame, options),
      (options) => zlib.zstdDecompress(frame, options, () => {}),
    ];
    const cases = [
      ['7', 'TypeError', 'ERR_INVALID_ARG_TYPE', 'must be a number'],
      [null, 'TypeError', 'ERR_INVALID_ARG_TYPE', 'must be a number'],
      [1.5, 'RangeError', 'ERR_OUT_OF_RANGE', 'must be a safe integer'],
      [2 ** 53, 'RangeError', 'ERR_OUT_OF_RANGE', 'must be a safe integer'],
      [-1, 'RangeError', 'ERR_OUT_OF_RANGE', 'must be non-negative'],
    ];
    for (const make of entryPoints) {
      for (const [pledgedSrcSize, name, code, message] of cases) {
        assert.throws(() => make({ pledgedSrcSize }), {
          name,
          code,
          message: `pledgedSrcSize ${message}`,
        });
      }
    }
    assert.strictEqual(
      zlib
        .zstdDecompressSync(
          zlib.zstdCompressSync('pledged', { pledgedSrcSize: 7 })
        )
        .toString(),
      'pledged'
    );
  },
};
