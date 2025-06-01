interface MemoryConfig {
  memoryMB: number;
  pricePerMs: number;
}

const MEMORY_CONFIGS: MemoryConfig[] = [
  { memoryMB: 128, pricePerMs: 0.0000000021 },
  { memoryMB: 512, pricePerMs: 0.0000000083 },
  { memoryMB: 1024, pricePerMs: 0.0000000167 },
  { memoryMB: 1536, pricePerMs: 0.000000025 },
  { memoryMB: 2048, pricePerMs: 0.0000000333 },
  { memoryMB: 3072, pricePerMs: 0.00000005 },
  { memoryMB: 4096, pricePerMs: 0.0000000667 },
  { memoryMB: 5120, pricePerMs: 0.0000000833 },
  { memoryMB: 6144, pricePerMs: 0.0000001 },
  { memoryMB: 7168, pricePerMs: 0.0000001167 },
  { memoryMB: 8192, pricePerMs: 0.0000001333 },
  { memoryMB: 9216, pricePerMs: 0.00000015 },
  { memoryMB: 10240, pricePerMs: 0.0000001667 },
];

/**
 * Calculates the cost of a Lambda function execution based on memory configuration and duration
 * @param memoryMB - The memory configuration in MB
 * @param durationMs - The execution duration in milliseconds
 * @param markupPercentage - Optional markup percentage to add to the base cost (e.g., 20 for 20% markup)
 * @returns The cost in USD
 */
export function calculateLambdaCost(
  memoryMB: number,
  durationMs: number,
  markupPercentage?: number
): number {
  const config = MEMORY_CONFIGS.find((c) => c.memoryMB === memoryMB);

  if (!config) {
    throw new Error(`Invalid memory configuration: ${memoryMB}MB`);
  }

  const baseCost = config.pricePerMs * durationMs;

  if (markupPercentage === undefined) {
    return baseCost;
  }

  if (markupPercentage < 0) {
    throw new Error("Markup percentage cannot be negative");
  }

  return baseCost * (1 + markupPercentage / 100);
}

/**
 * Gets the available memory configurations
 * @returns Array of available memory configurations in MB
 */
export function getAvailableMemoryConfigs(): number[] {
  return MEMORY_CONFIGS.map((config) => config.memoryMB);
}
