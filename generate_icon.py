from PIL import Image, ImageDraw, ImageFont
import os

img = Image.new('RGBA', (1024, 1024), '#FAF7F2')
draw = ImageDraw.Draw(img)

try:
    font = ImageFont.truetype("arialbd.ttf", 600)
except:
    font = ImageFont.load_default()

text = "g"

# Calculate text bounds manually to center it
bbox = draw.textbbox((0, 0), text, font=font)
text_width = bbox[2] - bbox[0]
text_height = bbox[3] - bbox[1]

x = (1024 - text_width) / 2
# shift down a bit for lowercase g
y = (1024 - text_height) / 2 - 80 

draw.text((x, y), text, fill="#007AFF", font=font)

if not os.path.exists('assets/images'):
    os.makedirs('assets/images')

img.save('assets/images/icon.png')
print("Icon generated at assets/images/icon.png")
