// The glossary. Topics follow the NASA Space Place glossary
// (https://spaceplace.nasa.gov/glossary/en/), but every definition here is
// written fresh for this game in short, kid-friendly words. NASA's text is not
// copied. "ours" marks Moon-base words that Space Place does not list.
//
// Each entry: { id, term, def, icon, source: "spaceplace" | "ours" }

export const SPACE_PLACE_URL = "https://spaceplace.nasa.gov/glossary/en/";

/** Space Place splits its glossary into four sections: A-F, G-M, N-R, S-Z. */
export function spacePlaceLink(term) {
  const letter = term[0].toUpperCase();
  const section = letter <= "F" ? "A" : letter <= "M" ? "G" : letter <= "R" ? "N" : "S";
  return `${SPACE_PLACE_URL}#${section}`;
}

const SP = "spaceplace";
const OURS = "ours";

export const GLOSSARY = [
  { id: "asteroid", term: "Asteroid", icon: "rock", source: SP, def: "A rocky lump left over from when the planets formed. Most circle the Sun between Mars and Jupiter." },
  { id: "atmosphere", term: "Atmosphere", icon: "cloud", source: SP, def: "The blanket of gas around a planet. Earth's lets us breathe. The Moon has almost none." },
  { id: "atom", term: "Atom", icon: "atom", source: SP, def: "The tiniest piece of any substance. Everything is built from atoms." },
  { id: "aurora-australis", term: "Aurora australis", icon: "wave", source: SP, def: "Glowing, dancing lights in the sky near the South Pole." },
  { id: "aurora-borealis", term: "Aurora borealis", icon: "wave", source: SP, def: "The northern lights: glowing sky colors near the North Pole. Solar storms make them brighter." },
  { id: "black-hole", term: "Black hole", icon: "galaxy", source: SP, def: "A place where gravity pulls so hard that not even light can get out." },
  { id: "comet", term: "Comet", icon: "rock", source: SP, def: "A ball of ice and dust. Near the Sun it grows a long glowing tail." },
  { id: "constellation", term: "Constellation", icon: "star", source: SP, def: "A group of stars that people imagine as a picture in the night sky." },
  { id: "corona", term: "Corona", icon: "sun", source: SP, def: "The Sun's super-hot outer layer. You can see it during a total eclipse." },
  { id: "cosmos", term: "Cosmos", icon: "galaxy", source: SP, def: "Another word for the whole universe and everything in it." },
  { id: "crater", term: "Crater", icon: "rock", source: SP, def: "A bowl-shaped hole made when a space rock crashes into the ground." },
  { id: "dwarf-planet", term: "Dwarf planet", icon: "planet", source: SP, def: "A small round world that circles the Sun but shares its path with other objects. Pluto is one." },
  { id: "el-nino", term: "El Niño", icon: "water", source: SP, def: "When Pacific Ocean water gets warmer than usual and changes weather around the world." },
  { id: "electromagnetic-spectrum", term: "Electromagnetic spectrum", icon: "wave", source: SP, def: "Every kind of light, from radio waves to gamma rays. Our eyes see only a thin slice." },
  { id: "equator", term: "Equator", icon: "earth", source: SP, def: "An imaginary line around the middle of a planet, halfway between its poles." },
  { id: "exoplanet", term: "Exoplanet", icon: "planet", source: SP, def: "A planet that circles a star other than our Sun." },
  { id: "galaxy", term: "Galaxy", icon: "galaxy", source: SP, def: "A huge family of stars, gas and dust held together by gravity. We live in the Milky Way." },
  { id: "gamma-rays", term: "Gamma rays", icon: "wave", source: SP, def: "The most powerful kind of light. We cannot see it." },
  { id: "gas", term: "Gas", icon: "cloud", source: SP, def: "Stuff that spreads out to fill any space, like the air around you." },
  { id: "gps", term: "GPS", icon: "orbit", source: SP, def: "Satellites that help phones and cars work out exactly where they are." },
  { id: "gravity", term: "Gravity", icon: "orbit", source: SP, def: "The pull that keeps your feet on the ground. On the Moon it is six times weaker." },
  { id: "greenhouse-gas", term: "Greenhouse gas", icon: "cloud", source: SP, def: "A gas, like carbon dioxide, that traps heat around a planet." },
  { id: "infrared", term: "Infrared", icon: "wave", source: SP, def: "Light we cannot see but can feel as warmth." },
  { id: "kuiper-belt", term: "Kuiper Belt", icon: "orbit", source: SP, def: "A ring of icy little worlds beyond Neptune. Pluto lives there." },
  { id: "la-nina", term: "La Niña", icon: "water", source: SP, def: "When Pacific Ocean water gets cooler than usual and changes weather around the world." },
  { id: "light-year", term: "Light year", icon: "star", source: SP, def: "How far light travels in one year: about 9.5 trillion kilometers." },
  { id: "magnetic-field", term: "Magnetic field", icon: "magnet", source: SP, def: "An invisible push and pull around a magnet. Earth's shields us from many solar particles." },
  { id: "mass", term: "Mass", icon: "atom", source: SP, def: "How much stuff something is made of." },
  { id: "matter", term: "Matter", icon: "atom", source: SP, def: "Anything that takes up space: solids, liquids and gases." },
  { id: "meteor", term: "Meteor", icon: "rock", source: SP, def: "The bright streak you see when a space rock burns up in the air." },
  { id: "meteorite", term: "Meteorite", icon: "rock", source: SP, def: "A space rock that survives the fall and lands on the ground." },
  { id: "meteoroid", term: "Meteoroid", icon: "rock", source: SP, def: "A small rock flying through space. Tiny ones hit the Moon all the time." },
  { id: "microwaves", term: "Microwaves", icon: "wave", source: SP, def: "Light waves a bit longer than infrared. They heat food and carry phone signals." },
  { id: "molecule", term: "Molecule", icon: "atom", source: SP, def: "Two or more atoms joined together. Water is a molecule." },
  { id: "moon", term: "Moon", icon: "moon", source: SP, def: "A natural world that circles a planet. Ours is about 384,000 km away." },
  { id: "nebula", term: "Nebula", icon: "galaxy", source: SP, def: "A giant cloud of gas and dust where new stars can be born." },
  { id: "neutron-star", term: "Neutron star", icon: "star", source: SP, def: "The tiny, super-heavy core left after a big star explodes." },
  { id: "oort-cloud", term: "Oort Cloud", icon: "orbit", source: SP, def: "A far-away bubble of icy objects around the whole solar system." },
  { id: "orbit", term: "Orbit", icon: "orbit", source: SP, def: "The curved path one thing takes around another, like the Moon around Earth." },
  { id: "ozone-layer", term: "Ozone layer", icon: "shield", source: SP, def: "A layer high in Earth's air that blocks most of the Sun's harmful ultraviolet light." },
  { id: "particle", term: "Particle", icon: "atom", source: SP, def: "A tiny speck of matter. The Sun can fling out very fast ones." },
  { id: "planet", term: "Planet", icon: "planet", source: SP, def: "A big round world that circles a star and has cleared its path." },
  { id: "pulsar", term: "Pulsar", icon: "star", source: SP, def: "A spinning neutron star that flashes beams like a lighthouse." },
  { id: "quasar", term: "Quasar", icon: "galaxy", source: SP, def: "The blazing center of a far-away galaxy, powered by a giant black hole." },
  { id: "radiation", term: "Radiation", icon: "dose", source: SP, def: "Energy that travels as waves or tiny particles. Too much can harm living things." },
  { id: "radio-waves", term: "Radio waves", icon: "dish", source: SP, def: "The longest light waves. They carry radio, TV and messages from spacecraft." },
  { id: "radioactive", term: "Radioactive", icon: "dose", source: SP, def: "Describes material that gives off radiation as its atoms break apart." },
  { id: "satellite", term: "Satellite", icon: "orbit", source: SP, def: "Anything that circles a planet. The Moon is a natural one; others are machines." },
  { id: "solar-flare", term: "Solar flare", icon: "sun", source: SP, def: "A sudden flash of energy on the Sun. Its radiation can reach the Moon in minutes." },
  { id: "solar-panel", term: "Solar panel", icon: "power", source: SP, def: "A flat panel that turns sunlight into electricity." },
  { id: "solar-system", term: "Solar system", icon: "sun", source: SP, def: "The Sun and everything that circles it: planets, moons, asteroids and comets." },
  { id: "solar-wind", term: "Solar wind", icon: "sun", source: SP, def: "A steady stream of tiny particles blowing out from the Sun." },
  { id: "space-weather", term: "Space weather", icon: "sun", source: SP, def: "Changes in space caused by the Sun, like flares and solar wind." },
  { id: "spacecraft", term: "Spacecraft", icon: "ship", source: SP, def: "A vehicle built to travel through space." },
  { id: "speed-of-light", term: "Speed of light", icon: "wave", source: SP, def: "The fastest speed there is: about 300,000 kilometers every second." },
  { id: "star", term: "Star", icon: "star", source: SP, def: "A giant ball of hot, glowing gas. The Sun is our closest star." },
  { id: "sun", term: "Sun", icon: "sun", source: SP, def: "The star at the center of our solar system. It gives us light and heat." },
  { id: "supermassive", term: "Supermassive", icon: "galaxy", source: SP, def: "Extremely heavy: millions of times heavier than the Sun. Used for giant black holes." },
  { id: "supernova", term: "Supernova", icon: "star", source: SP, def: "The huge explosion of a big star at the end of its life." },
  { id: "tectonics", term: "Tectonics", icon: "volcano", source: SP, def: "The slow sliding of the giant plates that make up Earth's outer shell." },
  { id: "ultraviolet", term: "Ultraviolet", icon: "sun", source: SP, def: "Light just past violet that we cannot see. It causes sunburn." },
  { id: "universe", term: "Universe", icon: "galaxy", source: SP, def: "Everything that exists: all of space, time, stars and galaxies." },
  { id: "vacuum", term: "Vacuum", icon: "crew", source: SP, def: "A space with almost nothing in it, not even air." },
  { id: "volcano", term: "Volcano", icon: "volcano", source: SP, def: "An opening in the ground where hot melted rock comes out." },
  { id: "visible-light", term: "Visible light", icon: "wave", source: SP, def: "The light our eyes can see: every color of the rainbow." },
  { id: "wave", term: "Wave", icon: "wave", source: SP, def: "A moving wiggle that carries energy, like ripples on a pond." },
  { id: "x-rays", term: "X-rays", icon: "wave", source: SP, def: "Strong invisible light that passes through skin but not bones." },

  // Moon-base words used in the game that Space Place does not list.
  { id: "battery", term: "Battery", icon: "battery", source: OURS, def: "Stores electricity so it can be used later, like at night." },
  { id: "cme", term: "CME", icon: "sun", source: OURS, def: "A giant cloud of gas the Sun throws into space. Short for coronal mass ejection." },
  { id: "donki", term: "DONKI", icon: "science", source: OURS, def: "NASA's online record of real space weather events. This game reads it." },
  { id: "dose", term: "Dose", icon: "dose", source: OURS, def: "How much radiation a body has soaked up. Measured in mSv." },
  { id: "far-side", term: "Far side", icon: "moon", source: OURS, def: "The half of the Moon that always faces away from Earth." },
  { id: "greenhouse", term: "Greenhouse", icon: "food", source: OURS, def: "A building where plants grow with light, water and warmth." },
  { id: "life-support", term: "Life support", icon: "air", source: OURS, def: "Machines that keep the air, water and warmth safe for the crew." },
  { id: "lunar-night", term: "Lunar night", icon: "moon", source: OURS, def: "Darkness at one spot on the Moon. It lasts about 14 Earth days." },
  { id: "msv", term: "mSv", icon: "dose", source: OURS, def: "Millisievert: the unit for radiation dose. A chest X-ray is about 0.1 mSv." },
  { id: "oxygen", term: "Oxygen", icon: "oxygen", source: OURS, def: "The gas in air that your body needs. It can be made by splitting water." },
  { id: "regolith", term: "Regolith", icon: "dust", source: OURS, def: "The loose gray dust and broken rock that covers the Moon." },
  { id: "relay-satellite", term: "Relay satellite", icon: "dish", source: OURS, def: "A satellite that passes messages between the Moon's far side and Earth." },
  { id: "rover", term: "Rover", icon: "rover", source: OURS, def: "A car built to drive on another world." },
  { id: "science", term: "Science", icon: "science", source: OURS, def: "Finding out how things work by watching, testing and measuring." },
  { id: "water-ice", term: "Water ice", icon: "water", source: OURS, def: "Frozen water. Some hides in dark, cold craters near the Moon's poles." },
].sort((a, b) => a.term.localeCompare(b.term, "en", { sensitivity: "base" }));

export function glossaryEntry(id) {
  return GLOSSARY.find((entry) => entry.id === id) ?? null;
}

/** Entries whose term contains `query` (any case). Terms that start with it come first. */
export function searchGlossary(query) {
  const q = query.trim().toLowerCase();
  if (!q) return GLOSSARY;
  const hits = GLOSSARY.filter((entry) => entry.term.toLowerCase().includes(q));
  return hits.sort((a, b) => Number(!a.term.toLowerCase().startsWith(q)) - Number(!b.term.toLowerCase().startsWith(q)));
}

/** Letters that have at least one term, for the A-Z strip. */
export function lettersInUse() {
  return new Set(GLOSSARY.map((entry) => entry.term[0].toUpperCase()));
}
