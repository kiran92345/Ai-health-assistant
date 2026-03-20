from PIL import Image, ImageDraw
import os

"""
Crop the _full.png language icons into perfectly circular coins.
The _full images have the coin at top and text label at bottom - we want just the coin.
"""

out_dir = r"C:\Users\admin\OneDrive\Desktop\ai health\assets\langs"

icons = {
    "en": r"C:\Users\admin\OneDrive\Desktop\ai health\assets\langs\en_full.png",
    "hi": r"C:\Users\admin\OneDrive\Desktop\ai health\assets\langs\hi_full.png",
    "te": r"C:\Users\admin\OneDrive\Desktop\ai health\assets\langs\te_full.png",
    "ta": r"C:\Users\admin\OneDrive\Desktop\ai health\assets\langs\ta_full.png",
    "kn": r"C:\Users\admin\OneDrive\Desktop\ai health\assets\langs\kn_full.png",
    "ml": r"C:\Users\admin\OneDrive\Desktop\ai health\assets\langs\ml_full.png",
}

SIZE = 200

for name, src_path in icons.items():
    img = Image.open(src_path).convert("RGBA")
    W, H = img.size
    print(f"{name}: {W}x{H}")
    
    # The coin takes up roughly the top 75% of the image (bottom 25% is text label area)
    # Crop to a square centered on the top 75%
    crop_h = int(H * 0.75)
    side = min(W, crop_h)
    
    cx = W // 2
    cy = side // 2
    
    x0 = cx - side // 2
    y0 = 0
    x1 = cx + side // 2
    y1 = side
    
    # Add a small top padding to avoid cutting the top of the coin
    pad = int(side * 0.02)
    y0 = max(0, y0 + pad)
    y1 = min(H, y1 + pad)
    x_side = x1 - x0
    y_side = y1 - y0
    s = min(x_side, y_side)
    
    # Recenter
    crop_box = (
        cx - s // 2,
        cy - s // 2,
        cx + s // 2,
        cy + s // 2
    )
    
    cropped = img.crop(crop_box).resize((SIZE, SIZE), Image.LANCZOS)
    
    # Apply circular mask
    mask = Image.new("L", (SIZE, SIZE), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, SIZE - 1, SIZE - 1), fill=255)
    
    result = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    result.paste(cropped, (0, 0), mask)
    
    out_path = os.path.join(out_dir, f"{name}.png")
    result.save(out_path, "PNG")
    print(f"  -> Saved to {out_path}")

print("ALL DONE!")
