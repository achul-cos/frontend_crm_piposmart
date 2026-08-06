import React from "react";

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "lottie-player": React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            src?: string;
            background?: string;
            speed?: string | number;
            loop?: boolean;
            autoplay?: boolean;
            controls?: boolean;
            style?: React.CSSProperties;
          },
          HTMLElement
        >;
      }
    }
  }
  namespace JSX {
    interface IntrinsicElements {
      "lottie-player": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          background?: string;
          speed?: string | number;
          loop?: boolean;
          autoplay?: boolean;
          controls?: boolean;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}
