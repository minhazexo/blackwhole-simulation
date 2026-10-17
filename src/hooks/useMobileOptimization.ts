/**
 * useMobileOptimization Hook
 *
 * Manages mobile-specific performance optimizations including:
 * - Automatic balanced preset application
 * - Ray step capping at 80 (canonical PERFORMANCE_CONFIG.compute.maxStepsMobile)
 * - Bloom disabled by default
 *
 * Requirements: 16.1, 16.3, 16.4
 */

import { useMemo } from "react";
import { isMobileDevice } from "@/utils/device-detection";
import { DEFAULT_FEATURES, getMobilePreset } from "@/config/feature-flags";
import { PERFORMANCE_CONFIG } from "@/config/performance.config";
import type { FeatureToggles } from "@/types/features";

interface MobileOptimizationConfig {
  isMobile: boolean;
  getMobileFeatures: () => FeatureToggles;
  applyMobileRayStepCap: (requestedSteps: number) => number;
}

/**
 * Hook for managing mobile-specific optimizations
 *
 * @returns Mobile optimization configuration and utilities
 */
export const useMobileOptimization = (): MobileOptimizationConfig => {
  // Detect if device is mobile (memoized to avoid repeated checks)
  const isMobile = useMemo(() => isMobileDevice(), []);

  /**
   * Get mobile-optimized feature configuration
   *
   * Requirements:
   * - 16.1: Apply "Balanced" preset on mobile
   * - 16.4: Disable bloom by default on mobile
   *
   * Delegates to the canonical getMobilePreset (single source of truth).
   *
   * @returns Feature toggles optimized for mobile
   */
  const getMobileFeatures = (): FeatureToggles => {
    if (!isMobile) {
      return { ...DEFAULT_FEATURES };
    }
    return getMobilePreset();
  };

  /**
   * Apply mobile ray step cap
   *
   * Requirements: 16.3 - Cap at 80 steps on mobile (canonical maxStepsMobile)
   *
   * @param requestedSteps - The requested number of ray steps
   * @returns Capped ray steps for mobile devices
   */
  const applyMobileRayStepCap = (requestedSteps: number): number => {
    return isMobile
      ? Math.min(requestedSteps, PERFORMANCE_CONFIG.compute.maxStepsMobile)
      : requestedSteps;
  };

  // Log mobile detection on mount (for debugging)
  // useEffect(() => {
  //   if (isMobile) {
  //     console.log("Mobile device detected - applying mobile optimizations");
  //   }
  // }, [isMobile]);

  return {
    isMobile,
    getMobileFeatures,
    applyMobileRayStepCap,
  };
};
