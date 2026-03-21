import { heroes, sufferer } from '../data/mockRangpur.js';
import { haversineDistanceKm } from '../utils/haversine.js';

export function findNearestHeroes({ suffererLocation, allHeroes, radiusKm = 5, limit = 5 }) {
  return allHeroes
    .filter((hero) => hero.isAvailable)
    .map((hero) => ({
      ...hero,
      distanceKm: haversineDistanceKm(suffererLocation, hero.currentLocation),
    }))
    .filter((hero) => hero.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export function buildSosPayload(user) {
  return {
    userId: user.id,
    status: 'searching',
    emergencyType: 'medical',
    suffererLocation: user.location,
    candidateHeroIds: [],
    notifiedHeroIds: [],
    acceptedHeroId: null,
  };
}

function runDemo() {
  const nearestHeroes = findNearestHeroes({
    suffererLocation: sufferer.location,
    allHeroes: heroes,
    radiusKm: 5,
    limit: 5,
  });

  const sos = buildSosPayload(sufferer);
  sos.candidateHeroIds = nearestHeroes.map((hero) => hero.id);
  sos.notifiedHeroIds = nearestHeroes.map((hero) => hero.id);

  console.log('SOS payload:', JSON.stringify(sos, null, 2));
  console.log('\nNearest heroes ranked by distance:\n');

  nearestHeroes.forEach((hero, index) => {
    console.log(
      `${index + 1}. ${hero.fullName} (${hero.currentLocation.label}) - ${hero.distanceKm.toFixed(2)} km`
    );
  });
}

const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1]);
if (isDirectRun) {
  runDemo();
}
