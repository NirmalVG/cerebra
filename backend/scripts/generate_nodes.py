# backend/scripts/generate_nodes.py
"""
Generates app/data/seed_2000.json — the full knowledge graph.

Usage:
    cd backend
    python -m scripts.generate_nodes

Takes ~30 minutes (rate-limited to 1 req/sec per Wikipedia policy).
Safe to re-run — overwrites the output file.
"""

import asyncio
import json
import os
import re
import unicodedata
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv

# ─────────────────────────────────────────────
# ENV + CONFIG
# ─────────────────────────────────────────────
load_dotenv(Path(__file__).parent.parent / ".env")

_email  = os.environ.get("WIKI_CONTACT_EMAIL", "contact@example.com")
_github = os.environ.get("WIKI_GITHUB_URL",    "https://github.com/cerebra")
USER_AGENT = f"NeuralCosmos/1.0 ({_github}; {_email})"

OUTPUT_PATH  = Path(__file__).parent.parent / "app" / "data" / "seed_2000.json"
WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary"
WIKI_ACTION  = "https://en.wikipedia.org/w/api.php"

REQUEST_DELAY = 1.0
MAX_RETRIES   = 3


# ─────────────────────────────────────────────
# SLUGIFY
# Handles unicode by transliterating to ASCII.
#   "Gödel's incompleteness theorems" → "godels-incompleteness-theorems"
#   "Flow (psychology)"               → "flow-psychology"
# ─────────────────────────────────────────────
def slugify(title: str) -> str:
    s = unicodedata.normalize("NFKD", title)
    s = s.encode("ascii", "ignore").decode("ascii")
    s = s.lower()
    s = re.sub(r"[''`\"]+", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


# ─────────────────────────────────────────────
# SEED TOPICS — ASCII titles only (no ö, é etc.)
# Wikipedia REST API accepts these fine.
# ─────────────────────────────────────────────
SEED_TOPICS = [
    # PHYSICS
    ("Quantum entanglement",               "physics",    0.95, ["quantum", "nonlocality", "EPR"]),
    ("General relativity",                 "physics",    0.97, ["einstein", "spacetime", "gravity"]),
    ("Special relativity",                 "physics",    0.93, ["einstein", "light", "time-dilation"]),
    ("Quantum mechanics",                  "physics",    0.98, ["wave-function", "superposition", "uncertainty"]),
    ("Standard Model",                     "physics",    0.90, ["particles", "quarks", "bosons"]),
    ("Higgs boson",                        "physics",    0.85, ["mass", "LHC", "particle"]),
    ("Schrodinger equation",               "physics",    0.88, ["wave-function", "quantum", "differential"]),
    ("Thermodynamics",                     "physics",    0.89, ["entropy", "energy", "heat"]),
    ("Electromagnetism",                   "physics",    0.92, ["maxwell", "waves", "fields"]),
    ("Heisenberg uncertainty principle",   "physics",    0.87, ["quantum", "measurement", "wave"]),
    ("String theory",                      "physics",    0.83, ["dimensions", "M-theory", "unification"]),
    ("Dark energy",                        "physics",    0.86, ["cosmology", "expansion", "vacuum"]),
    ("Antimatter",                         "physics",    0.82, ["particle", "annihilation", "symmetry"]),
    ("Nuclear fusion",                     "physics",    0.84, ["energy", "plasma", "sun"]),
    ("Superconductivity",                  "physics",    0.80, ["zero-resistance", "BCS", "quantum"]),

    # BIOLOGY
    ("Natural selection",                  "biology",    0.97, ["evolution", "darwin", "fitness"]),
    ("DNA",                                "biology",    0.99, ["genetics", "helix", "gene"]),
    ("CRISPR",                             "biology",    0.88, ["gene-editing", "cas9", "genomics"]),
    ("Cell biology",                       "biology",    0.95, ["membrane", "nucleus", "organelle"]),
    ("Protein",                            "biology",    0.93, ["amino-acid", "folding", "enzyme"]),
    ("Photosynthesis",                     "biology",    0.89, ["chlorophyll", "sunlight", "glucose"]),
    ("Nervous system",                     "biology",    0.91, ["neuron", "synapse", "brain"]),
    ("Mitochondria",                       "biology",    0.86, ["ATP", "energy", "cell"]),
    ("Immune system",                      "biology",    0.88, ["antibody", "T-cell", "pathogen"]),
    ("Stem cell",                          "biology",    0.84, ["differentiation", "regeneration", "embryo"]),
    ("Epigenetics",                        "biology",    0.82, ["methylation", "gene-expression", "environment"]),
    ("Microbiome",                         "biology",    0.81, ["gut", "bacteria", "health"]),
    ("Consciousness",                      "biology",    0.92, ["brain", "qualia", "awareness"]),
    ("Neurotransmitter",                   "biology",    0.85, ["dopamine", "serotonin", "synapse"]),
    ("Virus",                              "biology",    0.87, ["pathogen", "RNA", "infection"]),

    # MATH
    ("Godel's incompleteness theorems",    "math",       0.93, ["logic", "provability", "formal-systems"]),
    ("Euler's identity",                   "math",       0.88, ["e", "pi", "beautiful"]),
    ("Prime number",                       "math",       0.87, ["number-theory", "infinity", "Riemann"]),
    ("Calculus",                           "math",       0.96, ["derivative", "integral", "Newton"]),
    ("Topology",                           "math",       0.83, ["manifold", "continuity", "shape"]),
    ("Fourier transform",                  "math",       0.85, ["frequency", "signal", "analysis"]),
    ("Game theory",                        "math",       0.84, ["nash", "strategy", "equilibrium"]),
    ("P versus NP problem",                "math",       0.86, ["complexity", "algorithms", "millennium"]),
    ("Chaos theory",                       "math",       0.87, ["butterfly-effect", "nonlinear", "lorenz"]),
    ("Linear algebra",                     "math",       0.88, ["matrix", "vector", "eigenvalue"]),
    ("Bayesian probability",               "math",       0.86, ["inference", "prior", "posterior"]),
    ("Graph theory",                       "math",       0.83, ["network", "nodes", "edges"]),
    ("Riemann hypothesis",                 "math",       0.85, ["primes", "zeta-function", "millennium"]),
    ("Information theory",                 "math",       0.87, ["entropy", "shannon", "compression"]),
    ("Category theory",                    "math",       0.79, ["morphism", "functor", "abstraction"]),

    # HISTORY
    ("Bronze Age collapse",                "history",    0.85, ["civilizations", "sea-peoples", "1200BC"]),
    ("Renaissance",                        "history",    0.90, ["humanism", "art", "europe"]),
    ("Industrial Revolution",              "history",    0.93, ["manufacturing", "steam", "capitalism"]),
    ("World War II",                       "history",    0.95, ["holocaust", "allied", "atomic"]),
    ("French Revolution",                  "history",    0.89, ["liberty", "guillotine", "napoleon"]),
    ("Roman Empire",                       "history",    0.92, ["caesar", "senate", "expansion"]),
    ("Mongol Empire",                      "history",    0.86, ["genghis", "conquest", "silk-road"]),
    ("Age of Enlightenment",               "history",    0.88, ["reason", "voltaire", "democracy"]),
    ("Cold War",                           "history",    0.90, ["nuclear", "USSR", "capitalism"]),
    ("Silk Road",                          "history",    0.84, ["trade", "china", "culture"]),
    ("Black Death",                        "history",    0.86, ["plague", "pandemic", "medieval"]),
    ("American Revolution",                "history",    0.87, ["independence", "democracy", "constitution"]),
    ("Ancient Egypt",                      "history",    0.88, ["pharaoh", "hieroglyphs", "pyramid"]),
    ("Greek philosophy",                   "history",    0.89, ["socrates", "plato", "aristotle"]),
    ("Colonialism",                        "history",    0.87, ["empire", "exploitation", "resistance"]),

    # PHILOSOPHY
    ("Free will",                          "philosophy", 0.88, ["determinism", "agency", "choice"]),
    ("Ethics",                             "philosophy", 0.91, ["morality", "kantian", "utilitarian"]),
    ("Existentialism",                     "philosophy", 0.87, ["sartre", "camus", "meaning"]),
    ("Epistemology",                       "philosophy", 0.84, ["knowledge", "justified-belief", "gettier"]),
    ("Stoicism",                           "philosophy", 0.85, ["marcus-aurelius", "virtue", "equanimity"]),
    ("Nihilism",                           "philosophy", 0.82, ["nietzsche", "meaninglessness", "god-is-dead"]),
    ("Phenomenology",                      "philosophy", 0.80, ["husserl", "experience", "intentionality"]),
    ("Philosophy of mind",                 "philosophy", 0.86, ["functionalism", "physicalism", "dualism"]),
    ("Utilitarianism",                     "philosophy", 0.84, ["bentham", "mill", "greatest-good"]),
    ("Metaphysics",                        "philosophy", 0.82, ["reality", "being", "substance"]),
    ("Solipsism",                          "philosophy", 0.78, ["mind", "reality", "other-minds"]),
    ("Determinism",                        "philosophy", 0.83, ["causality", "free-will", "physics"]),
    ("Absurdism",                          "philosophy", 0.80, ["camus", "meaning", "rebellion"]),
    ("Philosophy of language",             "philosophy", 0.79, ["wittgenstein", "meaning", "speech-acts"]),
    ("Logic",                              "philosophy", 0.88, ["reasoning", "deduction", "formal"]),

    # ARTS
    ("Impressionism",                      "arts",       0.85, ["monet", "light", "france"]),
    ("Surrealism",                         "arts",       0.84, ["dali", "unconscious", "dream"]),
    ("Jazz",                               "arts",       0.87, ["improvisation", "blues", "armstrong"]),
    ("Cinema",                             "arts",       0.90, ["film", "narrative", "auteur"]),
    ("Shakespeare",                        "arts",       0.92, ["tragedy", "sonnet", "elizabethan"]),
    ("Modernism",                          "arts",       0.86, ["avant-garde", "abstraction", "joyce"]),
    ("Classical music",                    "arts",       0.87, ["beethoven", "mozart", "symphony"]),
    ("Abstract expressionism",             "arts",       0.82, ["pollock", "rothko", "gesture"]),
    ("Architecture",                       "arts",       0.86, ["structure", "form", "space"]),
    ("Mythology",                          "arts",       0.88, ["gods", "heroes", "narrative"]),
    ("Photography",                        "arts",       0.83, ["light", "lens", "documentary"]),
    ("Ancient Greek theatre",              "arts",       0.82, ["tragedy", "comedy", "catharsis"]),
    ("Romanticism",                        "arts",       0.84, ["emotion", "nature", "sublime"]),
    ("Cubism",                             "arts",       0.81, ["picasso", "fragmentation", "perspective"]),
    ("Hip hop",                            "arts",       0.85, ["rhythm", "sampling", "culture"]),

    # TECHNOLOGY
    ("Artificial intelligence",            "technology", 0.98, ["machine-learning", "neural-nets", "AGI"]),
    ("Internet",                           "technology", 0.97, ["ARPANET", "TCP-IP", "web"]),
    ("Blockchain",                         "technology", 0.83, ["cryptocurrency", "distributed", "ledger"]),
    ("Printing press",                     "technology", 0.91, ["gutenberg", "books", "information"]),
    ("Transistor",                         "technology", 0.89, ["semiconductor", "computing", "electronics"]),
    ("Nuclear weapon",                     "technology", 0.90, ["fission", "manhattan", "deterrence"]),
    ("Space exploration",                  "technology", 0.88, ["NASA", "rocket", "moon"]),
    ("Robotics",                           "technology", 0.85, ["automation", "sensor", "actuator"]),
    ("Cryptography",                       "technology", 0.86, ["encryption", "RSA", "security"]),
    ("Deep learning",                      "technology", 0.92, ["neural-network", "backpropagation", "GPU"]),
    ("Quantum computing",                  "technology", 0.88, ["qubit", "superposition", "shor"]),
    ("Nanotechnology",                     "technology", 0.83, ["atomic", "molecular", "feynman"]),
    ("Biotechnology",                      "technology", 0.85, ["genetic-engineering", "pharma", "synthetic"]),
    ("Renewable energy",                   "technology", 0.86, ["solar", "wind", "sustainability"]),
    ("Virtual reality",                    "technology", 0.82, ["immersion", "headset", "simulation"]),

    # COSMOS
    ("Big Bang",                           "cosmos",     0.98, ["cosmology", "origin", "expansion"]),
    ("Black hole",                         "cosmos",     0.95, ["singularity", "hawking", "event-horizon"]),
    ("Dark matter",                        "cosmos",     0.90, ["invisible-mass", "galaxy", "WIMPs"]),
    ("Milky Way",                          "cosmos",     0.89, ["galaxy", "spiral", "solar-system"]),
    ("Exoplanet",                          "cosmos",     0.85, ["habitable-zone", "transit", "kepler"]),
    ("Neutron star",                       "cosmos",     0.84, ["pulsar", "dense", "supernova"]),
    ("Multiverse",                         "cosmos",     0.86, ["parallel-worlds", "many-worlds", "inflation"]),
    ("Cosmic inflation",                   "cosmos",     0.85, ["rapid-expansion", "universe", "guth"]),
    ("Gravitational wave",                 "cosmos",     0.87, ["LIGO", "spacetime", "binary"]),
    ("Stellar evolution",                  "cosmos",     0.86, ["main-sequence", "supernova", "nebula"]),
    ("Solar System",                       "cosmos",     0.90, ["planets", "sun", "orbit"]),
    ("Fermi paradox",                      "cosmos",     0.84, ["extraterrestrial", "silence", "drake"]),
    ("Wormhole",                           "cosmos",     0.83, ["spacetime", "traversable", "einstein-rosen"]),
    ("Cosmic microwave background",        "cosmos",     0.86, ["CMB", "remnant", "planck"]),
    ("Entropy",                            "cosmos",     0.83, ["heat-death", "arrow-of-time", "disorder"]),

    # PSYCHOLOGY
    ("Maslow's hierarchy of needs",        "psychology", 0.83, ["motivation", "self-actualization", "humanistic"]),
    ("Classical conditioning",             "psychology", 0.85, ["pavlov", "reflex", "learning"]),
    ("Cognitive bias",                     "psychology", 0.87, ["heuristic", "decision", "kahneman"]),
    ("Unconscious mind",                   "psychology", 0.86, ["freud", "repression", "dream"]),
    ("Attachment theory",                  "psychology", 0.83, ["bowlby", "bond", "infant"]),
    ("Flow psychology",                    "psychology", 0.82, ["csikszentmihalyi", "optimal", "engagement"]),
    ("Psychological trauma",               "psychology", 0.85, ["PTSD", "stress", "memory"]),
    ("Cognitive dissonance",               "psychology", 0.84, ["belief", "conflict", "festinger"]),
    ("Mirror neuron",                      "psychology", 0.80, ["empathy", "imitation", "social"]),
    ("Memory",                             "psychology", 0.88, ["encoding", "retrieval", "hippocampus"]),
    ("Placebo effect",                     "psychology", 0.82, ["belief", "healing", "expectation"]),
    ("Social psychology",                  "psychology", 0.84, ["group", "influence", "conformity"]),
    ("Emotional intelligence",             "psychology", 0.81, ["empathy", "self-awareness", "regulation"]),
    ("Dream",                              "psychology", 0.83, ["REM", "freud", "unconscious"]),
    ("Meditation",                         "psychology", 0.82, ["mindfulness", "attention", "neuroscience"]),

    # ECONOMICS
    ("Supply and demand",                  "economics",  0.92, ["price", "market", "equilibrium"]),
    ("Capitalism",                         "economics",  0.91, ["profit", "market", "private"]),
    ("Keynesian economics",                "economics",  0.87, ["fiscal", "stimulus", "depression"]),
    ("Behavioral economics",               "economics",  0.88, ["nudge", "irrationality", "kahneman"]),
    ("Inflation",                          "economics",  0.89, ["price-level", "monetary", "CPI"]),
    ("Globalization",                      "economics",  0.88, ["trade", "multinational", "integration"]),
    ("Cryptocurrency",                     "economics",  0.84, ["bitcoin", "decentralized", "blockchain"]),
    ("Universal basic income",             "economics",  0.82, ["welfare", "automation", "redistribution"]),
    ("Economic inequality",                "economics",  0.86, ["wealth-gap", "gini", "redistribution"]),
    ("Climate change mitigation",          "economics",  0.85, ["carbon-tax", "externality", "sustainability"]),
    ("Monetary policy",                    "economics",  0.83, ["central-bank", "interest-rates", "QE"]),
    ("Labour economics",                   "economics",  0.82, ["wages", "employment", "unions"]),
    ("Network effect",                     "economics",  0.83, ["platform", "monopoly", "metcalfe"]),
    ("Creative destruction",               "economics",  0.84, ["schumpeter", "innovation", "disruption"]),
    ("Microeconomics",                     "economics",  0.85, ["price", "consumer", "firm"]),
]


# ─────────────────────────────────────────────
# MANUAL CROSS-DOMAIN EDGES
# IDs must match slugify() output exactly.
# Run: python -c "from scripts.generate_nodes import slugify; print(slugify('Your Title'))"
# to verify any ID you're unsure about.
# ─────────────────────────────────────────────
MANUAL_EDGES = [
    # Physics ↔ Cosmos
    ("general-relativity",             "black-hole",               "causes",      0.95),
    ("general-relativity",             "big-bang",                 "related-to",  0.88),
    ("general-relativity",             "gravitational-wave",       "causes",      0.92),
    ("quantum-mechanics",              "quantum-entanglement",     "part-of",     0.95),
    ("quantum-mechanics",              "quantum-computing",        "causes",      0.88),
    ("quantum-mechanics",              "string-theory",            "related-to",  0.75),
    ("thermodynamics",                 "entropy",                  "related-to",  0.85),
    ("dark-energy",                    "big-bang",                 "related-to",  0.80),
    ("dark-matter",                    "milky-way",                "part-of",     0.85),

    # Biology ↔ Technology
    ("dna",                            "crispr",                   "part-of",     0.90),
    ("dna",                            "biotechnology",            "related-to",  0.88),
    ("natural-selection",              "dna",                      "causes",      0.92),
    ("natural-selection",              "consciousness",            "causes",      0.78),
    ("consciousness",                  "artificial-intelligence",  "related-to",  0.82),
    ("nervous-system",                 "deep-learning",            "related-to",  0.75),
    ("neurotransmitter",               "meditation",               "related-to",  0.65),
    ("virus",                          "biotechnology",            "related-to",  0.70),
    ("epigenetics",                    "behavioral-economics",     "related-to",  0.55),

    # Physics ↔ Philosophy
    ("quantum-mechanics",              "free-will",                "related-to",  0.60),
    ("quantum-entanglement",           "consciousness",            "related-to",  0.55),
    ("determinism",                    "chaos-theory",             "related-to",  0.72),
    ("determinism",                    "free-will",                "causes",      0.85),

    # Math ↔ Technology
    ("calculus",                       "deep-learning",            "part-of",     0.85),
    ("linear-algebra",                 "deep-learning",            "part-of",     0.88),
    ("information-theory",             "cryptography",             "related-to",  0.80),
    ("information-theory",             "deep-learning",            "related-to",  0.78),
    ("bayesian-probability",           "artificial-intelligence",  "related-to",  0.82),
    ("graph-theory",                   "internet",                 "related-to",  0.75),
    ("game-theory",                    "artificial-intelligence",  "related-to",  0.72),
    ("p-versus-np-problem",            "cryptography",             "related-to",  0.78),

    # History ↔ Arts
    ("renaissance",                    "impressionism",            "preceded-by", 0.65),
    ("renaissance",                    "modernism",                "preceded-by", 0.60),
    ("printing-press",                 "renaissance",              "causes",      0.82),
    ("french-revolution",              "romanticism",              "causes",      0.70),
    ("industrial-revolution",          "modernism",                "causes",      0.65),
    ("ancient-egypt",                  "mythology",                "part-of",     0.75),
    ("greek-philosophy",               "ancient-greek-theatre",    "part-of",     0.78),
    ("age-of-enlightenment",           "classical-music",          "related-to",  0.60),

    # Philosophy ↔ Psychology
    ("consciousness",                  "philosophy-of-mind",       "part-of",     0.90),
    ("consciousness",                  "unconscious-mind",         "related-to",  0.72),
    ("free-will",                      "cognitive-bias",           "related-to",  0.65),
    ("existentialism",                 "psychological-trauma",     "related-to",  0.55),
    ("stoicism",                       "meditation",               "related-to",  0.68),
    ("ethics",                         "cognitive-dissonance",     "related-to",  0.60),

    # Technology ↔ Economics
    ("artificial-intelligence",        "creative-destruction",     "causes",      0.85),
    ("internet",                       "globalization",            "causes",      0.88),
    ("blockchain",                     "cryptocurrency",           "part-of",     0.92),
    ("robotics",                       "universal-basic-income",   "causes",      0.72),
    ("deep-learning",                  "artificial-intelligence",  "part-of",     0.95),
    ("printing-press",                 "capitalism",               "related-to",  0.60),
    ("renewable-energy",               "climate-change-mitigation","related-to",  0.82),
    ("network-effect",                 "internet",                 "related-to",  0.80),

    # Cosmos ↔ Philosophy
    ("multiverse",                     "free-will",                "related-to",  0.55),
    ("big-bang",                       "metaphysics",              "related-to",  0.60),
    ("fermi-paradox",                  "existentialism",           "related-to",  0.58),
    ("entropy",                        "nihilism",                 "related-to",  0.52),

    # Math ↔ Philosophy
    # slugify("Godel's incompleteness theorems") = "godels-incompleteness-theorems"
    ("godels-incompleteness-theorems", "free-will",                "related-to",  0.55),
    ("godels-incompleteness-theorems", "artificial-intelligence",  "related-to",  0.65),
    ("logic",                          "epistemology",             "part-of",     0.80),
    ("logic",                          "philosophy-of-language",   "related-to",  0.72),

    # Psychology ↔ Economics
    ("cognitive-bias",                 "behavioral-economics",     "causes",      0.88),
    ("memory",                         "classical-conditioning",   "related-to",  0.70),
    ("emotional-intelligence",         "social-psychology",        "related-to",  0.72),
    # slugify("Flow psychology") = "flow-psychology"
    ("flow-psychology",                "labour-economics",         "related-to",  0.50),
]


# ─────────────────────────────────────────────
# FETCH HELPERS
# ─────────────────────────────────────────────
async def fetch_wiki_summary(
    client: httpx.AsyncClient,
    title: str,
) -> Optional[str]:
    """Fetch Wikipedia plain-text extract. Returns first 3 sentences or None."""
    slug = title.replace(" ", "_")

    for attempt in range(MAX_RETRIES):
        try:
            r = await client.get(
                f"{WIKI_SUMMARY}/{slug}",
                timeout=10.0,
                follow_redirects=True,
            )
            if r.status_code == 200:
                data = r.json()
                extract = data.get("extract", "").strip()
                if not extract:
                    return None
                sentences = extract.split(". ")
                summary = ". ".join(sentences[:3])
                if not summary.endswith("."):
                    summary += "."
                return summary
            elif r.status_code == 404:
                return None
            elif r.status_code == 403:
                print(f"    ✗ 403 for '{title}' — check WIKI_CONTACT_EMAIL in .env")
                return None
            elif r.status_code == 429:
                wait = float(r.headers.get("retry-after", 15))
                print(f"    ✗ Rate limited — waiting {wait}s...")
                await asyncio.sleep(wait)
            else:
                await asyncio.sleep(2.0)
        except httpx.TimeoutException:
            await asyncio.sleep(2.0)
        except Exception as e:
            print(f"    ✗ Error for '{title}': {e}")
            return None

    return None


async def fetch_wiki_links(
    client: httpx.AsyncClient,
    title: str,
    limit: int = 40,
) -> list[str]:
    """
    Fetch internal Wikipedia links via the MediaWiki action API.
    Replaces the deprecated /api/rest_v1/page/related endpoint.
    Returns a list of linked article titles (main namespace only).
    """
    params = {
        "action":        "query",
        "titles":        title,
        "prop":          "links",
        "pllimit":       str(limit),
        "plnamespace":   "0",        # main article namespace only
        "format":        "json",
        "formatversion": "2",
    }

    try:
        r = await client.get(WIKI_ACTION, params=params, timeout=10.0)
        if r.status_code == 200:
            data = r.json()
            pages = data.get("query", {}).get("pages", [])
            if not pages:
                return []
            page = pages[0]
            if "missing" in page:
                return []
            links = page.get("links", [])
            return [lnk["title"] for lnk in links]
        else:
            print(f"    ✗ Links HTTP {r.status_code} for '{title}'")
    except Exception as e:
        print(f"    ✗ Links error for '{title}': {e}")

    return []


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
async def generate(target_nodes: int = 2000) -> None:
    print("=" * 60)
    print("Neural Cosmos — Node Generator")
    print(f"Target : {target_nodes} nodes")
    print(f"Seeds  : {len(SEED_TOPICS)}")
    print(f"Agent  : {USER_AGENT}")
    print("=" * 60)

    # Slug preview so you can catch ID mismatches before the run
    print("\nSlug samples (verify these match MANUAL_EDGES):")
    checks = [
        "Godel's incompleteness theorems",
        "Flow psychology",
        "Cell biology",
        "Schrodinger equation",
    ]
    for t in checks:
        print(f"  '{t}'  →  '{slugify(t)}'")
    print()

    nodes: dict[str, dict] = {}
    edges: list[dict] = []
    seen_titles: set[str] = set()

    client_headers = {
        "User-Agent":     USER_AGENT,
        "Api-User-Agent": USER_AGENT,
    }

    async with httpx.AsyncClient(headers=client_headers) as client:

        # ── PHASE 1: Seed topics ─────────────────────────
        print(f"── Phase 1: Processing {len(SEED_TOPICS)} seed topics ──")

        for i, (wiki_title, domain, importance, tags) in enumerate(SEED_TOPICS):
            if wiki_title in seen_titles:
                continue
            seen_titles.add(wiki_title)
            node_id = slugify(wiki_title)

            print(f"  [{i + 1:>3}/{len(SEED_TOPICS)}] {wiki_title}  →  {node_id}")

            summary = await fetch_wiki_summary(client, wiki_title)
            if not summary:
                print(f"         ✗ Skipped (no summary)")
                await asyncio.sleep(REQUEST_DELAY)
                continue

            nodes[node_id] = {
                "id":               node_id,
                "title":            wiki_title,
                "domain":           domain,
                "tags":             tags,
                "importance":       round(importance, 2),
                "wikipedia_title":  wiki_title,
                "summary_override": summary,
            }

            await asyncio.sleep(REQUEST_DELAY)

        print(f"\n  Phase 1 complete — {len(nodes)} nodes\n")

        # ── PHASE 2: Expand via page links ───────────────
        print(f"── Phase 2: Expanding to {target_nodes} nodes via MediaWiki links ──")

        expansion_seeds = SEED_TOPICS[:80]

        for wiki_title, domain, base_importance, base_tags in expansion_seeds:
            if len(nodes) >= target_nodes:
                break

            print(f"  Expanding '{wiki_title}' ({len(nodes)}/{target_nodes})")
            linked_titles = await fetch_wiki_links(client, wiki_title, limit=40)
            await asyncio.sleep(REQUEST_DELAY)

            if not linked_titles:
                print(f"    → no links found")
                continue

            added = 0
            for linked_title in linked_titles:
                if len(nodes) >= target_nodes:
                    break
                if linked_title in seen_titles:
                    continue
                # Skip meta/non-article pages
                if any(linked_title.startswith(p) for p in (
                    "List of", "Lists of", "Template:", "Wikipedia:",
                    "Help:", "Category:", "File:", "Portal:", "Talk:",
                )):
                    continue
                if len(linked_title) > 70:
                    continue

                seen_titles.add(linked_title)
                linked_id = slugify(linked_title)

                summary = await fetch_wiki_summary(client, linked_title)
                await asyncio.sleep(REQUEST_DELAY)

                if not summary or len(summary) < 60:
                    continue

                importance = round(
                    max(0.35, min(0.82, base_importance * 0.72 + 0.12)), 2
                )

                nodes[linked_id] = {
                    "id":               linked_id,
                    "title":            linked_title,
                    "domain":           domain,
                    "tags":             base_tags[:2],
                    "importance":       importance,
                    "wikipedia_title":  linked_title,
                    "summary_override": summary,
                }

                seed_id = slugify(wiki_title)
                if seed_id in nodes:
                    edges.append({
                        "source":   seed_id,
                        "target":   linked_id,
                        "relation": "related-to",
                        "strength": round(0.35 + base_importance * 0.25, 2),
                    })

                added += 1

            if added:
                print(f"    → +{added} nodes  (total: {len(nodes)})")

        print(f"\n  Phase 2 complete — {len(nodes)} nodes\n")

    # ── PHASE 3: Manual cross-domain edges ───────────
    print(f"── Phase 3: Adding {len(MANUAL_EDGES)} manual edges ──")
    skipped_edges = 0
    for source, target, relation, strength in MANUAL_EDGES:
        if source in nodes and target in nodes:
            edges.append({
                "source":   source,
                "target":   target,
                "relation": relation,
                "strength": round(strength, 2),
            })
        else:
            missing = []
            if source not in nodes:
                missing.append(f"source='{source}'")
            if target not in nodes:
                missing.append(f"target='{target}'")
            print(f"  ✗ Skipping — {', '.join(missing)}")
            skipped_edges += 1

    print(f"  Added {len(MANUAL_EDGES) - skipped_edges} manual edges "
          f"({skipped_edges} skipped)\n")

    # ── PHASE 4: Auto-edges from shared tags ─────────
    print("── Phase 4: Auto-edges from shared tags ──")
    node_list = list(nodes.values())
    auto_count = 0

    for i, a in enumerate(node_list):
        for b in node_list[i + 1:]:
            if a["domain"] != b["domain"]:
                continue
            shared = set(a["tags"]) & set(b["tags"])
            if len(shared) >= 2:
                edges.append({
                    "source":   a["id"],
                    "target":   b["id"],
                    "relation": "related-to",
                    "strength": round(min(0.7, 0.3 + len(shared) * 0.12), 2),
                })
                auto_count += 1

    print(f"  Added {auto_count} auto-edges\n")

    # ── PHASE 5: Deduplicate ──────────────────────────
    print("── Phase 5: Deduplicating edges ──")
    seen_pairs: set[tuple] = set()
    unique_edges: list[dict] = []

    for e in edges:
        pair = (min(e["source"], e["target"]), max(e["source"], e["target"]))
        if pair not in seen_pairs:
            seen_pairs.add(pair)
            unique_edges.append(e)

    print(f"  Removed {len(edges) - len(unique_edges)} duplicates\n")

    # ── WRITE ─────────────────────────────────────────
    output = {"nodes": list(nodes.values()), "edges": unique_edges}
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print("=" * 60)
    print("✅  Done!")
    print(f"    Nodes  : {len(nodes)}")
    print(f"    Edges  : {len(unique_edges)}")
    print(f"    Output : {OUTPUT_PATH}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(generate(2000))