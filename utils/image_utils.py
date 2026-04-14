"""
Image Utilities
Handles image processing, thumbnail generation, and file management.
"""

import os
import logging
import uuid
from datetime import datetime
from typing import Tuple, Optional
from pathlib import Path

from PIL import Image

# Configure logging
logger = logging.getLogger(__name__)

# Thumbnail configuration
THUMBNAIL_SIZE = (800, 800)  # Max width/height
THUMBNAIL_QUALITY = 85
THUMBNAIL_FORMAT = "JPEG"


def ensure_directory(path: str) -> None:
    """
    Ensure a directory exists, creating it if necessary.
    
    Args:
        path: The directory path to create
    """
    Path(path).mkdir(parents=True, exist_ok=True)


def generate_photo_filename(
    order_number: str,
    photo_type: str,
    photo_number: int,
    extension: str = "jpg"
) -> str:
    """
    Generate a unique photo filename.
    
    Args:
        order_number: The order number
        photo_type: "before" or "after"
        photo_number: Photo sequence number (1-10)
        extension: File extension
        
    Returns:
        The generated filename
    """
    return f"{order_number}_{photo_type}_{photo_number}.{extension}"


def get_photo_directory(base_path: str, order_number: str) -> str:
    """
    Get the photo directory path for an order.
    
    Args:
        base_path: Base photo storage path
        order_number: The order number
        
    Returns:
        The full directory path
    """
    # Use current date for organization
    date_path = datetime.now().strftime("%Y-%m-%d")
    return os.path.join(base_path, date_path, order_number)


def process_and_save_thumbnail(
    image_path: str,
    output_path: str,
    max_size: Tuple[int, int] = THUMBNAIL_SIZE
) -> bool:
    """
    Process an image and save it as a thumbnail.
    
    Args:
        image_path: Path to the source image
        output_path: Path to save the thumbnail
        max_size: Maximum dimensions (width, height)
        
    Returns:
        True if successful, False otherwise
    """
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary (for PNG with transparency)
            if img.mode in ("RGBA", "LA", "P"):
                rgb_img = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                rgb_img.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
                img = rgb_img
            
            # Resize maintaining aspect ratio
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Ensure output directory exists
            ensure_directory(os.path.dirname(output_path))
            
            # Save as JPEG
            img.save(output_path, format=THUMBNAIL_FORMAT, quality=THUMBNAIL_QUALITY)
            
            logger.info(f"Thumbnail saved: {output_path}")
            return True
            
    except Exception as e:
        logger.error(f"Error processing image {image_path}: {e}")
        return False


def validate_image(image_path: str) -> Tuple[bool, Optional[str]]:
    """
    Validate an image file.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        with Image.open(image_path) as img:
            # Check format
            if img.format not in ["JPEG", "PNG", "JPG", "WEBP", "GIF", "MPO"]:
                return False, f"Unsupported image format: {img.format}"
            
            # Check dimensions
            if img.width < 100 or img.height < 100:
                return False, "Image too small (minimum 100x100)"
            
            if img.width > 10000 or img.height > 10000:
                return False, "Image too large (maximum 10000x10000)"
            
            return True, None
            
    except Exception as e:
        return False, f"Invalid image file: {e}"


def get_image_info(image_path: str) -> Optional[dict]:
    """
    Get image information.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Dictionary with image info or None if error
    """
    try:
        with Image.open(image_path) as img:
            return {
                "width": img.width,
                "height": img.height,
                "format": img.format,
                "mode": img.mode,
                "size_bytes": os.path.getsize(image_path)
            }
    except Exception as e:
        logger.error(f"Error getting image info for {image_path}: {e}")
        return None


def delete_photo_file(file_path: str) -> bool:
    """
    Delete a photo file.
    
    Args:
        file_path: Path to the file to delete
        
    Returns:
        True if successful, False otherwise
    """
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Photo file deleted: {file_path}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error deleting file {file_path}: {e}")
        return False


def generate_unique_id() -> str:
    """
    Generate a unique ID for file naming.
    
    Returns:
        A unique string ID
    """
    return str(uuid.uuid4())[:8]
