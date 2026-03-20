import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="cs">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FFFFFF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Vespa Tracker" />
        <link rel="apple-touch-icon" href="/icon.png" />

        <ScrollViewStyleReset />
      </head>
      <body>
        {children}

        {/* Registrace service workeru a auto-update */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').then(function (reg) {

                    // Při každém návratu do aplikace zkontroluj update
                    document.addEventListener('visibilitychange', function () {
                      if (document.visibilityState === 'visible') {
                        reg.update();
                      }
                    });

                  }).catch(function (err) {
                    console.warn('SW registration failed:', err);
                  });

                  // Když nový SW převezme kontrolu (skipWaiting + claim), reload stránky
                  var reloading = false;
                  navigator.serviceWorker.addEventListener('controllerchange', function () {
                    if (!reloading) {
                      reloading = true;
                      window.location.reload();
                    }
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
