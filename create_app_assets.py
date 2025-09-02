#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

# Colors
DARK_SLATE = "#0f172a"
WHITE = "#ffffff"
ACCENT_BLUE = "#3b82f6"
LIGHT_GRAY = "#e2e8f0"

def create_app_icon():
    """Create a 512x512 app icon for BookBridge"""
    # Create image with dark slate background
    img = Image.new('RGB', (512, 512), DARK_SLATE)
    draw = ImageDraw.Draw(img)
    
    # Draw book shape (simplified)
    book_width = 200
    book_height = 260
    book_x = (512 - book_width) // 2
    book_y = (512 - book_height) // 2 - 20
    
    # Book cover
    draw.rectangle(
        [(book_x, book_y), (book_x + book_width, book_y + book_height)],
        fill=ACCENT_BLUE,
        outline=WHITE,
        width=4
    )
    
    # Book spine
    spine_width = 20
    draw.rectangle(
        [(book_x, book_y), (book_x + spine_width, book_y + book_height)],
        fill="#2563eb"
    )
    
    # Bridge element (arc)
    arc_y = book_y + book_height - 40
    draw.arc(
        [(book_x - 30, arc_y - 60), (book_x + book_width + 30, arc_y + 60)],
        start=200,
        end=340,
        fill=WHITE,
        width=8
    )
    
    # Text "BB" on book
    try:
        # Try to use a system font
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 120)
    except:
        font = ImageFont.load_default()
    
    text = "BB"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    text_x = book_x + (book_width - text_width) // 2
    text_y = book_y + (book_height - text_height) // 2 - 20
    
    draw.text((text_x, text_y), text, fill=WHITE, font=font)
    
    # Save the icon
    img.save('app_icon_512x512.png', 'PNG', quality=95)
    print("Created app_icon_512x512.png")

def create_feature_graphic():
    """Create a 1024x500 feature graphic for Google Play Store"""
    # Create image with dark slate background
    img = Image.new('RGB', (1024, 500), DARK_SLATE)
    draw = ImageDraw.Draw(img)
    
    # Draw decorative book elements on the left
    book_colors = [ACCENT_BLUE, "#8b5cf6", "#10b981", "#f59e0b"]
    for i, color in enumerate(book_colors):
        x = 50 + i * 40
        y = 150 + i * 10
        draw.rectangle(
            [(x, y), (x + 30, y + 200)],
            fill=color,
            outline=WHITE,
            width=2
        )
    
    # Main text
    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 80)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
    
    # BookBridge title
    title = "BookBridge"
    draw.text((350, 150), title, fill=WHITE, font=title_font)
    
    # Tagline
    tagline = "Classic Literature Made Accessible"
    draw.text((350, 250), tagline, fill=LIGHT_GRAY, font=subtitle_font)
    
    # Feature icons and text
    features = [
        "AI-Powered Text Simplification",
        "Professional Audio Narration",
        "Interactive Learning Tools"
    ]
    
    feature_y = 320
    for feature in features:
        # Bullet point
        draw.ellipse([(350, feature_y), (360, feature_y + 10)], fill=ACCENT_BLUE)
        # Feature text
        draw.text((380, feature_y - 5), feature, fill=LIGHT_GRAY, font=ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24))
        feature_y += 40
    
    # Draw bridge element on the right
    bridge_x = 800
    bridge_y = 250
    draw.arc(
        [(bridge_x, bridge_y - 100), (bridge_x + 150, bridge_y + 100)],
        start=200,
        end=340,
        fill=ACCENT_BLUE,
        width=6
    )
    
    # Save the feature graphic
    img.save('feature_graphic_1024x500.png', 'PNG', quality=95)
    print("Created feature_graphic_1024x500.png")

if __name__ == "__main__":
    create_app_icon()
    create_feature_graphic()
    print("\nBoth assets have been created successfully!")
    print(f"Files saved in: {os.getcwd()}")