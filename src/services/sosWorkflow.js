import { findNearestHeroes, buildSosPayload } from './matching.js';

export function prepareEmergencyAlert({ user, availableHeroes, radiusKm = 5, limit = 5 }) {
  const rankedHeroes = findNearestHeroes({
    suffererLocation: user.location,
    allHeroes: availableHeroes,
    radiusKm,
    limit,
  });

  const sos = buildSosPayload(user);
  sos.candidateHeroIds = rankedHeroes.map((hero) => hero.id);
  sos.notifiedHeroIds = rankedHeroes.map((hero) => hero.id);

  return {
    sos,
    rankedHeroes,
    fcmPayloads: rankedHeroes.map((hero) => ({
      token: hero.fcmToken,
      notification: {
        title: 'Emergency nearby',
        body: `Medical distress reported near ${user.location.label}`,
      },
      data: {
        sosUserId: user.id,
        lat: String(user.location.lat),
        lng: String(user.location.lng),
        locationLabel: user.location.label,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'emergency-alerts',
          sound: 'alarm.wav',
        },
      },
    })),
  };
}

export function buildHeroTrackingUpdate({ heroId, location }) {
  return {
    heroId,
    lat: location.lat,
    lng: location.lng,
    label: location.label,
    updatedAt: new Date().toISOString(),
  };
}
