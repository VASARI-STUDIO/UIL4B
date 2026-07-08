// Curated location suggestions for the Settings → Location autocomplete.
// Real, well-known cities ("City, Country") plus broad standalone-country
// coverage so anyone can pick their country even if their city isn't listed.
// Rendered into a native <datalist>; the field stays free-text, so this is a
// helper, not a hard constraint. Keep entries real (honesty principle).

const CITIES = [
  // North America
  'New York, United States', 'Los Angeles, United States', 'San Francisco, United States',
  'Seattle, United States', 'Austin, United States', 'Chicago, United States',
  'Boston, United States', 'Denver, United States', 'Miami, United States',
  'Portland, United States', 'Toronto, Canada', 'Vancouver, Canada', 'Montreal, Canada',
  'Mexico City, Mexico',
  // South America
  'São Paulo, Brazil', 'Rio de Janeiro, Brazil', 'Buenos Aires, Argentina',
  'Santiago, Chile', 'Bogotá, Colombia', 'Lima, Peru', 'Montevideo, Uruguay',
  // Europe
  'London, United Kingdom', 'Manchester, United Kingdom', 'Edinburgh, United Kingdom',
  'Dublin, Ireland', 'Paris, France', 'Berlin, Germany', 'Munich, Germany',
  'Hamburg, Germany', 'Amsterdam, Netherlands', 'Rotterdam, Netherlands',
  'Brussels, Belgium', 'Madrid, Spain', 'Barcelona, Spain', 'Lisbon, Portugal',
  'Porto, Portugal', 'Rome, Italy', 'Milan, Italy', 'Zurich, Switzerland',
  'Geneva, Switzerland', 'Vienna, Austria', 'Copenhagen, Denmark', 'Stockholm, Sweden',
  'Oslo, Norway', 'Helsinki, Finland', 'Warsaw, Poland', 'Kraków, Poland',
  'Prague, Czechia', 'Budapest, Hungary', 'Athens, Greece', 'Istanbul, Türkiye',
  'Reykjavík, Iceland',
  // Middle East & Africa
  'Dubai, United Arab Emirates', 'Abu Dhabi, United Arab Emirates', 'Tel Aviv, Israel',
  'Riyadh, Saudi Arabia', 'Cairo, Egypt', 'Cape Town, South Africa',
  'Johannesburg, South Africa', 'Nairobi, Kenya', 'Lagos, Nigeria', 'Accra, Ghana',
  'Casablanca, Morocco',
  // Asia
  'Tokyo, Japan', 'Osaka, Japan', 'Kyoto, Japan', 'Seoul, South Korea',
  'Beijing, China', 'Shanghai, China', 'Shenzhen, China', 'Hong Kong',
  'Taipei, Taiwan', 'Singapore', 'Bangkok, Thailand', 'Jakarta, Indonesia',
  'Kuala Lumpur, Malaysia', 'Manila, Philippines', 'Ho Chi Minh City, Vietnam',
  'Hanoi, Vietnam', 'Mumbai, India', 'Delhi, India', 'Bengaluru, India',
  'Hyderabad, India', 'Chennai, India', 'Pune, India', 'Karachi, Pakistan',
  'Lahore, Pakistan', 'Dhaka, Bangladesh', 'Colombo, Sri Lanka',
  // Oceania
  'Sydney, Australia', 'Melbourne, Australia', 'Brisbane, Australia',
  'Perth, Australia', 'Adelaide, Australia', 'Auckland, New Zealand',
  'Wellington, New Zealand', 'Christchurch, New Zealand',
]

const COUNTRIES = [
  'Argentina', 'Australia', 'Austria', 'Bangladesh', 'Belgium', 'Brazil', 'Bulgaria',
  'Canada', 'Chile', 'China', 'Colombia', 'Croatia', 'Czechia', 'Denmark', 'Egypt',
  'Estonia', 'Finland', 'France', 'Germany', 'Ghana', 'Greece', 'Hong Kong', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Ireland', 'Israel', 'Italy', 'Japan', 'Kenya',
  'Latvia', 'Lithuania', 'Luxembourg', 'Malaysia', 'Mexico', 'Morocco', 'Netherlands',
  'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Romania', 'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia',
  'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Taiwan',
  'Thailand', 'Türkiye', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
  'United States', 'Uruguay', 'Vietnam',
]

export const LOCATIONS = [...CITIES, ...COUNTRIES]

export default LOCATIONS
