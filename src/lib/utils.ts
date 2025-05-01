import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncates an address for display
 */
export function shortenAddress(address: string, startChars = 4, endChars = 4): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format a date to a human-readable string
 */
export function formatDate(date: Date | string | number): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Validates if a string is a valid 6-digit passcode
 */
export function isValidPasscode(passcode: string): boolean {
  return /^\d{6}$/.test(passcode);
}

/**
 * Copies text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy:", error);
    return false;
  }
}

/**
 * Generates a random username for new users
 * Format: [adjective][noun][number]
 */
export function generateRandomUsername(): string {
  const adjectives = [
    "swift", "vivid", "azure", "lunar", "cosmic", "neon", "rapid", "solar", 
    "brave", "amber", "emerald", "golden", "silver", "bright", "wild", "cool", 
    "crypto", "digital", "electric", "fancy", "happy", "instant", "jolly", "kind",
    "lucky", "magic", "noble", "orange", "purple", "quick", "royal", "sunny"
  ];
  
  const nouns = [
    "wallet", "panda", "tiger", "eagle", "falcon", "dolphin", "phoenix", "atlas",
    "orbit", "comet", "rocket", "pulse", "nova", "spark", "wave", "zenith",
    "pixel", "quasar", "ranger", "star", "token", "vision", "whale", "zephyr",
    "bear", "cat", "dog", "fox", "gecko", "hawk", "jaguar", "kangaroo", "lion"
  ];
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 1000); // 0-999
  
  return `${randomAdjective}${randomNoun}${randomNumber}`;
}
