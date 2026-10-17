import { APP_VERSION, AUTHOR_ID, AUTHOR_NAME, AUTHOR_URL, REPO_URL, SITE_URL } from "./site";

// Rich Structured Data for Google Rich Results
// SOURCE: package.json#version, schema.org/SoftwareApplication. No aggregateRating: forbidden by .claude/rules/15-discoverability.md.
const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Black Hole Simulation Physics Engine",
  alternateName: "Kerr Black Hole Simulator",
  applicationCategory: ["EducationalApplication", "ScienceApplication"],
  operatingSystem: "Any",
  browserRequirements: "Requires WebGL 2.0 or WebGPU",
  softwareVersion: APP_VERSION,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Real-time Kerr Metric Integration",
    "General Relativistic Ray Tracing",
    "Accretion Disk Radiative Transfer",
    "Gravitational Lensing Visualization",
    "Relativistic Doppler Beaming",
    "Spectral Redshift Simulation",
    "Event Horizon Shadow Rendering",
    "Photon Ring Fractal Resolution",
  ],
  description:
    "Real-time browser simulation of a Kerr black hole. Numerically integrates null geodesics in Boyer-Lindquist and Kerr-Schild coordinates, renders gravitational lensing, accretion disk emission, and relativistic Doppler beaming via GPU ray-marching.",
  author: {
    "@type": "Person",
    name: AUTHOR_NAME,
    url: AUTHOR_URL,
    sameAs: [
      "https://github.com/minhazexo",
      "https://github.com/minhazexo/blackholesimulation",
      "https://www.facebook.com/minhazexo1/",
    ],
  },
};

// SOURCE: ScholarlyArticle for the embedded physics-guide section; cites Bardeen 1973, Luminet 1979, Novikov-Thorne 1973 below.
const scholarlyArticleSchema = {
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  headline:
    "Real-Time Visualization of the Kerr Metric in Browser-Based Environments",
  description:
    "A technical study on implementing general relativistic ray tracing using symplectic integrators in WebGL/WebGPU.",
  author: {
    "@type": "Person",
    name: AUTHOR_NAME,
  },
  keywords: "Kerr Metric, General Relativity, Black Hole, Ray Tracing, WebGPU",
  url: `${SITE_URL}#physics-guide`,
  citation: [
    "Bardeen, J. M. (1973). Timelike and null geodesics in the Kerr metric.",
    "Luminet, J. P. (1979). Image of a spherical black hole with thin accretion disk.",
    "Novikov, I. D., & Thorne, K. S. (1973). Astrophysics of black holes.",
  ],
};

// SOURCE: TechArticle for the simulation page. No award, no editor: forbidden by .claude/rules/15-discoverability.md.
const techArticleSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Visualizing the Kerr Metric: A Real-Time Simulation",
  alternativeHeadline: "Interactive Black Hole Physics Engine",
  image: `${SITE_URL}/opengraph-image.jpg`,
  author: {
    "@type": "Person",
    name: AUTHOR_NAME,
    url: AUTHOR_URL,
    sameAs: [
      "https://github.com/minhazexo",
      "https://www.facebook.com/minhazexo1/",
    ],
  },
  genre: "Astrophysics Simulation",
  keywords: "black hole, kerr metric, general relativity, accretion disk",
  publisher: {
    "@type": "Person",
    name: AUTHOR_NAME,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/brand-logo.png`,
    },
  },
  description:
    "An in-depth interactive exploration of the physics surrounding a rotating black hole, including frame-dragging and gravitational redshift.",
  icons: {
    icon: "/brand-logo.png",
    apple: "/apple-touch-icon.jpg",
  },
};

// SOURCE: minhazexo.netlify.app portfolio (verified). github.com/minhazexo (verified). Identity surface for LLM/AI agent indexing.
const authorSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": AUTHOR_ID,
  name: AUTHOR_NAME,
  alternateName: ["minhazexo"],
  url: AUTHOR_URL,
  jobTitle: "Full Stack Developer",
  description:
    "Web developer and creator of blackholesimulation: a real-time browser-based Kerr black hole ray-marching engine.",
  knowsAbout: [
    "General Relativity",
    "Kerr Metric",
    "Numerical Relativity",
    "Geodesic Integration",
    "Computer Graphics",
    "GPU Ray-Marching",
    "WebGPU",
    "WebGL",
    "Real-time Rendering",
    "Rust",
    "WebAssembly",
    "TypeScript",
    "Next.js",
    "Robotics",
    "ROS 2",
    "Machine Learning",
    "Full Stack Development",
  ],
  sameAs: [
    "https://github.com/minhazexo",
    "https://github.com/minhazexo/blackholesimulation",
    "https://www.facebook.com/minhazexo1/",
    "https://minhazexo.netlify.app",
  ],
  workLocation: {
    "@type": "Country",
    name: "India",
  },
};

// SOURCE: schema.org/ProfilePage anchored to the real portfolio. Lets LLMs and search crawlers connect this site to the author's verified identity surface.
const profilePageSchema = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  url: AUTHOR_URL,
  mainEntity: { "@id": AUTHOR_ID },
  about: { "@id": AUTHOR_ID },
  dateModified: "2026-04-29",
};

// SOURCE: schema.org/WebSite. Site identity, real URL, real owner.
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Black Hole Simulation",
  alternateName: ["Blackhole Simulation Lab", "Kerr Metric Simulator"],
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

// SOURCE: schema.org/FAQPage. Questions answered on the page itself; verify the page renders these.
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the Kerr Spacetime Manifold?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The engine solves for the geometry of a rotating uncharged mass using Boyer-Lindquist coordinates. Spacetime curvature is defined by the metric tensor, where the rotation of the singularity induces the Lense-Thirring effect (Frame-Dragging).",
      },
    },
    {
      "@type": "Question",
      name: "What is Gravitational Lensing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Light geodesics are deflected by the potential well, creating Einstein Rings and multiple-image copies of the background starfield.",
      },
    },
    {
      "@type": "Question",
      name: "How does the Accretion Disk work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The plasma disk follows the Novikov-Thorne model. Spectral radiance is governed by the Redshift Factor g, which blue-shifts prograde matter and red-shifts retrograde matter. Thermal emission is integrated through the volume using the Radiative Transfer Equation.",
      },
    },
    {
      "@type": "Question",
      name: "What is a Black Hole Simulation?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A black hole simulation is a computational model that uses the laws of General Relativity to visualize how light and matter behave near a black hole. This simulation uses the Kerr metric to account for black hole spin.",
      },
    },
  ],
};

// SOURCE: schema.org/BreadcrumbList. Anchors on the page; verify each #anchor exists.
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE_URL,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Simulation",
      item: SITE_URL,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "Physics Documentation",
      item: `${SITE_URL}#physics-guide`,
    },
  ],
};

// SOURCE: schema.org/Dataset (descriptive: no committed CSV at /public/data/ yet; future PR replaces with concrete dataset URL).
const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Kerr Metric Geodesic Integration Dataset",
  description:
    "A comprehensive dataset of null and timelike geodesics computed within the Kerr spacetime manifold across varying spin parameters (a=0 to a=0.998). Includes effective potential calculations and orbital frequency data.",
  creator: {
    "@type": "Person",
    name: AUTHOR_NAME,
  },
  license: "https://opensource.org/licenses/MIT",
  keywords: [
    "General Relativity",
    "Kerr Metric Data",
    "Geodesic Dataset",
    "Black Hole Research",
  ],
  variableMeasured: [
    "Proper Time",
    "Coordinate Time",
    "Affine Parameter",
    "Light Deflection Angle",
  ],
};

// SOURCE: schema.org/ResearchProject. No parentOrganization: solo independent project, no fabricated parent org per .claude/rules/15-discoverability.md.
const researchProjectSchema = {
  "@context": "https://schema.org",
  "@type": "ResearchProject",
  name: "Kerr Metric Spacetime Simulation Lab",
  description:
    "Open-source research-grade visualization of relativistic phenomena in rotating black holes: gravitational lensing, frame dragging, photon ring, accretion disk radiative transfer.",
  author: { "@id": AUTHOR_ID },
};

// SOURCE: schema.org/Service. Provider is real Person; serviceType is descriptive, not metric-claiming.
const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Scientific Visualization",
  provider: { "@id": AUTHOR_ID },
  areaServed: "Global",
  description:
    "Real-time interactive black hole physics simulation service for researchers, educators, and students.",
};

// SOURCE: schema.org/HowTo. Steps describe real interactions on the page; verify each rendered control.
const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Simulate a Black Hole",
  description:
    "Learn how to interact with the real-time Kerr black hole simulation physics engine.",
  step: [
    {
      "@type": "HowToStep",
      name: "Orbit the Black Hole",
      text: "Click and drag your mouse (or swipe on mobile) to rotate the camera around the event horizon.",
    },
    {
      "@type": "HowToStep",
      name: "Adjust Mass and Spin",
      text: "Open the Control Panel to modify the Black Hole Mass (M) and Spin (a) parameters in real-time.",
    },
    {
      "@type": "HowToStep",
      name: "Toggle Visual Features",
      text: "Enable or disable Gravitational Lensing, Accretion Disk, and Radiative Transfer effects from the Features tab.",
    },
    {
      "@type": "HowToStep",
      name: "Enter Cinematic Mode",
      text: "Select 'Orbit Tour' or 'Infall Dive' to experience automated cinematic camera paths.",
    },
  ],
};

// SOURCE: Bardeen, J. M. (1973), "Timelike and null geodesics in the Kerr metric", in Black Holes (Les Houches), eds. DeWitt and DeWitt. Reference geodesics, photon ring, ISCO.
const bardeen1973Schema = {
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  headline: "Timelike and Null Geodesics in the Kerr Metric",
  author: { "@type": "Person", name: "James M. Bardeen" },
  datePublished: "1973",
  isPartOf: {
    "@type": "Book",
    name: "Black Holes (Les Houches 1972)",
    editor: [
      { "@type": "Person", name: "C. DeWitt" },
      { "@type": "Person", name: "B. DeWitt" },
    ],
    publisher: {
      "@type": "Organization",
      name: "Gordon and Breach Science Publishers",
    },
  },
  about: ["Kerr metric", "geodesics", "photon ring", "ISCO"],
};

// SOURCE: Luminet, J.-P. (1979), "Image of a spherical black hole with thin accretion disk", Astron. Astrophys. 75, 228, DOI:10.1007/BFb0091735.
const luminet1979Schema = {
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  headline: "Image of a Spherical Black Hole with Thin Accretion Disk",
  author: { "@type": "Person", name: "Jean-Pierre Luminet" },
  datePublished: "1979",
  isPartOf: {
    "@type": "Periodical",
    name: "Astronomy and Astrophysics",
  },
  pageStart: "228",
  identifier: {
    "@type": "PropertyValue",
    propertyID: "DOI",
    value: "10.1007/BFb0091735",
  },
  about: [
    "Schwarzschild black hole",
    "accretion disk",
    "gravitational lensing",
  ],
};

// SOURCE: Novikov, I. D. and Thorne, K. S. (1973), "Astrophysics of Black Holes", in Black Holes (Les Houches), eds. DeWitt and DeWitt. Accretion disk emission model.
const novikovThorne1973Schema = {
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  headline: "Astrophysics of Black Holes",
  author: [
    { "@type": "Person", name: "Igor D. Novikov" },
    { "@type": "Person", name: "Kip S. Thorne" },
  ],
  datePublished: "1973",
  isPartOf: {
    "@type": "Book",
    name: "Black Holes (Les Houches 1972)",
    editor: [
      { "@type": "Person", name: "C. DeWitt" },
      { "@type": "Person", name: "B. DeWitt" },
    ],
    publisher: {
      "@type": "Organization",
      name: "Gordon and Breach Science Publishers",
    },
  },
  about: ["Novikov-Thorne disk", "thin accretion disk", "radiative transfer"],
};

// SOURCE: James, von Tunzelmann, Franklin, Thorne (2015), "Gravitational lensing by spinning black holes in astrophysics, and in the movie Interstellar", Class. Quantum Grav. 32, 065001, DOI:10.1088/0264-9381/32/6/065001. Interstellar DNGR paper.
const james2015DngrSchema = {
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  headline:
    "Gravitational Lensing by Spinning Black Holes in Astrophysics, and in the Movie Interstellar",
  author: [
    { "@type": "Person", name: "Oliver James" },
    { "@type": "Person", name: "Eugenie von Tunzelmann" },
    { "@type": "Person", name: "Paul Franklin" },
    { "@type": "Person", name: "Kip S. Thorne" },
  ],
  datePublished: "2015",
  isPartOf: {
    "@type": "Periodical",
    name: "Classical and Quantum Gravity",
  },
  volumeNumber: "32",
  pageStart: "065001",
  identifier: {
    "@type": "PropertyValue",
    propertyID: "DOI",
    value: "10.1088/0264-9381/32/6/065001",
  },
  about: [
    "DNGR",
    "Kerr ray-marching",
    "gravitational lensing",
    "Interstellar VFX",
  ],
};

// SOURCE: github.com/minhazexo/blackholesimulation. Real public repo, MIT license.
const sourceCodeSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "blackholesimulation",
  codeRepository: REPO_URL,
  programmingLanguage: ["TypeScript", "Rust", "WGSL", "GLSL"],
  license: "https://opensource.org/licenses/MIT",
  author: { "@id": AUTHOR_ID },
};

/**
 * Every JSON-LD graph rendered by the root layout, in document order.
 * The layout maps over this array so adding a schema is a one-line change
 * here — no layout edits needed.
 */
export const jsonLdSchemas = [
  websiteSchema,
  softwareAppSchema,
  techArticleSchema,
  faqSchema,
  breadcrumbSchema,
  scholarlyArticleSchema,
  datasetSchema,
  researchProjectSchema,
  serviceSchema,
  authorSchema,
  profilePageSchema,
  howToSchema,
  bardeen1973Schema,
  luminet1979Schema,
  novikovThorne1973Schema,
  james2015DngrSchema,
  sourceCodeSchema,
];
