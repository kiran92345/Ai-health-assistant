import os
from PIL import Image

image_path = r"c:\Users\admin\.gemini\antigravity\brain\dc42d5c8-f2de-45ae-8ae8-57859c12262a\media__1773581581107.png"
output_dir = r"c:\Users\admin\OneDrive\Desktop\ai health\assets\langs"
os.makedirs(output_dir, exist_ok=True)

img = Image.open(image_path)
width, height = img.size

# There are 6 icons roughly evenly spaced horizontally. Let's crop them.
# I'll just save the full image for now and maybe analyze its dimensions or crop heuristically.
# Actually, wait, it's easier to just slice the image into 6 equal width parts manually skipping the borders.

num_icons = 6
icon_names = ["en", "hi", "te", "ta", "kn", "ml"]

# Assuming the image is a long horizontal strip showing the 6 icons.
# Let's crop 6 squares.
icon_width = width // num_icons

for i in range(num_icons):
    left = i * icon_width
    right = (i + 1) * icon_width
    # Crop to a square roughly in the middle vertically
    # the image consists of the square icons + text below it.
    # To be safe, let's just crop the top square part.
    top = 0
    bottom = min(icon_width, height) # assuming roughly square icons
    
    icon_img = img.crop((left, 0, right, height))
    icon_img.save(os.path.join(output_dir, f"{icon_names[i]}_full.png"))
    
print("Saved 6 sliced images to", output_dir)
