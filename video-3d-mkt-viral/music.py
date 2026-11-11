"""Gera a trilha do reel (trilha.wav): batida eletrônica a 120 BPM, baixo em lá menor,
whoosh em cada corte de cena e efeitos sincronizados com a animação (anzol arrebentando,
colisão, estrelas da prova social, clique do "salvar"). Só usa numpy, sem samples externos."""
import wave
import numpy as np

SR = 44100
DUR = 28.0
CUTS = [0, 2.8, 6.6, 9.7, 12.8, 16.6, 19.7, 23.6]  # igual ao scene.js
SNAP, HIT = 1.35, 6.6 + 0.85
BPM = 120
BEAT = 60 / BPM
N = int(SR * DUR)
out = np.zeros(N)
rng = np.random.default_rng(3)


def place(sig, t, gain=1.0):
    i = int(t * SR)
    if i >= N:
        return
    j = min(N, i + len(sig))
    out[i:j] += sig[: j - i] * gain


def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.16)


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    x = rng.standard_normal(n); x = np.diff(np.concatenate([[0], x]))  # brilho (passa-alta simples)
    return x * env(n, 0.001, 0.06 if open_ else 0.015)


def clap():
    n = int(0.25 * SR); x = rng.standard_normal(n)
    e = sum(env(n, 0.001, 0.012) * (np.arange(n) >= int(k * SR)) for k in (0, 0.01, 0.022)) + env(n, 0.001, 0.09) * 0.6
    return np.diff(np.concatenate([[0], x])) * e * 0.8


def saw(freq, n):
    t = np.arange(n) / SR
    return 2 * ((t * freq) % 1) - 1


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.zeros_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc; y[i] = acc
    return y


def bass(freq, dur):
    n = int(dur * SR)
    x = saw(freq, n) + 0.5 * saw(freq * 1.005, n) + 0.6 * np.sin(2 * np.pi * freq / 2 * np.arange(n) / SR)
    return lowpass(x, 420) * env(n, 0.005, dur * 0.8)


def whoosh(rise=0.35):
    n = int(rise * SR + 0.25 * SR); x = rng.standard_normal(n)
    t = np.arange(n) / SR
    e = np.where(t < rise, (t / rise) ** 2, np.exp(-(t - rise) / 0.08))
    return lowpass(x, 2500) * e


def boom():
    n = int(1.1 * SR); t = np.arange(n) / SR
    f = 30 + 90 * np.exp(-t * 9)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * lowpass(rng.standard_normal(n), 900)) * env(n, 0.002, 0.35)


def ding(freq):
    n = int(0.6 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(2 * np.pi * freq * 2.01 * t)) * env(n, 0.002, 0.18)


def pad(freqs, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * 0.3 * t)) for f in freqs)
    fade = np.minimum(1, np.minimum(t / 0.4, (dur - t) / 0.4))
    return x * fade / len(freqs)


# progressão Am F C G, um acorde por compasso (2 s)
CHORDS = [(55.0, [220, 261.6, 329.6]), (43.65, [174.6, 220, 261.6]), (65.41, [196, 261.6, 329.6]), (49.0, [196, 246.9, 293.7])]
bar = 4 * BEAT
for b in range(int(DUR / bar) + 1):
    root, triad = CHORDS[b % 4]
    t0 = b * bar
    place(pad(triad, bar), t0, 0.10)
    for k in range(8):  # baixo em colcheias, com respiro no tempo do bumbo
        place(bass(root * (2 if k % 4 == 3 else 1), BEAT / 2 * 0.9), t0 + k * BEAT / 2 + 0.02, 0.22)

steps = int(DUR / (BEAT / 2))
for s in range(steps):
    t = s * BEAT / 2
    if t < 0.0:
        continue
    if s % 2 == 0:
        place(kick(), t, 0.95)
    else:
        place(hat(open_=(s % 8 == 7)), t, 0.18)
    if s % 4 == 2:
        place(clap(), t, 0.35)
    place(hat(), t + BEAT / 4, 0.07)

for c in CUTS[1:]:
    place(whoosh(), c - 0.35, 0.28)
place(boom(), SNAP, 0.9)
place(boom(), HIT, 0.9)
for i in range(5):  # 5 estrelas acendendo (scene.js: 0.3 + i*0.22 depois do corte)
    place(ding(880 * 2 ** (i * 2 / 12)), 12.8 + 0.3 + i * 0.22 + 0.25, 0.22)
place(ding(1318.5), 23.6 + 1.1, 0.3)  # clique do "salvar"

# "duck" leve: abre espaço para o boom do gancho e da colisão
for t in (SNAP, HIT):
    i = int(t * SR); n = int(0.5 * SR)
    out[i:i + n] *= 1 - 0.3 * np.exp(-np.arange(min(n, N - i)) / SR / 0.2)

out = np.tanh(out * 1.2)
out /= np.max(np.abs(out)) / 0.89
fade = int(0.05 * SR); out[-fade:] *= np.linspace(1, 0, fade)
pcm = (out * 32767).astype(np.int16)
stereo = np.repeat(pcm[:, None], 2, axis=1)
with wave.open('trilha.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(stereo.tobytes())
print('trilha.wav', DUR, 's')
