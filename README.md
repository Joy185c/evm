# Rangpur Emergency Help App Starter

A zero-cost starter architecture for a **real-time emergency response app** focused on Rangpur, Bangladesh, especially high-traffic areas such as **Jahaj Company More** and **Station Road**.

## Stack

- **Mobile frontend:** React Native with Expo
- **Auth + realtime backend:** Firebase Auth + Firestore
- **Push notifications:** Firebase Cloud Messaging (FCM)
- **Maps:** OpenStreetMap tiles rendered with Leaflet inside a WebView or via a web dashboard

## Core Firestore schema

### `users/{userId}`
Stores people who may trigger an SOS.

```json
{
  "role": "sufferer",
  "fullName": "Amina Begum",
  "phoneNumber": "+8801XXXXXXXXX",
  "lastKnownLocation": {
    "lat": 25.7494,
    "lng": 89.2446,
    "label": "Royalty Mega Mall, Rangpur",
    "updatedAt": "serverTimestamp()"
  },
  "activeSosId": null,
  "createdAt": "serverTimestamp()",
  "updatedAt": "serverTimestamp()"
}
```

### `heroes/{heroId}`
Stores volunteers, doctors, and ambulances that can respond.

```json
{
  "role": "hero",
  "heroType": "volunteer",
  "fullName": "Rahim Uddin",
  "phoneNumber": "+8801XXXXXXXXX",
  "isAvailable": true,
  "fcmToken": "device-token",
  "coverageRadiusKm": 5,
  "currentLocation": {
    "lat": 25.7431,
    "lng": 89.2509,
    "label": "Station Road, Rangpur",
    "updatedAt": "serverTimestamp()"
  },
  "lastAcceptedSosId": null,
  "createdAt": "serverTimestamp()",
  "updatedAt": "serverTimestamp()"
}
```

### `sos_requests/{sosId}`
Tracks active emergency requests.

```json
{
  "userId": "user_royalty_mega_mall",
  "status": "searching",
  "emergencyType": "medical",
  "createdAt": "serverTimestamp()",
  "suffererLocation": {
    "lat": 25.7494,
    "lng": 89.2446,
    "label": "Royalty Mega Mall, Rangpur"
  },
  "candidateHeroIds": ["hero_station_road", "hero_collectorate_field", "hero_modern_mor"],
  "notifiedHeroIds": ["hero_station_road", "hero_collectorate_field", "hero_modern_mor"],
  "acceptedHeroId": null,
  "acceptedAt": null
}
```

### `sos_requests/{sosId}/tracking/{eventId}`
Optional append-only stream for audit and live updates.

```json
{
  "heroId": "hero_station_road",
  "lat": 25.7442,
  "lng": 89.2488,
  "heading": 135,
  "speed": 9.2,
  "recordedAt": "serverTimestamp()"
}
```

## Recommended indexes and query strategy

Firestore does not support true geospatial radius queries natively without extra indexing libraries. For a **zero-cost starter**, use this two-step approach:

1. Query heroes where `isAvailable == true`.
2. Optionally narrow further by `heroType in ["volunteer", "doctor", "ambulance"]`.
3. Run the Haversine formula client-side or in a Cloud Function to keep only heroes within **5 km**.
4. Sort by distance and notify the nearest **5 heroes**.

For production scale, consider geohashes with a free helper library, but the sample code below intentionally keeps the logic simple and transparent.

## Real-time flow

1. The sufferer taps **SOS**.
2. The app reads the device GPS and creates a new `sos_requests` document.
3. The backend fetches available heroes and calculates distance with Haversine.
4. The nearest five heroes receive an FCM push with a loud emergency sound.
5. The first hero to accept updates `acceptedHeroId` and changes the SOS `status` to `accepted`.
6. The sufferer subscribes to the accepted hero document and the SOS tracking subcollection for live movement.
7. The hero app pushes location updates every **60 seconds** while active.

## Bangladesh/Rangpur demo test context

The sample data included in `src/data/mockRangpur.js` assumes:

- **Sufferer:** Royalty Mega Mall, Rangpur
- **Heroes:** Station Road, Collectorate Field, and Modern Mor

When you run the matching demo, the app sorts these candidates by real distance from the sufferer.

## Security rule ideas

- Only authenticated users can read/write their own `users/{userId}` profile.
- Only authenticated heroes can update their own `heroes/{heroId}` location.
- Only the assigned hero and the SOS owner can read a private SOS request.
- Only backend code should write `notifiedHeroIds` or broadcast FCM tokens.

## Next build steps

1. Add Firebase project credentials in `src/config/firebase.js`.
2. Replace mock login with Firebase phone authentication.
3. Move SOS matching and FCM sending into a Firebase Cloud Function.
4. Add background location with Expo Task Manager or Flutter background services.
5. Add a Leaflet map screen in a WebView for live tracking.
