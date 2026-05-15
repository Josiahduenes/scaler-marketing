import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f2521',
        field: '#f4f1ea',
        paper: '#fbfaf6',
        line: '#d8d1c4',
        steel: '#31566d',
        copper: '#a65f2f',
        moss: '#4d6f46',
        warning: '#b57a15',
        danger: '#a13d35',
      },
      boxShadow: {
        panel: '0 1px 0 rgba(31,37,33,0.08), 0 12px 32px rgba(31,37,33,0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
