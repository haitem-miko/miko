// Utility functions

// Example: Debounce function if needed later
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Example: Throttle function if needed later
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Simple function to scroll chat log smoothly (basic)
export function scrollToBottom(element) {
    if(element) {
        element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
    }
}

// Simple helper for sanitizing text input (basic example)
export function sanitizeInput(text) {
    const tempDiv = document.createElement('div');
    tempDiv.textContent = text;
    return tempDiv.innerHTML; // Converts characters like < > &
}

// Function to detect URLs and create clickable links
export function linkifyText(text) {
    // More robust URL regex (handles various protocols, domains, paths, query params)
    const urlRegex = /(\b(?:https?|ftp):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;
    const fragments = [];
    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
        const url = match[0];
        const index = match.index;

        // Add text before the URL
        if (index > lastIndex) {
            fragments.push(document.createTextNode(text.substring(lastIndex, index)));
        }

        // Create and add the link
        const link = document.createElement('a');
        link.href = url;
        link.textContent = url; // Display the URL as the link text
        link.target = '_blank'; // Open in new tab
        link.rel = 'noopener noreferrer'; // Security best practice
        fragments.push(link);

        lastIndex = index + url.length;
    }

    // Add any remaining text after the last URL
    if (lastIndex < text.length) {
        fragments.push(document.createTextNode(text.substring(lastIndex)));
    }

    // Handle cases where no URLs are found
    if (fragments.length === 0) {
        fragments.push(document.createTextNode(text));
    }

    return fragments; // Return an array of Text nodes and Anchor elements
}