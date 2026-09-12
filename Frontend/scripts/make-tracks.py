"""Rebuild Bodybeat's two original demo tracks (requires numpy and ffmpeg)."""
from pathlib import Path
import subprocess
import tempfile
import wave
import numpy as np

RATE = 44100
OUT = Path(__file__).resolve().parents[1] / 'public' / 'audio'
rng = np.random.default_rng(26)

def tone(note, duration, kind='pluck'):
    t = np.arange(int(RATE * duration)) / RATE
    hz = 440 * 2 ** ((note - 69) / 12)
    if kind == 'bass':
        signal = np.sin(2 * np.pi * hz * t) + .22 * np.sin(4 * np.pi * hz * t)
        envelope = np.minimum(t * 180, 1) * np.exp(-t * 4)
    else:
        signal = np.sin(2 * np.pi * hz * t) + .3 * np.sin(4 * np.pi * hz * t)
        envelope = np.minimum(t * 160, 1) * np.exp(-t * 7)
    return signal * envelope

def drum(kind):
    duration = {'kick': .4, 'snare': .18, 'hat': .065}[kind]
    t = np.arange(int(RATE * duration)) / RATE
    noise = rng.uniform(-1, 1, len(t))
    if kind == 'kick':
        phase = 2 * np.pi * (48 * t + 80 * .026 * (1 - np.exp(-t / .026)))
        return np.sin(phase) * np.exp(-t * 13)
    if kind == 'snare':
        return (noise * .55 + .2 * np.sin(2 * np.pi * 180 * t)) * np.exp(-t * 24)
    return np.diff(noise, prepend=0) * np.exp(-t * 80) * .3

def render(name, bpm, bars, roots, melody):
    beat = 60 / bpm
    duration = bars * 4 * beat
    mix = np.zeros((int(RATE * duration), 2))

    def add(signal, time, gain, pan=0):
        start = round(time * RATE)
        end = min(len(mix), start + len(signal))
        if end <= start:
            return
        s = signal[:end-start] * gain
        mix[start:end, 0] += s * (1 - pan * .4)
        mix[start:end, 1] += s * (1 + pan * .4)

    for bar in range(bars):
        root = roots[(bar // 2) % len(roots)]
        for step in range(8):
            now = (bar * 4 + step / 2) * beat
            add(drum('hat'), now, .13 if step % 2 else .09, .25)
            if step % 2 == 0:
                add(drum('kick'), now, .6)
                add(tone(root + (12 if step == 6 else 0), beat * .7, 'bass'), now, .35)
            if step in (2, 6):
                add(drum('snare'), now, .32, -.15)
            if bar >= 2 and step in (0, 3, 4, 7):
                note = root + 24 + melody[(bar * 4 + (0, 3, 4, 7).index(step)) % len(melody)]
                lead = tone(note, beat * 1.2)
                add(lead, now, .16, -.25)
                add(lead, now + beat * .75, .055, .45)
        if bar % 2 == 0:
            for interval in (12, 15, 19):
                add(tone(root + interval, beat * 3), bar * 4 * beat, .07, .2)

    fade = int(.3 * RATE)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    mix = np.tanh(mix * 1.3)
    mix = (mix / max(1, np.abs(mix).max()) * 28000).astype('<i2')
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav') as temp:
        with wave.open(temp.name, 'wb') as wav:
            wav.setparams((2, 2, RATE, 0, 'NONE', 'not compressed'))
            wav.writeframes(mix.tobytes())
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', temp.name,
                        '-codec:a', 'libmp3lame', '-b:a', '160k', str(OUT / f'{name}.mp3')], check=True)
    print(f'{name}: {duration:.0f}s at {bpm} BPM')

render('first-groove', 96, 16, [48, 44, 51, 46], [0, 7, 10, 7, 3, 7, 12, 10])
render('disco-circuit', 120, 18, [45, 41, 48, 43], [0, 3, 7, 12, 10, 7, 3, 7])
