#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

def create_gradient(width, height, color1, color2, vertical=True):
    """Create a gradient image"""
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    for i in range(height if vertical else width):
        ratio = i / (height if vertical else width)
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        
        if vertical:
            draw.line([(0, i), (width, i)], fill=(r, g, b))
        else:
            draw.line([(i, 0), (i, height)], fill=(r, g, b))
    
    return img

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_beautiful_app_icon():
    """Create a stunning 512x512 app icon for BookBridge"""
    size = 512
    
    # Create base with gradient background
    dark_slate = hex_to_rgb("#0f172a")
    dark_blue = hex_to_rgb("#1e293b")
    bg = create_gradient(size, size, dark_slate, dark_blue, vertical=True)
    
    # Create main drawing surface
    draw = ImageDraw.Draw(bg)
    
    # Colors
    accent_blue = "#3b82f6"
    gold = "#fbbf24"
    white = "#ffffff"
    light_blue = "#93c5fd"
    
    # Create glowing effect by drawing multiple circles with decreasing opacity
    center_x, center_y = size // 2, size // 2
    
    # Outer glow
    for radius in range(220, 150, -10):
        alpha = max(5, 30 - (220 - radius) // 10)
        overlay = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.ellipse(
            [(center_x - radius, center_y - radius), 
             (center_x + radius, center_y + radius)],
            fill=(59, 130, 246, alpha)
        )
        bg = Image.alpha_composite(bg.convert('RGBA'), overlay).convert('RGB')
    
    draw = ImageDraw.Draw(bg)
    
    # Main book design - more sophisticated
    book_width = 180
    book_height = 220
    book_x = center_x - book_width // 2
    book_y = center_y - book_height // 2 - 10
    
    # Book shadow
    shadow_offset = 8
    draw.rectangle(
        [(book_x + shadow_offset, book_y + shadow_offset), 
         (book_x + book_width + shadow_offset, book_y + book_height + shadow_offset)],
        fill="#000000"
    )
    
    # Main book body with gradient effect
    draw.rectangle(
        [(book_x, book_y), (book_x + book_width, book_y + book_height)],
        fill=accent_blue,
        outline=white,
        width=3
    )
    
    # Book spine with depth
    spine_width = 25
    draw.rectangle(
        [(book_x, book_y), (book_x + spine_width, book_y + book_height)],
        fill="#2563eb"
    )
    
    # Spine highlight
    draw.rectangle(
        [(book_x + 3, book_y + 3), (book_x + spine_width - 3, book_y + book_height - 3)],
        fill="#3b82f6"
    )
    
    # Pages effect
    page_offset = 5
    for i in range(3):
        offset = i * 3
        draw.rectangle(
            [(book_x + book_width - offset, book_y + offset), 
             (book_x + book_width - offset + 2, book_y + book_height + offset)],
            fill="#f8fafc"
        )
    
    # Bridge element - elegant arc
    bridge_y = book_y + book_height + 40
    bridge_points = []
    
    # Create smooth bridge arc
    for i in range(101):
        x = book_x - 40 + i * (book_width + 80) / 100
        # Parabolic curve
        t = (i - 50) / 50
        y = bridge_y - 30 * (1 - t * t)
        bridge_points.append((x, y))
    
    # Draw bridge with gradient effect
    for i in range(len(bridge_points) - 1):
        x1, y1 = bridge_points[i]
        x2, y2 = bridge_points[i + 1]
        # Varying thickness for 3D effect
        thickness = int(8 + 4 * math.sin(i * math.pi / len(bridge_points)))
        draw.line([(x1, y1), (x2, y2)], fill=gold, width=thickness)
    
    # Add bridge supports
    support_positions = [0.25, 0.75]
    for pos in support_positions:
        x = book_x - 40 + pos * (book_width + 80)
        y = bridge_y - 30 * (1 - (pos - 0.5) * 2) ** 2
        draw.line([(x, y), (x, bridge_y + 30)], fill=gold, width=6)
        # Support base
        draw.ellipse([(x - 8, bridge_y + 25), (x + 8, bridge_y + 35)], fill=gold)
    
    # Add text on the book cover
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
        small_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18)
    except:
        font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    # "BookBridge" text on book
    text = "BookBridge"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_x = book_x + spine_width + (book_width - spine_width - text_width) // 2
    text_y = book_y + 60
    
    # Text shadow
    draw.text((text_x + 2, text_y + 2), text, fill="#000000", font=font)
    # Main text
    draw.text((text_x, text_y), text, fill=white, font=font)
    
    # Subtitle on book
    subtitle = "Learn • Listen • Explore"
    bbox = draw.textbbox((0, 0), subtitle, font=small_font)
    sub_width = bbox[2] - bbox[0]
    sub_x = book_x + spine_width + (book_width - spine_width - sub_width) // 2
    sub_y = text_y + 50
    
    draw.text((sub_x + 1, sub_y + 1), subtitle, fill="#000000", font=small_font)
    draw.text((sub_x, sub_y), subtitle, fill=light_blue, font=small_font)
    
    # Add decorative stars/sparkles
    sparkle_positions = [
        (100, 100), (400, 80), (150, 400), (450, 420), (80, 300)
    ]
    
    for x, y in sparkle_positions:
        # Four-pointed star
        points = [
            (x, y - 12), (x + 4, y - 4), (x + 12, y),
            (x + 4, y + 4), (x, y + 12), (x - 4, y + 4),
            (x - 12, y), (x - 4, y - 4)
        ]
        draw.polygon(points, fill=gold)
    
    # Add corner radius for modern look
    # Create mask for rounded corners
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([(0, 0), (size, size)], radius=80, fill=255)
    
    # Apply mask
    output = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    output.paste(bg, (0, 0))
    output.putalpha(mask)
    
    # Convert back to RGB with white background for PNG
    final_img = Image.new('RGB', (size, size), 'white')
    final_img.paste(output, (0, 0), output)
    
    # Save the beautiful icon
    final_img.save('beautiful_app_icon_512x512.png', 'PNG', quality=95)
    print("Created beautiful_app_icon_512x512.png")

if __name__ == "__main__":
    create_beautiful_app_icon()
    print(f"\nBeautiful app icon created successfully!")
    print(f"File saved as: beautiful_app_icon_512x512.png")