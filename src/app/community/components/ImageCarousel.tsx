'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  imageClassName?: string;
  showIndicators?: boolean;
  showArrows?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export default function ImageCarousel({
  images,
  alt,
  className = '',
  imageClassName = '',
  showIndicators = true,
  showArrows = true,
  autoPlay = false,
  autoPlayInterval = 5000,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(images.length > 1 ? 1 : 0); // Start at 1 for infinite loop
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Create infinite loop by duplicating first and last images
  // Structure: [lastImage, image1, image2, ..., imageN, firstImage]
  const infiniteImages = images.length > 1 
    ? [images[images.length - 1], ...images, images[0]]
    : images;

  // Handle infinite loop - jump to real image when reaching duplicates (seamless transition)
  useEffect(() => {
    if (images.length <= 1 || !trackRef.current) return;

    if (currentIndex === 0) {
      // At duplicate of last image (index 0), jump to real last image (index = images.length)
      // This happens after the transition completes
      const timeout = setTimeout(() => {
        if (trackRef.current) {
          trackRef.current.style.transition = 'none';
          setCurrentIndex(images.length);
          // Restore transition after jump
          requestAnimationFrame(() => {
            if (trackRef.current) {
              trackRef.current.style.transition = '';
            }
          });
        }
      }, 400); // Wait for transition to complete
      return () => clearTimeout(timeout);
    } else if (currentIndex === infiniteImages.length - 1) {
      // At duplicate of first image (last index), jump to real first image (index 1)
      const timeout = setTimeout(() => {
        if (trackRef.current) {
          trackRef.current.style.transition = 'none';
          setCurrentIndex(1);
          // Restore transition after jump
          requestAnimationFrame(() => {
            if (trackRef.current) {
              trackRef.current.style.transition = '';
            }
          });
        }
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, images.length, infiniteImages.length]);

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && images.length > 1) {
      autoPlayTimer.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          return next >= infiniteImages.length ? 0 : next;
        });
      }, autoPlayInterval);

      return () => {
        if (autoPlayTimer.current) {
          clearInterval(autoPlayTimer.current);
        }
      };
    }
  }, [autoPlay, autoPlayInterval, images.length, infiniteImages.length]);

  // Pause auto-play on hover
  const handleMouseEnter = () => {
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current);
    }
  };

  const handleMouseLeave = () => {
    if (autoPlay && images.length > 1) {
      autoPlayTimer.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, autoPlayInterval);
    }
  };

  const goToNext = () => {
    if (isTransitioning || images.length <= 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
    setTimeout(() => setIsTransitioning(false), 400);
  };

  const goToPrevious = () => {
    if (isTransitioning || images.length <= 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
    setTimeout(() => setIsTransitioning(false), 400);
  };

  const goToIndex = (index: number) => {
    if (isTransitioning || images.length <= 1) return;
    // Map real index to infinite loop index (add 1 because first is duplicate)
    const infiniteIndex = index + 1;
    if (infiniteIndex === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(infiniteIndex);
    setTimeout(() => setIsTransitioning(false), 400);
  };

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    // Pause auto-play on touch
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      goToNext();
    } else if (distance < -minSwipeDistance) {
      goToPrevious();
    }

    touchStartX.current = null;
    touchEndX.current = null;

    // Resume auto-play if enabled
    if (autoPlay && images.length > 1) {
      autoPlayTimer.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          return next >= infiniteImages.length ? 0 : next;
        });
      }, autoPlayInterval);
    }
  };

  // Keyboard navigation (disabled for now to avoid conflicts with page navigation)
  // Uncomment if you want keyboard navigation when carousel is focused
  /*
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    const carouselElement = document.querySelector('.community-image-carousel');
    if (carouselElement) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [images.length]);
  */

  if (images.length === 0) return null;

  // Single image - no carousel needed
  if (images.length === 1) {
    return (
      <div className={`community-image-carousel ${className}`} style={{ width: '100%', height: '100%' }}>
        <div className="community-image-carousel-container" style={{ width: '100%', height: '100%' }}>
          <Image
            src={images[0]}
            alt={alt}
            width={600}
            height={400}
            className={`community-image-carousel-image ${imageClassName}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            unoptimized
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`community-image-carousel ${className}`}
      style={className?.includes('compact') ? { width: '100%', height: '100%' } : {}}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="community-image-carousel-container"
        style={className?.includes('compact') ? { width: '100%', height: '100%', aspectRatio: '1' } : {}}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Images with smooth transition - infinite loop */}
        <div
          ref={trackRef}
          className="community-image-carousel-track"
          style={{
            width: `${infiniteImages.length * 100}%`,
            transform: `translateX(-${currentIndex * (100 / infiniteImages.length)}%)`,
            transition: isTransitioning ? 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
        >
          {infiniteImages.map((image, index) => {
            // Calculate real image index for alt text
            const realIndex = images.length > 1 
              ? index === 0 
                ? images.length 
                : index === infiniteImages.length - 1 
                  ? 1 
                  : index
              : 0;
            
            return (
              <div
                key={`${image}-${index}`}
                className="community-image-carousel-slide"
                style={{
                  width: `${100 / infiniteImages.length}%`,
                  flexShrink: 0,
                  flexGrow: 0,
                }}
              >
                <Image
                  src={image}
                  alt={`${alt} - Image ${realIndex}`}
                  width={600}
                  height={400}
                  className={`community-image-carousel-image ${imageClassName}`}
                  style={imageClassName?.includes('compact') ? { width: '100%', height: '100%', objectFit: 'cover' } : {}}
                  unoptimized
                  priority={index === 1} // Priority on first real image
                />
              </div>
            );
          })}
        </div>

        {/* Navigation Arrows */}
        {showArrows && (
          <>
            <button
              className="community-image-carousel-arrow community-image-carousel-arrow-left"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              aria-label="Previous image"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              className="community-image-carousel-arrow community-image-carousel-arrow-right"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              aria-label="Next image"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="community-image-carousel-counter">
          {images.length > 1 
            ? `${((currentIndex - 1 + images.length) % images.length) + 1} / ${images.length}`
            : `1 / 1`
          }
        </div>
      </div>

      {/* Indicators/Dots */}
      {showIndicators && images.length > 1 && (
        <div className="community-image-carousel-indicators">
          {images.map((_, index) => {
            // Calculate real current index for indicator highlighting
            const realCurrentIndex = images.length > 1 
              ? ((currentIndex - 1 + images.length) % images.length)
              : 0;
            
            return (
              <button
                key={index}
                className={`community-image-carousel-indicator ${
                  index === realCurrentIndex ? 'active' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  goToIndex(index);
                }}
                aria-label={`Go to image ${index + 1}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
