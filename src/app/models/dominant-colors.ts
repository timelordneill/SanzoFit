import { deltaE2000, Lab, Rgb, rgbToLab } from './color-match';

/** A dominant color found in a photo. */
export interface DominantColor {
  /** Cluster center in Lab, used for matching against the palette. */
  lab: Lab;
  /** Average sRGB of the cluster's pixels, used to show the photo's own color. */
  rgb: Rgb;
  /** Fraction (0–1) of the non-background pixels this color covers. */
  share: number;
}

export interface Cluster {
  centroid: Lab;
  /** Indices of the points assigned to this cluster. */
  members: number[];
}

export interface KMeansOptions {
  /** Seed for the k-means++ initialisation, so results are repeatable. */
  seed?: number;
  maxIterations?: number;
}

export interface DominantColorOptions {
  /** Number of clusters to start from (before background removal and merging). */
  k?: number;
  /** Maximum number of colors returned. */
  maxColors?: number;
  /** Colors covering less than this fraction of the garment are dropped as noise. */
  minShare?: number;
  /** Clusters closer than this (ΔE₀₀) to the background color are removed. */
  backgroundDeltaE?: number;
  /** Clusters closer than this (ΔE₀₀) to each other are merged (e.g. shade + highlight). */
  mergeDeltaE?: number;
  seed?: number;
}

/** Small, fast, seedable PRNG (mulberry32), so clustering is deterministic. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function squaredDistance(p: Lab, q: Lab): number {
  return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
}

function nearest(point: Lab, centroids: readonly Lab[]): number {
  let best = 0;
  let bestDistance = Infinity;
  centroids.forEach((centroid, i) => {
    const distance = squaredDistance(point, centroid);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  });
  return best;
}

/**
 * k-means clustering of Lab points with k-means++ initialisation.
 * Deterministic for a given seed. Empty clusters are left out of the result, and
 * fewer than k clusters are returned when there are fewer distinct points.
 */
export function kMeans(points: readonly Lab[], k: number, options: KMeansOptions = {}): Cluster[] {
  const { seed = 1, maxIterations = 20 } = options;
  if (points.length === 0 || k <= 0) {
    return [];
  }
  const random = seededRandom(seed);

  // k-means++: spread the initial centers out, weighted by squared distance.
  const centroids: Lab[] = [points[Math.floor(random() * points.length)]];
  while (centroids.length < k) {
    const weights = points.map((p) => squaredDistance(p, centroids[nearest(p, centroids)]));
    const total = weights.reduce((sum, w) => sum + w, 0);
    if (total === 0) {
      break; // every remaining point coincides with a center
    }
    let target = random() * total;
    let index = 0;
    while (target >= weights[index] && index < points.length - 1) {
      target -= weights[index];
      index++;
    }
    centroids.push(points[index]);
  }

  let assignment: number[] = [];
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    assignment = points.map((p) => nearest(p, centroids));

    let moved = 0;
    for (let c = 0; c < centroids.length; c++) {
      let l = 0;
      let a = 0;
      let b = 0;
      let count = 0;
      assignment.forEach((cluster, i) => {
        if (cluster === c) {
          l += points[i][0];
          a += points[i][1];
          b += points[i][2];
          count++;
        }
      });
      if (count > 0) {
        const updated: Lab = [l / count, a / count, b / count];
        moved = Math.max(moved, squaredDistance(updated, centroids[c]));
        centroids[c] = updated;
      }
    }
    if (moved < 1e-4) {
      break;
    }
  }
  assignment = points.map((p) => nearest(p, centroids));

  return centroids
    .map((centroid, c) => ({
      centroid,
      members: assignment.flatMap((cluster, i) => (cluster === c ? [i] : [])),
    }))
    .filter((cluster) => cluster.members.length > 0);
}

/**
 * The background color, estimated from the pixels along the photo's edges: their
 * median color, if most of the border (≥ 60%) is close to it, i.e. a plain background.
 * Returns null when the border is too mixed to tell (e.g. the garment fills the frame).
 */
export function estimateBackground(border: readonly Rgb[], maxDeltaE = 12): Lab | null {
  if (border.length === 0) {
    return null;
  }
  const labs = border.map(rgbToLab);
  const median = (d: 0 | 1 | 2) => {
    const values = labs.map((lab) => lab[d]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  };
  const center: Lab = [median(0), median(1), median(2)];

  const near = labs.filter((lab) => deltaE2000(lab, center) < maxDeltaE);
  if (near.length / labs.length < 0.6) {
    return null;
  }
  const mean = (d: 0 | 1 | 2) => near.reduce((sum, lab) => sum + lab[d], 0) / near.length;
  return [mean(0), mean(1), mean(2)];
}

interface Group {
  lab: Lab;
  rgbSum: [number, number, number];
  count: number;
}

/**
 * Finds the main colors of a garment photo:
 * 1. cluster the pixels in Lab space (k-means),
 * 2. drop clusters that look like the background (estimated from `border`),
 * 3. merge clusters that are near-identical colors (shade/highlight of one fabric),
 * 4. drop specks below `minShare`, and keep the largest `maxColors`.
 */
export function findDominantColors(
  pixels: readonly Rgb[],
  border: readonly Rgb[] = [],
  options: DominantColorOptions = {},
): DominantColor[] {
  const {
    k = 6,
    maxColors = 5,
    minShare = 0.05,
    backgroundDeltaE = 12,
    mergeDeltaE = 8,
    seed = 1,
  } = options;

  const labs = pixels.map(rgbToLab);
  const background = estimateBackground(border, backgroundDeltaE);

  let groups: Group[] = kMeans(labs, k, { seed })
    .map((cluster) => {
      const rgbSum: [number, number, number] = [0, 0, 0];
      for (const i of cluster.members) {
        rgbSum[0] += pixels[i][0];
        rgbSum[1] += pixels[i][1];
        rgbSum[2] += pixels[i][2];
      }
      return { lab: cluster.centroid, rgbSum, count: cluster.members.length };
    })
    .filter((group) => !background || deltaE2000(group.lab, background) >= backgroundDeltaE);

  // Merge the closest pair while it is closer than mergeDeltaE.
  for (;;) {
    let pair: [number, number] | null = null;
    let closest = mergeDeltaE;
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const distance = deltaE2000(groups[i].lab, groups[j].lab);
        if (distance < closest) {
          closest = distance;
          pair = [i, j];
        }
      }
    }
    if (!pair) {
      break;
    }
    const [a, b] = [groups[pair[0]], groups[pair[1]]];
    const count = a.count + b.count;
    const weighted = (d: 0 | 1 | 2) => (a.lab[d] * a.count + b.lab[d] * b.count) / count;
    const merged: Group = {
      lab: [weighted(0), weighted(1), weighted(2)],
      rgbSum: [a.rgbSum[0] + b.rgbSum[0], a.rgbSum[1] + b.rgbSum[1], a.rgbSum[2] + b.rgbSum[2]],
      count,
    };
    groups = groups.filter((_, index) => index !== pair[0] && index !== pair[1]).concat(merged);
  }

  const total = groups.reduce((sum, group) => sum + group.count, 0);
  if (total === 0) {
    return [];
  }

  return groups
    .map((group): DominantColor => {
      const [r, g, b] = group.rgbSum.map((sum) => Math.round(sum / group.count));
      return { lab: group.lab, rgb: [r, g, b], share: group.count / total };
    })
    .filter((color) => color.share >= minShare)
    .sort((a, b) => b.share - a.share)
    .slice(0, maxColors);
}
