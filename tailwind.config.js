const production = !process.env.ROLLUP_WATCH;
module.exports = {
  future: {
    purgeLayersByDefault: true,
    removeDeprecatedGapUtilities: true,
  },
  plugins: [

  ],
  purge: {
    content: [
      "./src/**/*.svelte",

    ],
    enabled: production // disable purge in dev
  },
  theme: {
    fontFamily: {
      'sans': ['Inter', 'sans-serif']
    }
  }
};
