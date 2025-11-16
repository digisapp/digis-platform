const fs = require('fs');
const path = require('path');

// WAV file header generator
function createWavHeader(dataLength, sampleRate = 48000, numChannels = 1, bitsPerSample = 16) {
  const buffer = Buffer.alloc(44);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Chunk size
  buffer.writeUInt16LE(1, 20);  // Audio format (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28); // Byte rate
  buffer.writeUInt16LE(numChannels * bitsPerSample / 8, 32); // Block align
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

// Convert float samples to 16-bit PCM
function floatTo16BitPCM(samples) {
  const buffer = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7FFF, i * 2);
  }
  return buffer;
}

// Sound generators
const soundGenerators = {
  'gift-small': (sampleRate) => {
    // Light "ding" - single bell tone
    const duration = 0.3;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 8);
      samples[i] = Math.sin(2 * Math.PI * 800 * t) * envelope * 0.3 +
                   Math.sin(2 * Math.PI * 1200 * t) * envelope * 0.15;
    }
    return samples;
  },

  'gift-medium': (sampleRate) => {
    // Pleasant chime - two bell tones
    const duration = 0.5;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 6);

      // First chime
      let sound = Math.sin(2 * Math.PI * 600 * t) * envelope * 0.25;

      // Second chime (delayed)
      if (t > 0.15) {
        const t2 = t - 0.15;
        const envelope2 = Math.exp(-t2 * 6);
        sound += Math.sin(2 * Math.PI * 800 * t2) * envelope2 * 0.25;
      }

      samples[i] = sound;
    }
    return samples;
  },

  'gift-large': (sampleRate) => {
    // Exciting fanfare - rising tones
    const duration = 0.8;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 4) * (1 - Math.exp(-t * 20));

      // Rising fanfare with harmonics
      const freq = 400 + t * 400;
      samples[i] = (
        Math.sin(2 * Math.PI * freq * t) * 0.3 +
        Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.15 +
        Math.sin(2 * Math.PI * freq * 2 * t) * 0.1
      ) * envelope;
    }
    return samples;
  },

  'gift-epic': (sampleRate) => {
    // Epic celebration - complex harmony
    const duration = 1.2;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 3) * (1 - Math.exp(-t * 30));

      const baseFreq = 300;
      let sound = 0;

      // Major chord progression
      sound += Math.sin(2 * Math.PI * baseFreq * t) * 0.25;
      sound += Math.sin(2 * Math.PI * baseFreq * 1.25 * t) * 0.2;
      sound += Math.sin(2 * Math.PI * baseFreq * 1.5 * t) * 0.2;
      sound += Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.15;

      // Add shimmer
      if (t > 0.3) {
        const shimmer = Math.sin(2 * Math.PI * 1600 * t) * Math.exp(-(t - 0.3) * 8) * 0.15;
        sound += shimmer;
      }

      samples[i] = sound * envelope;
    }
    return samples;
  },

  'big-tip': (sampleRate) => {
    // Celebratory fanfare - triumphant
    const duration = 1.0;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 3.5) * (1 - Math.exp(-t * 25));

      const freq = 350;
      let sound = 0;

      sound += Math.sin(2 * Math.PI * freq * t) * 0.3;
      sound += Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.2;
      sound += Math.sin(2 * Math.PI * freq * 2 * t) * 0.15;

      // Add excitement with high frequency burst
      if (t < 0.2) {
        sound += Math.sin(2 * Math.PI * 1200 * t) * (0.2 - t) * 0.5;
      }

      samples[i] = sound * envelope;
    }
    return samples;
  },

  'goal-complete': (sampleRate) => {
    // Triumph fanfare - victory sound
    const duration = 1.5;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 2.5) * (1 - Math.exp(-t * 20));

      let sound = 0;

      // First note (0-0.3s)
      if (t < 0.3) {
        sound += Math.sin(2 * Math.PI * 400 * t) * 0.3;
      }

      // Second note (0.3-0.6s)
      if (t >= 0.3 && t < 0.6) {
        const t2 = t - 0.3;
        sound += Math.sin(2 * Math.PI * 500 * t2) * 0.3;
      }

      // Third note (0.6s+)
      if (t >= 0.6) {
        const t3 = t - 0.6;
        sound += Math.sin(2 * Math.PI * 600 * t3) * 0.35;
        sound += Math.sin(2 * Math.PI * 900 * t3) * 0.2;
      }

      // Add shimmer throughout
      sound += Math.sin(2 * Math.PI * 2000 * t) * Math.exp(-t * 5) * 0.1;

      samples[i] = sound * envelope;
    }
    return samples;
  }
};

// Generate and save WAV file
function generateWavFile(name, generator, outputDir) {
  const sampleRate = 48000;
  const samples = generator(sampleRate);
  const pcmData = floatTo16BitPCM(samples);
  const header = createWavHeader(pcmData.length, sampleRate);
  const wavData = Buffer.concat([header, pcmData]);

  const outputPath = path.join(outputDir, `${name}.wav`);
  fs.writeFileSync(outputPath, wavData);

  return outputPath;
}

// Main execution
console.log('🔊 Generating Digis Alert Sounds...\n');

const outputDir = path.join(__dirname, '..', 'public', 'sounds');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sounds = [
  { name: 'gift-small', desc: 'Light ding for small gifts' },
  { name: 'gift-medium', desc: 'Pleasant chime for medium gifts' },
  { name: 'gift-large', desc: 'Exciting fanfare for large gifts' },
  { name: 'gift-epic', desc: 'Epic celebration for 1000+ coins' },
  { name: 'big-tip', desc: 'Celebratory fanfare for top tippers' },
  { name: 'goal-complete', desc: 'Triumph fanfare for completed goals' }
];

sounds.forEach(({ name, desc }) => {
  const outputPath = generateWavFile(name, soundGenerators[name], outputDir);
  const stats = fs.statSync(outputPath);
  const sizeKB = (stats.size / 1024).toFixed(1);
  console.log(`✓ ${name}.wav - ${desc} (${sizeKB} KB)`);
});

console.log(`\n✅ All 6 sound files generated successfully!`);
console.log(`📁 Location: ${outputDir}`);
console.log(`\n🎉 Your celebrations now have sound! Go test them on your stream.`);
