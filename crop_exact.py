import os
from PIL import Image

image_path = r"c:\Users\admin\.gemini\antigravity\brain\dc42d5c8-f2de-45ae-8ae8-57859c12262a\media__1773581581107.png"
output_dir = r"c:\Users\admin\OneDrive\Desktop\ai health\assets\langs"
os.makedirs(output_dir, exist_ok=True)

img = Image.open(image_path)
width, height = img.size

num_icons = 6
icon_names = ["en", "hi", "te", "ta", "kn", "ml"]

# The total width is 1024, height is 188
# Approx icon size is 112x112 or so.
# Let's crop slightly conservatively.
icon_w = 1024 // 6

for i in range(num_icons):
    # center of this block
    cx = i * icon_w + icon_w // 2
    
    # We will grab a 140x140 square from the top part
    # assuming the icon starts around y=10
    left = cx - 64
    right = cx + 64
    top = 8
    bottom = 136
    
    icon_img = img.crop((left, top, right, bottom))
    icon_img.save(os.path.join(output_dir, f"{icon_names[i]}.png"))
    
print("Saved 6 perfectly sliced images to", output_dir)
