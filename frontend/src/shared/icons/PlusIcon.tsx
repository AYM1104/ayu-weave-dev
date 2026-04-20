import { useId } from "react";

/**
 * PlusIcon — 右サイドバー用の立体プラスボタン
 *
 * 背面の傾いた角丸矩形と、前面の立体ボタンを重ねて表現する。
 */
export default function PlusIcon() {
  const id = useId().replace(/:/g, "");
  const filterId = `${id}-filter`;
  const gradientId = `${id}-gradient`;

  return (
    <span
      style={{
        position: "relative",
        display: "block",
        width: 46,
        height: 46,
        overflow: "visible",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 4,
          left: 10,
          width: 35,
          height: 35,
        }}
      >
        <svg
          width="35"
          height="35"
          viewBox="0 0 35 35"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            x="2.23242"
            width="32"
            height="32"
            rx="8"
            transform="rotate(4 2.23242 0)"
            fill="#4B4130"
            fillOpacity="0.1"
          />
          <rect
            x="2.69633"
            y="0.53366"
            width="31"
            height="31"
            rx="7.5"
            transform="rotate(4 2.69633 0.53366)"
            stroke="#4B4130"
            strokeOpacity="0.08"
          />
        </svg>
      </span>

      <span
        style={{
          position: "absolute",
          inset: 0,
          width: 46,
          height: 46,
        }}
      >
        <svg
          width="46"
          height="46"
          viewBox="0 0 46 46"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <g filter={`url(#${filterId})`}>
            <rect x="7" y="7" width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
            <rect
              x="7.5"
              y="7.5"
              width="31"
              height="31"
              rx="7.5"
              stroke="#400C04"
              strokeOpacity="0.05"
            />
            <path
              d="M21.9505 29.4274C21.8356 29.3125 21.7781 29.17 21.7781 29V23.4H16.1781C16.0081 23.4 15.8657 23.3425 15.7507 23.2274C15.6357 23.1123 15.5781 22.9698 15.5781 22.7998C15.5781 22.6297 15.6357 22.4872 15.7507 22.3724C15.8657 22.2575 16.0081 22.2 16.1781 22.2H21.7781V16.6C21.7781 16.43 21.8357 16.2875 21.9507 16.1726C22.0658 16.0575 22.2083 16 22.3783 16C22.5485 16 22.6909 16.0575 22.8057 16.1726C22.9207 16.2875 22.9781 16.43 22.9781 16.6V22.2H28.5781C28.7481 22.2 28.8906 22.2575 29.0055 22.3726C29.1206 22.4877 29.1781 22.6302 29.1781 22.8002C29.1781 22.9703 29.1206 23.1128 29.0055 23.2276C28.8906 23.3425 28.7481 23.4 28.5781 23.4H22.9781V29C22.9781 29.17 22.9206 29.3125 22.8055 29.4274C22.6905 29.5425 22.5479 29.6 22.3779 29.6C22.2078 29.6 22.0653 29.5425 21.9505 29.4274Z"
              fill="#4B4130"
              fillOpacity="0.8"
            />
          </g>

          <defs>
            <filter
              id={filterId}
              x="0"
              y="0"
              width="46"
              height="46"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset />
              <feGaussianBlur stdDeviation="3.5" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"
              />
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
            </filter>
            <linearGradient
              id={gradientId}
              x1="23"
              y1="7"
              x2="23"
              y2="39"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#F5F4F1" />
              <stop offset="1" stopColor="#CBC7C0" />
            </linearGradient>
          </defs>
        </svg>
      </span>
    </span>
  );
}
