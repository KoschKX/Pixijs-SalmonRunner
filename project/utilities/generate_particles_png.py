# Generates simple PNGs for foam and splash particles using Pillow (Python)
from PIL import Image, ImageDraw
import os

output_dir = os.path.join(os.path.dirname(__file__), '../assets/generated')
os.makedirs(output_dir, exist_ok=True)

def save_circle_png(filename, radius, color=(255,255,255,255), alpha=1.0):
    size = radius * 2 + 2
    img = Image.new('RGBA', (size, size), (0,0,0,0))
    draw = ImageDraw.Draw(img)
    fill = (color[0], color[1], color[2], int(255*alpha))
    draw.ellipse((1,1,size-1,size-1), fill=fill)
    img.save(os.path.join(output_dir, filename))
    print('Created', filename)

# Generate foam and splash PNGs for sizes 2, 4, 6, 8
for size in [2, 4, 6, 8]:
    save_circle_png(f'foam_{size}.png', size, (255,255,255,255), 0.8)
    save_circle_png(f'splash_{size}.png', size, (255,255,255,255), 1.0)

print('Done!')
