"use client";

import React, { useState } from "react";
import Image from "next/image";

/**
 * SafeImage component that handles invalid/missing images with fallback
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text for the image
 * @param {string} fallback - Fallback image path (default: "/pubg.png")
 * @param {object} rest - Other props to pass to Image component
 */
function SafeImage({ src, alt, fallback = "/pubg.png", ...rest }) {
	const [imgSrc, setImgSrc] = useState(() => {
		// Check if src is valid on initial render
		if (!src || 
			typeof src !== 'string' || 
			src.trim() === '' || 
			src.includes('example.com') ||
			src === 'null' ||
			src === 'undefined') {
			return fallback;
		}
		return src;
	});
	const [hasError, setHasError] = useState(false);

	const handleError = () => {
		if (!hasError && imgSrc !== fallback) {
			setHasError(true);
			setImgSrc(fallback);
		}
	};

	// Check if it's an external image
	const isExternalImage = imgSrc && imgSrc.startsWith('http');
	const isConfiguredDomain = imgSrc && imgSrc.includes('thryl-image-store.s3.ap-south-1.amazonaws.com');
	const isLocalImage = imgSrc && !imgSrc.startsWith('http');

	// Use regular img tag for external images not in next.config
	// This avoids Next.js Image domain configuration issues and handles errors gracefully
	if (isExternalImage && !isConfiguredDomain) {
		return (
			<img
				src={imgSrc}
				alt={alt}
				onError={handleError}
				{...rest}
			/>
		);
	}

	// Use Next.js Image for local images or configured domains
	if (isLocalImage || isConfiguredDomain) {
		return (
			<Image
				src={imgSrc}
				alt={alt}
				{...rest}
			/>
		);
	}

	// Fallback to regular img for any other case
	return (
		<img
			src={imgSrc}
			alt={alt}
			onError={handleError}
			{...rest}
		/>
	);
}

export default SafeImage;

