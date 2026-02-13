import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Konstract',
  description: 'Event‑driven full‑stack TypeScript framework prototype',
  base: '/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/overview' },
      { text: 'Quickstart', link: '/guide/quickstart' },
      { text: 'Architecture', link: '/architecture/runtime' },
      { text: 'Developer Docs', link: '/dev/' },
      { text: 'User Docs', link: '/user/' }
    ],
    sidebar: {
      '/guide/': [
        { text: 'Overview', link: '/guide/overview' },
        { text: 'Quickstart', link: '/guide/quickstart' }
      ],
      '/architecture/': [
        { text: 'Runtime', link: '/architecture/runtime' },
        { text: 'Compiler', link: '/architecture/compiler' },
        { text: 'Storage & Migrations', link: '/architecture/storage' }
      ],
      '/dev/': [
        { text: 'Developer Docs', link: '/dev/' },
        { text: 'Installation', link: '/dev/installation' },
        { text: 'Configuration', link: '/dev/configuration' },
        { text: 'API Reference', link: '/dev/api' },
        { text: 'Contributing', link: '/dev/contributing' }
      ],
      '/user/': [
        { text: 'User Docs', link: '/user/' },
        { text: 'Setup', link: '/user/setup' },
        { text: 'Features', link: '/user/features' },
        { text: 'Examples', link: '/user/examples' },
        { text: 'Troubleshooting', link: '/user/troubleshooting' }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/rand0mdevel0per/konstract' }
    ]
  }
});
