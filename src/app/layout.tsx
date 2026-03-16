import type { Metadata, Viewport } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOVA",
  description: "A web3 dungeon maze crawler game by Astroverse on Avalanche",
  icons: {
    icon: "/favicon-rock-512.png",
    apple: "/favicon-rock-512.png",
    shortcut: "/favicon-rock-512.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0c1220",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/8bit-wonder.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased bg-[#0c1220] text-gray-200">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var K='__sova_dbg';
                var prev=[];
                try{prev=JSON.parse(sessionStorage.getItem(K)||'[]');}catch(e){}
                var d=document.createElement('div');
                d.id='__dbg';
                d.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#900;color:#fff;padding:8px;font:11px/1.4 monospace;max-height:40vh;overflow:auto;word-break:break-all;'+(prev.length?'display:block':'display:none');
                document.body.prepend(d);
                function render(){d.innerHTML=prev.map(function(m){return '<div>'+m+'</div>';}).join('')+'<div style="color:#f99;margin-top:4px">tap to dismiss</div>';}
                if(prev.length)render();
                function save(msg){prev.push(msg);if(prev.length>10)prev.shift();try{sessionStorage.setItem(K,JSON.stringify(prev));}catch(e){}d.style.display='block';render();}
                window.onerror=function(m,f,l){save(m+' ('+f+':'+l+')');};
                window.onunhandledrejection=function(e){save('Promise: '+e.reason);};
                d.onclick=function(){prev=[];try{sessionStorage.removeItem(K);}catch(e){}d.style.display='none';};
              })();
            `,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
