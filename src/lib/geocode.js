const UK_POSTCODE_RE = /^[a-z]{1,2}\d{1,2}[a-z]?\s*\d[a-z]{2}$/i

export async function geocodePostcode(postcode) {
  const clean = postcode.replace(/\s+/g, '').toUpperCase()
  const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`)
  if (!res.ok) return null
  const { result } = await res.json()
  if (!result) return null
  return { latitude: result.latitude, longitude: result.longitude }
}

export async function geocodeAddress(input) {
  if (UK_POSTCODE_RE.test(input.trim())) {
    return geocodePostcode(input.trim())
  }
  // Fallback to Nominatim for non-postcode inputs
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&limit=1&countrycodes=gb`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  const data = await res.json()
  if (!data.length) return null
  return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }
}

export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

export function parseSearchQuery(query) {
  const q = query.trim()

  const distancePatterns = [
    /within\s+(\d+(?:\.\d+)?)\s*miles?/i,
    /(\d+(?:\.\d+)?)\s*miles?\s*(?:of|from|away)?/i,
    /(\d+(?:\.\d+)?)\s*mi\b/i,
    /within\s+(\d+(?:\.\d+)?)\s*km/i,
    /(\d+(?:\.\d+)?)\s*km\b/i,
  ]

  let maxMiles = null
  let cleanQuery = q

  for (const pattern of distancePatterns) {
    const match = q.match(pattern)
    if (match) {
      const value = parseFloat(match[1])
      const isKm = pattern.source.includes('km')
      maxMiles = isKm ? value * 0.621371 : value
      cleanQuery = q.replace(new RegExp(pattern.source, 'i'), '').trim()
      break
    }
  }

  const nearMePattern = /\b(near\s*me|close\s*to\s*me|nearby|around\s*me)\b/i
  const hasNearMe = nearMePattern.test(q)
  if (hasNearMe) {
    cleanQuery = cleanQuery.replace(nearMePattern, '').trim()
    if (maxMiles === null) maxMiles = 5
  }

  return {
    textQuery: cleanQuery.replace(/\s+/g, ' ').trim(),
    maxMiles,
    needsLocation: maxMiles !== null || hasNearMe,
  }
}
