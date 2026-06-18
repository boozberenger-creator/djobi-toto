import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sert le design statique exact (public/index.html) à la racine "/"
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/index.html" },
        // Page 1 — agent vocal (design statique exact)
        { source: "/parler", destination: "/parler/index.html" },
        { source: "/parler/", destination: "/parler/index.html" },
        // Page Outils (design statique exact)
        { source: "/outils", destination: "/outils/index.html" },
        { source: "/outils/", destination: "/outils/index.html" },
        // Page Apprentissage autonome (design statique autonome)
        { source: "/apprentissage", destination: "/apprentissage/index.html" },
        { source: "/apprentissage/", destination: "/apprentissage/index.html" },
        // Cours Arduino 3D (sous la page apprentissage)
        { source: "/apprentissage/arduino", destination: "/apprentissage/arduino/index.html" },
        { source: "/apprentissage/arduino/", destination: "/apprentissage/arduino/index.html" },
        // Chapitre 1 détaillé (carte interactive + quiz)
        { source: "/apprentissage/arduino/chapitre-1", destination: "/apprentissage/arduino/chapitre-1/index.html" },
        { source: "/apprentissage/arduino/chapitre-1/", destination: "/apprentissage/arduino/chapitre-1/index.html" },
        // Découverte de l'Arduino (histoire + projets) — chapitre 1 du cours 3D
        { source: "/apprentissage/arduino/decouverte", destination: "/apprentissage/arduino/decouverte/index.html" },
        { source: "/apprentissage/arduino/decouverte/", destination: "/apprentissage/arduino/decouverte/index.html" },
        // Page Contribuer (collecte de transcriptions + traductions humaines)
        { source: "/contribuer", destination: "/contribuer/index.html" },
        { source: "/contribuer/", destination: "/contribuer/index.html" },
        // Espace Enfants
        { source: "/enfants", destination: "/enfants/index.html" },
        { source: "/enfants/", destination: "/enfants/index.html" },
        // Espace Adultes
        { source: "/adultes", destination: "/adultes/index.html" },
        { source: "/adultes/", destination: "/adultes/index.html" },
        // Voix & API
        { source: "/voix-api", destination: "/voix-api/index.html" },
        { source: "/voix-api/", destination: "/voix-api/index.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
