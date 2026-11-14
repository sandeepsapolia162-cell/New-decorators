import os
import re
from PIL import Image, ImageOps, ImageFilter, ImageStat

# --- CONFIGURATION ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_DIR = os.path.join(SCRIPT_DIR, "raw_photos")
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "images")
HTML_FILE = os.path.join(SCRIPT_DIR, "portfolio.html")

# Walkway is added here!
CATEGORIES = ["front-gate", "walkway", "ceiling", "indoor"]
MAX_SIZE = (1600, 1600) 
QUALITY = 90
BLUR_THRESHOLD = 100.0

def setup_folders():
    for category in CATEGORIES:
        os.makedirs(os.path.join(INPUT_DIR, category), exist_ok=True)
        os.makedirs(os.path.join(OUTPUT_DIR, category), exist_ok=True)

def analyze_quality(img):
    gray = img.convert("L")
    laplacian = ImageFilter.Kernel((3, 3), [0, 1, 0, 1, -4, 1, 0, 1, 0], 1)
    edges = gray.filter(laplacian)
    stat = ImageStat.Stat(edges)
    return stat.var[0]

def process_and_inject():
    print("=" * 50)
    print("TARGET HTML FILE BEING EDITED:")
    print(HTML_FILE)
    print("=" * 50 + "\n")

    if not os.path.exists(HTML_FILE):
        print(f"❌ FATAL ERROR: Cannot find file at: {HTML_FILE}")
        return

    good_photos_html = ""
    bad_photos_html = ""
    total_processed = 0

    for category in CATEGORIES:
        in_path = os.path.join(INPUT_DIR, category)
        out_path = os.path.join(OUTPUT_DIR, category)
        
        if not os.path.exists(in_path):
            continue
            
        for filename in sorted(os.listdir(in_path)):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.heic', '.bmp', '.webp')):
                img_path = os.path.join(in_path, filename)
                
                try:
                    with Image.open(img_path) as img:
                        # 1. NEW FIX: Read hidden camera orientation data and fix rotation!
                        img = ImageOps.exif_transpose(img)
                        
                        if img.mode in ("RGBA", "P"): 
                            img = img.convert("RGB")
                            
                        sharpness = analyze_quality(img)
                        is_good = sharpness >= BLUR_THRESHOLD
                        status = "✅ SHARP" if is_good else "⚠️ BLURRY/MESSY"
                        print(f"[{status}] (Score: {int(sharpness)}) {filename}")

                        # 2. Shrink file size but KEEP original aspect ratio (No Cropping)
                        img.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
                        
                        new_filename = os.path.splitext(filename)[0] + ".webp"
                        save_path = os.path.join(out_path, new_filename)
                        img.save(save_path, "webp", quality=QUALITY)
                        
                        category_label = category.replace('-', ' ').title()
                        html_block = f"""            <div class="portfolio-item" data-category="{category}">
                <img src="images/{category}/{new_filename}" alt="{category_label} Decoration" loading="lazy">
                <div class="portfolio-overlay"><span class="portfolio-category">{category_label}</span></div>
            </div>\n"""
                        
                        if is_good:
                            good_photos_html += html_block
                        else:
                            bad_photos_html += html_block
                            
                        total_processed += 1
                except Exception as e:
                    print(f"❌ Error processing {filename}: {e}")

    final_images_html = good_photos_html + bad_photos_html

    # Read the portfolio.html file
    content = None
    used_encoding = "utf-8"
    for enc in ["utf-8", "utf-8-sig", "latin-1"]:
        try:
            with open(HTML_FILE, 'r', encoding=enc) as f:
                content = f.read()
            used_encoding = enc
            break
        except UnicodeDecodeError:
            continue

    if content is None:
        print("❌ ERROR: Could not read portfolio.html.")
        return

    pattern = r'(<div\s+class=["\']portfolio-grid["\'][^>]*>)([\s\S]*?)(<\/div>)'
    
    if re.search(pattern, content):
        replacement = r'\1\n' + final_images_html + r'        \3'
        new_content = re.sub(pattern, replacement, content, count=1)
        
        with open(HTML_FILE, 'w', encoding=used_encoding) as f:
            f.write(new_content)
            
        print(f"\n🎉 SUCCESS! Processed {total_processed} uncropped photos.")
    else:
        print("\n❌ CRITICAL: Could not locate <div class=\"portfolio-grid\"> inside your portfolio.html file.")

if __name__ == "__main__":
    setup_folders()
    process_and_inject()