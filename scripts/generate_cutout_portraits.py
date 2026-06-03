#!/usr/bin/env python3
from pathlib import Path
from rembg import remove, new_session
from PIL import Image
import io

SRC = Path('src/assets/portraits')
OUT = Path('src/assets/portraits-cutout')
OUT.mkdir(parents=True, exist_ok=True)

session = new_session('u2net')

count = 0
for src in sorted(SRC.glob('*.jpg')):
    dst = OUT / f"{src.stem}.png"
    with src.open('rb') as f:
      inp = f.read()
    out = remove(inp, session=session)
    img = Image.open(io.BytesIO(out)).convert('RGBA')

    # Slight cleanup: remove near-transparent fringe
    alpha = img.split()[-1].point(lambda a: 0 if a < 16 else a)
    img.putalpha(alpha)

    img.save(dst, 'PNG', optimize=True)
    count += 1
    if count % 10 == 0:
        print(f"processed {count}")

print(f"done: {count} portraits -> {OUT}")
